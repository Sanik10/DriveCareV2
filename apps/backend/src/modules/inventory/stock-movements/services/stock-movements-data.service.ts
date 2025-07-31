// src/modules/inventory/stock-movements/services/stock-movements-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  StockMovement, 
  Part, 
  Inventory, 
  User, 
  Supplier, 
  Company 
} from '../../../../database/entities';
import { 
  StockMovementFilter, 
  CreateMovementData, 
  UpdateMovementData,
  MovementSummary
} from '../types/stock-movements.types';

@Injectable()
export class StockMovementsDataService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * 🔒 Поиск движений с ОБЯЗАТЕЛЬНОЙ фильтрацией по компании
   */
  async findWithFilters(filter: StockMovementFilter): Promise<[StockMovement[], number]> {
    const query = this.stockMovementRepository.createQueryBuilder('movement')
      .leftJoinAndSelect('movement.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .leftJoinAndSelect('movement.supplier', 'supplier');

    // 🔒 КРИТИЧНО: ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('movement.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтр по конкретной запчасти
    if (filter.partId) {
      query.andWhere('movement.partId = :partId', { partId: filter.partId });
    }

    // Фильтр по типу движения
    if (filter.type) {
      query.andWhere('movement.type = :type', { type: filter.type });
    }

    // Фильтр по причине
    if (filter.reason) {
      query.andWhere('movement.reason = :reason', { reason: filter.reason });
    }

    // Фильтр по создателю
    if (filter.userId) {
      query.andWhere('movement.createdBy = :userId', { userId: filter.userId });
    }

    // Фильтр по заказу
    if (filter.orderId) {
      query.andWhere('movement.orderId = :orderId', { orderId: filter.orderId });
    }

    // Фильтр по поставщику
    if (filter.supplierId) {
      query.andWhere('movement.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    // Фильтр по номеру документа
    if (filter.documentNumber) {
      query.andWhere('movement.documentNumber ILIKE :documentNumber', { 
        documentNumber: `%${filter.documentNumber}%` 
      });
    }

    // Фильтр по количеству
    if (filter.minQuantity !== undefined) {
      query.andWhere('ABS(movement.quantity) >= :minQuantity', { minQuantity: filter.minQuantity });
    }

    if (filter.maxQuantity !== undefined) {
      query.andWhere('ABS(movement.quantity) <= :maxQuantity', { maxQuantity: filter.maxQuantity });
    }

    // Фильтр по дате
    if (filter.dateFrom) {
      query.andWhere('movement.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      query.andWhere('movement.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    // Поиск по названию запчасти или номеру документа
    if (filter.search) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search OR movement.documentNumber ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Сортировка
    const sortField = filter.sortField || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    
    switch (sortField) {
      case 'createdAt':
        query.orderBy('movement.createdAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'type':
        query.orderBy('movement.type', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'quantity':
        query.orderBy('movement.quantity', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'totalAmount':
        query.orderBy('movement.totalAmount', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'partName':
        query.orderBy('part.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'documentNumber':
        query.orderBy('movement.documentNumber', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      default:
        query.orderBy('movement.createdAt', 'DESC');
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск движения по ID с проверкой принадлежности
   */
  async findById(id: string): Promise<StockMovement | null> {
    return this.stockMovementRepository.findOne({
      where: { id },
      relations: [
        'part',
        'part.category',
        'supplier',
      ],
    });
  }

  /**
   * 🔒 Поиск движения по ID для конкретной компании
   */
  async findByIdForCompany(id: string, companyId: string): Promise<StockMovement | null> {
    return this.stockMovementRepository.findOne({
      where: { 
        id,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: [
        'part',
        'part.category',
        'supplier',
      ],
    });
  }

  /**
   * 📝 Создание нового движения
   */
	async create(data: CreateMovementData): Promise<StockMovement> {
	// 🔥 ИСПРАВЛЯЕМ: убираем передачу createdAt и правильно маппим данные
	const movementData = {
	  companyId: data.companyId,
	  partId: data.partId,
	  type: data.type as any, // 🔥 Приводим к типу entity
	  reason: data.reason as any, // 🔥 Приводим к типу entity
	  quantity: data.quantity,
	  price: data.price,
	  totalAmount: data.totalAmount,
	  orderId: data.orderId,
	  supplierId: data.supplierId,
	  documentNumber: data.documentNumber,
	  notes: data.notes,
	  createdBy: data.userId,
	};

	  const movement = this.stockMovementRepository.create(movementData);
	  return this.stockMovementRepository.save(movement);
	}

  /**
   * 📝 Обновление движения
   */
  async update(id: string, data: UpdateMovementData): Promise<StockMovement> {
    await this.stockMovementRepository.update(id, data);
    
    const updatedMovement = await this.findById(id);
    if (!updatedMovement) {
      throw new Error(`Stock movement with id ${id} not found after update`);
    }
    
    return updatedMovement;
  }

  /**
   * 🔒 Получение истории движений для запчасти
   */
  async findPartHistory(partId: string, companyId: string, limit: number = 50): Promise<StockMovement[]> {
    return this.stockMovementRepository.find({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['part'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 📊 Получение сводки движений за период
   */
  async getMovementSummary(
    companyId: string, 
    dateFrom: Date, 
    dateTo: Date
  ): Promise<MovementSummary> {
    const query = this.stockMovementRepository.createQueryBuilder('movement')
      .leftJoin('movement.part', 'part')
      .where('movement.companyId = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('movement.createdAt >= :dateFrom', { dateFrom })
      .andWhere('movement.createdAt <= :dateTo', { dateTo });

    const [totalMovements, receiptsData, issuesData, adjustmentsData, topParts] = await Promise.all([
      // Общее количество движений
      query.getCount(),
      
      // Статистика по приходу
      query
        .select([
          'COUNT(*) as count',
          'SUM(movement.quantity) as totalQuantity',
          'SUM(movement.totalAmount) as totalValue'
        ])
        .andWhere('movement.type = :type', { type: 'receipt' })
        .getRawOne(),
      
      // Статистика по расходу
      query
        .select([
          'COUNT(*) as count',
          'SUM(ABS(movement.quantity)) as totalQuantity',
          'SUM(ABS(movement.totalAmount)) as totalValue'
        ])
        .andWhere('movement.type = :type', { type: 'issue' })
        .getRawOne(),
      
      // Статистика по корректировкам
      query
        .select([
          'COUNT(*) as count',
          'SUM(CASE WHEN movement.quantity > 0 THEN 1 ELSE 0 END) as positiveAdjustments',
          'SUM(CASE WHEN movement.quantity < 0 THEN 1 ELSE 0 END) as negativeAdjustments'
        ])
        .andWhere('movement.type = :type', { type: 'adjustment' })
        .getRawOne(),
      
      // Топ запчастей по движениям
      query
        .select([
          'movement.partId as partId',
          'part.name as partName',
          'COUNT(*) as movementCount',
          'SUM(movement.quantity) as netQuantity'
        ])
        .groupBy('movement.partId, part.name')
        .orderBy('movementCount', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      companyId,
      period: { from: dateFrom, to: dateTo },
      totalMovements: parseInt(totalMovements.toString()),
      receipts: {
        count: parseInt(receiptsData?.count || '0'),
        totalQuantity: parseFloat(receiptsData?.totalQuantity || '0'),
        totalValue: parseFloat(receiptsData?.totalValue || '0'),
      },
      issues: {
        count: parseInt(issuesData?.count || '0'),
        totalQuantity: parseFloat(issuesData?.totalQuantity || '0'),
        totalValue: parseFloat(issuesData?.totalValue || '0'),
      },
      adjustments: {
        count: parseInt(adjustmentsData?.count || '0'),
        positiveAdjustments: parseInt(adjustmentsData?.positiveAdjustments || '0'),
        negativeAdjustments: parseInt(adjustmentsData?.negativeAdjustments || '0'),
      },
      topParts: topParts.map(item => ({
        partId: item.partid,
        partName: item.partname,
        movementCount: parseInt(item.movementcount),
        netQuantity: parseFloat(item.netquantity),
      })),
    };
  }

  /**
   * 🔒 Проверка существования запчасти в компании
   */
  async validatePartExists(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { 
        id: partId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: ['category'],
    });
  }

  /**
   * 🔒 Получение информации о пользователе
   */
  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
  }

  /**
   * 🔒 Получение информации о поставщике для компании
   */
  async findSupplierForCompany(supplierId: string, companyId: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { 
        id: supplierId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
    });
  }

  /**
   * 🔄 Получение текущего остатка запчасти
   */
  async getCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
    });
    
    return inventory?.quantity || 0;
  }

  /**
   * 🔄 Обновление остатка в инвентаре
   */
  async updateInventoryQuantity(
    partId: string, 
    companyId: string, 
    newQuantity: number
  ): Promise<void> {
    await this.inventoryRepository.update(
      { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      { 
        quantity: newQuantity,
        lastRestockDate: newQuantity > 0 ? new Date() : undefined,
      }
    );
  }

  /**
   * 📦 Bulk создание движений
   */
	async createBulk(movementsData: CreateMovementData[]): Promise<StockMovement[]> {
	// 🔥 ИСПРАВЛЯЕМ: правильно маппим массив данных
	const movementsToCreate = movementsData.map(data => ({
	  companyId: data.companyId,
	  partId: data.partId,
	  type: data.type as any, // 🔥 Приводим к типу entity
	  reason: data.reason as any, // 🔥 Приводим к типу entity
	  quantity: data.quantity,
	  price: data.price,
	  totalAmount: data.totalAmount,
	  orderId: data.orderId,
	  supplierId: data.supplierId,
	  documentNumber: data.documentNumber,
	  notes: data.notes,
	  createdBy: data.userId,
	}));

	  const movements = this.stockMovementRepository.create(movementsToCreate);
	  return this.stockMovementRepository.save(movements);
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
   * ❌ Удаление движения (только для корректировок и с ограничениями)
   */
  async remove(id: string): Promise<void> {
    await this.stockMovementRepository.delete(id);
  }

  /**
   * 📊 Получение движений за период для аналитики
   */
  async findForAnalytics(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
    categoryId?: string
  ): Promise<StockMovement[]> {
    const query = this.stockMovementRepository.createQueryBuilder('movement')
      .leftJoinAndSelect('movement.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .where('movement.companyId = :companyId', { companyId }) // 🔒 КРИТИЧНО
      .andWhere('movement.createdAt >= :dateFrom', { dateFrom })
      .andWhere('movement.createdAt <= :dateTo', { dateTo });

    if (categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId });
    }

    return query.getMany();
  }
}
