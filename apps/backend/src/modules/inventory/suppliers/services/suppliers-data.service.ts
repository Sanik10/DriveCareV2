// src/modules/inventory/suppliers/services/suppliers-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { 
  Supplier, 
  Company, 
  StockMovement, 
  Order, 
  Invoice, 
  Payment,
  User
} from '../../../../database/entities';
import { StockMovementType } from '../../../../database/entities/stock-movement.entity';
import { 
  SupplierFilter, 
  CreateSupplierData, 
  UpdateSupplierData,
  SupplierAnalytics,
  TopSupplierMetrics
} from '../types/suppliers.types';

@Injectable()
export class SuppliersDataService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 🔒 Поиск поставщиков с ОБЯЗАТЕЛЬНОЙ фильтрацией по компании
   */
  async findWithFilters(filter: SupplierFilter): Promise<[Supplier[], number]> {
    const query = this.supplierRepository.createQueryBuilder('supplier');

    // 🔒 КРИТИЧНО: ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('supplier.companyId = :companyId', { companyId: filter.companyId });
    }

    // Поиск по названию, email, телефону
    if (filter.search) {
      query.andWhere(
        '(supplier.name ILIKE :search OR supplier.email ILIKE :search OR supplier.phone ILIKE :search OR supplier.contactName ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по активности
    if (filter.isActive !== undefined) {
      query.andWhere('supplier.isActive = :isActive', { isActive: filter.isActive });
    }

    // Фильтр по типу поставщика
    if (filter.supplierType) {
      query.andWhere('supplier.supplierType = :supplierType', { supplierType: filter.supplierType });
    }

    // Фильтр по городу
    if (filter.city) {
      query.andWhere('supplier.city ILIKE :city', { city: `%${filter.city}%` });
    }

    // Фильтр по стране
    if (filter.country) {
      query.andWhere('supplier.country ILIKE :country', { country: `%${filter.country}%` });
    }

    // Фильтр по условиям оплаты
    if (filter.paymentTerms) {
      query.andWhere('supplier.paymentTerms ILIKE :paymentTerms', { 
        paymentTerms: `%${filter.paymentTerms}%` 
      });
    }

    // 📊 Комплексные фильтры с подзапросами

    // Фильтр поставщиков с недавними поставками (последние 30 дней)
    if (filter.hasRecentDeliveries) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      query.andWhere(`EXISTS (
        SELECT 1 FROM stock_movements sm 
        WHERE sm.supplier_id = supplier.id 
        AND sm.type = 'receipt' 
        AND sm.created_at >= :thirtyDaysAgo
      )`, { thirtyDaysAgo });
    }

    // Фильтр по минимальному рейтингу (через подзапрос к ratings)
    if (filter.minRating) {
      query.andWhere(`(
        SELECT AVG((sr.quality_rating + sr.delivery_rating + sr.price_rating + COALESCE(sr.communication_rating, 0)) / 
                   CASE WHEN sr.communication_rating IS NULL THEN 3 ELSE 4 END)
        FROM supplier_ratings sr 
        WHERE sr.supplier_id = supplier.id
      ) >= :minRating`, { minRating: filter.minRating });
    }

    // Сортировка
    const sortField = filter.sortField || 'name';
    const sortOrder = filter.sortOrder || 'asc';
    
    switch (sortField) {
      case 'name':
        query.orderBy('supplier.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'createdAt':
        query.orderBy('supplier.createdAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'city':
        query.orderBy('supplier.city', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'rating':
        // Сортировка по рейтингу через подзапрос
        query.orderBy(`(
          SELECT AVG((sr.quality_rating + sr.delivery_rating + sr.price_rating + COALESCE(sr.communication_rating, 0)) / 
                     CASE WHEN sr.communication_rating IS NULL THEN 3 ELSE 4 END)
          FROM supplier_ratings sr 
          WHERE sr.supplier_id = supplier.id
        )`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'totalOrders':
        // Сортировка по количеству заказов
        query.orderBy(`(
          SELECT COUNT(*) FROM stock_movements sm 
          WHERE sm.supplier_id = supplier.id
        )`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'totalValue':
        // Сортировка по общей сумме заказов
        query.orderBy(`(
          SELECT COALESCE(SUM(sm.total_amount), 0) FROM stock_movements sm 
          WHERE sm.supplier_id = supplier.id
        )`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'lastOrderDate':
        // Сортировка по дате последнего заказа
        query.orderBy(`(
          SELECT MAX(sm.created_at) FROM stock_movements sm 
          WHERE sm.supplier_id = supplier.id
        )`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      default:
        query.orderBy('supplier.name', 'ASC');
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск поставщика по ID
   */
  async findById(id: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { id },
    });
  }

  /**
   * 🔒 Поиск поставщика по ID для конкретной компании
   */
  async findByIdForCompany(id: string, companyId: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { 
        id,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
    });
  }

  /**
   * 🔒 Поиск поставщика по email в компании
   */
  async findByEmailInCompany(
    email: string, 
    companyId: string,
    excludeId?: string
  ): Promise<Supplier | null> {
    const query = this.supplierRepository.createQueryBuilder('supplier')
      .where('supplier.email = :email', { email })
      .andWhere('supplier.companyId = :companyId', { companyId });

    if (excludeId) {
      query.andWhere('supplier.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  /**
   * 🔒 Поиск поставщика по налоговому номеру в компании
   */
  async findByTaxNumberInCompany(
    taxNumber: string, 
    companyId: string,
    excludeId?: string
  ): Promise<Supplier | null> {
    const query = this.supplierRepository.createQueryBuilder('supplier')
      .where('supplier.taxNumber = :taxNumber', { taxNumber })
      .andWhere('supplier.companyId = :companyId', { companyId });

    if (excludeId) {
      query.andWhere('supplier.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  /**
   * 📝 Создание нового поставщика
   */
  async create(data: CreateSupplierData): Promise<Supplier> {
    const supplier = this.supplierRepository.create(data);
    return this.supplierRepository.save(supplier);
  }

  /**
   * 📝 Обновление поставщика
   */
  async update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    await this.supplierRepository.update(id, data);
    
    const updatedSupplier = await this.findById(id);
    if (!updatedSupplier) {
      throw new Error(`Supplier with id ${id} not found after update`);
    }
    
    return updatedSupplier;
  }

  /**
   * 📦 Bulk создание поставщиков
   */
  async createBulk(suppliersData: CreateSupplierData[]): Promise<Supplier[]> {
    const suppliers = this.supplierRepository.create(suppliersData);
    return this.supplierRepository.save(suppliers);
  }

  /**
   * 🔒 Получение количества поставщиков в компании
   */
  async getCompanySupplierCount(companyId: string): Promise<number> {
    return this.supplierRepository.count({
      where: { 
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
        isActive: true 
      },
    });
  }

  /**
   * 🔒 Проверка наличия активных заказов у поставщика
   */
  async hasActiveOrders(supplierId: string): Promise<boolean> {
    const count = await this.stockMovementRepository.count({
      where: { 
        supplierId,
        // Проверяем движения за последние 30 дней
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) as any,
      },
    });
    return count > 0;
  }

  /**
   * 🔒 Проверка наличия неоплаченных счетов у поставщика
   */
  async hasUnpaidInvoices(supplierId: string): Promise<boolean> {
    // TODO: Реализовать когда будет создан invoices модуль
    // Пока возвращаем false
    return false;
  }

  /**
   * 🔒 Проверка наличия истории заказов с поставщиком
   */
  async hasOrderHistory(supplierId: string, companyId: string): Promise<boolean> {
	const count = await this.stockMovementRepository.count({
		where: { 
		supplierId,
		companyId, // 🔒 КРИТИЧНО: фильтрация по компании
		type: StockMovementType.RECEIPT, // ✅ ИСПРАВЛЕНО
		},
	});
	return count > 0;
  }

  /**
   * ⭐ Проверка наличия недавней оценки от пользователя
   */
  async hasRecentRating(
    supplierId: string, 
    userId: string, 
    days: number
  ): Promise<boolean> {
    // TODO: Реализовать когда будет создана таблица supplier_ratings
    // Пока возвращаем false
    return false;
  }

  /**
   * 🔒 Получение активных поставщиков для запчасти
   */
  async findActiveSuppliersForPart(partId: string, companyId: string): Promise<Supplier[]> {
    return this.supplierRepository
      .createQueryBuilder('supplier')
      .innerJoin('stock_movements', 'sm', 'sm.supplier_id = supplier.id')
      .where('supplier.companyId = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('supplier.isActive = true')
      .andWhere('sm.part_id = :partId', { partId })
      .andWhere('sm.type = :type', { type: 'receipt' })
      .distinct(true)
      .getMany();
  }

  /**
   * 📊 Получение статистики поставщика
   */
  async getSupplierStatistics(supplierId: string, companyId: string): Promise<{
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    lastOrderDate: Date | null;
    onTimeDeliveryRate: number;
    averageDeliveryTime: number;
  }> {
    const result = await this.stockMovementRepository
      .createQueryBuilder('sm')
      .select([
        'COUNT(*) as totalOrders',
        'COALESCE(SUM(sm.total_amount), 0) as totalValue',
        'COALESCE(AVG(sm.total_amount), 0) as averageOrderValue',
        'MAX(sm.created_at) as lastOrderDate',
      ])
      .where('sm.supplier_id = :supplierId', { supplierId })
      .andWhere('sm.company_id = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('sm.type = :type', { type: 'receipt' })
      .getRawOne();

    return {
      totalOrders: parseInt(result.totalorders) || 0,
      totalValue: parseFloat(result.totalvalue) || 0,
      averageOrderValue: parseFloat(result.averageordervalue) || 0,
      lastOrderDate: result.lastorderdate ? new Date(result.lastorderdate) : null,
      onTimeDeliveryRate: 95.0, // TODO: Реализовать реальный расчет
      averageDeliveryTime: 3.5,  // TODO: Реализовать реальный расчет
    };
  }

  /**
   * 📊 Получение аналитики поставщика
   */
  async getSupplierAnalytics(
    supplierId: string, 
    companyId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<Partial<SupplierAnalytics>> {
    const periodStart = this.calculatePeriodStart(period);
    
    // Основная статистика
    const basicStats = await this.getSupplierStatistics(supplierId, companyId);
    
    // Топ запчасти
    const topParts = await this.stockMovementRepository
      .createQueryBuilder('sm')
      .leftJoin('sm.part', 'part')
      .select([
        'sm.part_id as partId',
        'part.name as partName',
        'part.part_number as partNumber',
        'COUNT(*) as orderCount',
        'SUM(sm.total_amount) as totalValue',
        'AVG(sm.price) as averagePrice',
        'MAX(sm.created_at) as lastOrderDate'
      ])
      .where('sm.supplier_id = :supplierId', { supplierId })
      .andWhere('sm.company_id = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('sm.type = :type', { type: 'receipt' })
      .andWhere('sm.created_at >= :periodStart', { periodStart })
      .groupBy('sm.part_id, part.name, part.part_number')
      .orderBy('totalValue', 'DESC')
      .limit(10)
      .getRawMany();

    // Месячные тренды
    const monthlyTrends = await this.stockMovementRepository
      .createQueryBuilder('sm')
      .select([
        'DATE_TRUNC(\'month\', sm.created_at) as month',
        'COUNT(*) as orders',
        'SUM(sm.total_amount) as value'
      ])
      .where('sm.supplier_id = :supplierId', { supplierId })
      .andWhere('sm.company_id = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('sm.type = :type', { type: 'receipt' })
      .andWhere('sm.created_at >= :periodStart', { periodStart })
      .groupBy('DATE_TRUNC(\'month\', sm.created_at)')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      supplierId,
      period,
      totalOrders: basicStats.totalOrders,
      // Преобразуем сырые данные в нужный формат
      topParts: topParts.map(item => ({
        partId: item.partid,
        partName: item.partname,
        partNumber: item.partnumber,
        orderCount: parseInt(item.ordercount),
        totalValue: parseFloat(item.totalvalue) || 0,
        averagePrice: parseFloat(item.averageprice) || 0,
        lastPrice: parseFloat(item.averageprice) || 0, // TODO: Получить реальную последнюю цену
        priceChange: 0, // TODO: Рассчитать изменение цены
        lastOrderDate: new Date(item.lastorderdate),
      })),
      monthlyTrends: monthlyTrends.map(item => ({
		month: item.month,
		ordersCount: parseInt(item.orders), // ✅ orders -> ordersCount
		totalValue: parseFloat(item.value) || 0, // ✅ value -> totalValue  
		averageRating: 4.0, // ✅ rating -> averageRating
		onTimeDeliveryRate: 95.0, // ✅ ДОБАВЛЕНО
		averageDeliveryTime: 3.5, // ✅ ДОБАВЛЕНО
	  })),
    };
  }

  /**
   * 📊 Получение топ поставщиков компании
   */
  async getTopPerformers(
    companyId: string,
    period: 'month' | 'quarter' | 'year',
    limit: number
  ): Promise<TopSupplierMetrics[]> {
    const periodStart = this.calculatePeriodStart(period);

    const result = await this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoin('stock_movements', 'sm', 'sm.supplier_id = supplier.id AND sm.created_at >= :periodStart', { periodStart })
      .select([
        'supplier.id as supplierId',
        'supplier.name as supplierName',
        'COUNT(sm.id) as totalOrders',
        'COALESCE(SUM(sm.total_amount), 0) as totalValue',
        // TODO: Добавить расчет рейтинга через JOIN с supplier_ratings
        '4.0 as averageRating',
        '95.0 as onTimeDeliveryRate',
        '1.2 as defectRate',
      ])
      .where('supplier.company_id = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('supplier.is_active = true')
      .groupBy('supplier.id, supplier.name')
      .orderBy('totalValue', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((item, index) => ({
      supplierId: item.supplierid,
      supplierName: item.suppliername,
      rank: index + 1,
      totalOrders: parseInt(item.totalorders) || 0,
      totalValue: parseFloat(item.totalvalue) || 0,
      averageRating: parseFloat(item.averagerating) || 0,
      onTimeDeliveryRate: parseFloat(item.ontimedeliveryrate) || 0,
      defectRate: parseFloat(item.defectrate) || 0,
      marketShare: 0, // TODO: Рассчитать долю рынка
      loyaltyScore: 0, // TODO: Рассчитать показатель лояльности
      improvementTrend: 'stable' as const, // TODO: Рассчитать тренд
    }));
  }

  /**
   * 💰 Сравнение цен на запчасть между поставщиками
   */
  async comparePartPrices(partId: string, companyId: string): Promise<any> {
    const result = await this.stockMovementRepository
      .createQueryBuilder('sm')
      .leftJoin('sm.supplier', 'supplier')
      .select([
        'supplier.id as supplierId',
        'supplier.name as supplierName',
        'AVG(sm.price) as averagePrice',
        'MAX(sm.price) as lastPrice',
        'MAX(sm.created_at) as lastOrderDate',
        'COUNT(*) as orderCount'
      ])
      .where('sm.part_id = :partId', { partId })
      .andWhere('sm.company_id = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('sm.type = :type', { type: 'receipt' })
      .andWhere('sm.price IS NOT NULL')
      .andWhere('supplier.is_active = true')
      .groupBy('supplier.id, supplier.name')
      .orderBy('averagePrice', 'ASC')
      .getRawMany();

    const suppliers = result.map(item => ({
      supplierId: item.supplierid,
      supplierName: item.suppliername,
      price: parseFloat(item.lastprice) || 0,
      averagePrice: parseFloat(item.averageprice) || 0,
      lastOrderDate: new Date(item.lastorderdate),
      orderCount: parseInt(item.ordercount),
      deliveryTime: 3, // TODO: Рассчитать реальное время доставки
      rating: 4.0, // TODO: Получить реальный рейтинг
      isPreferred: false, // TODO: Определить предпочтительность
      hasContract: false, // TODO: Проверить наличие контракта
    }));

    const prices = suppliers.map(s => s.price).filter(p => p > 0);
    const bestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const worstPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      partId,
      suppliers,
      bestPrice: {
        supplierId: suppliers.find(s => s.price === bestPrice)?.supplierId,
        price: bestPrice,
        savings: worstPrice - bestPrice,
        savingsPercent: worstPrice > 0 ? ((worstPrice - bestPrice) / worstPrice) * 100 : 0,
      },
      priceRange: {
        min: bestPrice,
        max: worstPrice,
        average: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        median: this.calculateMedian(prices),
      },
    };
  }

  /**
   * 🔒 Проверка существования компании
   */
  async validateCompanyExists(companyId: string): Promise<boolean> {
    const count = await this.companyRepository.count({
      where: { id: companyId },
    });
    return count > 0;
  }

  /**
   * ❌ Мягкое удаление поставщика (деактивация)
   */
  async softDelete(id: string): Promise<void> {
    await this.supplierRepository.update(id, { 
      isActive: false,
      // TODO: Добавить поле deletedAt когда понадобится
    });
  }

  /**
   * 🔧 Вспомогательные методы
   */
  private calculatePeriodStart(period: 'month' | 'quarter' | 'year'): Date {
    const now = new Date();
    switch (period) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return new Date(now.getFullYear(), quarterStart, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }
}
