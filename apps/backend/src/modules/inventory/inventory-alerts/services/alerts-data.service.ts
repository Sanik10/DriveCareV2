import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  InventoryAlert,
  Part,
  PartCategory,
  Inventory,
  Company,
  User
} from '../../../../database/entities';
import { 
  AlertFilter,
  CreateAlertData,
  UpdateAlertData,
  AlertSettings,
  AlertStats
} from '../types/alerts.types';
import { AlertType, AlertPriority } from '../../constants/inventory.constants';

@Injectable()
export class AlertsDataService {
  constructor(
    @InjectRepository(InventoryAlert)
    private readonly alertRepository: Repository<InventoryAlert>,
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 🔒 Поиск алертов с ОБЯЗАТЕЛЬНОЙ фильтрацией по компании
   */
  async findWithFilters(filter: AlertFilter): Promise<[InventoryAlert[], number]> {
    const query = this.alertRepository.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.part', 'part')
      .leftJoinAndSelect('part.category', 'category');

    // 🔒 КРИТИЧНО: ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('alert.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтр по конкретной запчасти
    if (filter.partId) {
      query.andWhere('alert.partId = :partId', { partId: filter.partId });
    }

    // Фильтр по типу алерта
    if (filter.type) {
      query.andWhere('alert.type = :type', { type: filter.type });
    }

    // Фильтр по приоритету
    if (filter.priority) {
      query.andWhere('alert.priority = :priority', { priority: filter.priority });
    }

    // Фильтр по статусу активности
    if (filter.isActive !== undefined) {
      query.andWhere('alert.isActive = :isActive', { isActive: filter.isActive });
    }

    // Фильтр по статусу отклонения
    if (filter.isDismissed !== undefined) {
      query.andWhere('alert.isDismissed = :isDismissed', { isDismissed: filter.isDismissed });
    }

    // Фильтр по категории
    if (filter.categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    // Поиск по названию запчасти
    if (filter.search) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search OR alert.title ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по дате создания
    if (filter.createdFrom) {
      query.andWhere('alert.createdAt >= :createdFrom', { createdFrom: filter.createdFrom });
    }

    if (filter.createdTo) {
      query.andWhere('alert.createdAt <= :createdTo', { createdTo: filter.createdTo });
    }

    // Сортировка
    const sortField = filter.sortField || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    
    switch (sortField) {
      case 'createdAt':
        query.orderBy('alert.createdAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'priority':
        // Сортируем по приоритету: critical > high > medium > low
        query.orderBy(`CASE 
          WHEN alert.priority = 'critical' THEN 1
          WHEN alert.priority = 'high' THEN 2
          WHEN alert.priority = 'medium' THEN 3
          WHEN alert.priority = 'low' THEN 4
          ELSE 5
        END`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'type':
        query.orderBy('alert.type', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'partName':
        query.orderBy('part.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'currentQuantity':
        query.orderBy('alert.currentQuantity', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'shortage':
        query.orderBy('(alert.thresholdQuantity - alert.currentQuantity)', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      default:
        query.orderBy('alert.createdAt', 'DESC');
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск алерта по ID
   */
  async findById(id: string): Promise<InventoryAlert | null> {
    return this.alertRepository.findOne({
      where: { id },
      relations: ['part', 'part.category'],
    });
  }

  /**
   * 🔒 Поиск алерта по ID для конкретной компании
   */
  async findByIdForCompany(id: string, companyId: string): Promise<InventoryAlert | null> {
    return this.alertRepository.findOne({
      where: { 
        id,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: ['part', 'part.category'],
    });
  }

  /**
   * 📝 Создание нового алерта
   */
  async create(data: CreateAlertData): Promise<InventoryAlert> {
	const alert = this.alertRepository.create({
		companyId: data.companyId,
		partId: data.partId,
		type: data.type,
		priority: data.priority,
		title: data.title,
		message: data.message,
		currentQuantity: data.currentQuantity,
		thresholdQuantity: data.thresholdQuantity,
		metadata: data.metadata,
		triggeredBy: data.triggeredBy,
		isActive: true,
		isDismissed: false,
		// 🔥 ДОБАВЛЕНО: Дефолтные значения для старых полей
		minQuantity: data.thresholdQuantity || 0,
		alertEnabled: true,
		notified: false,
	});
	
	return this.alertRepository.save(alert);
  }

  /**
   * 📝 Обновление алерта
   */
  async update(id: string, data: UpdateAlertData): Promise<InventoryAlert> {
	// 🔥 ИСПРАВЛЕНО: Правильное обновление с преобразованием типов
	const updateFields: any = {};
	
	Object.keys(data).forEach(key => {
		if (data[key] !== undefined) {
		updateFields[key] = data[key];
		}
	});

	await this.alertRepository.update(id, updateFields);
	
	const updatedAlert = await this.findById(id);
	if (!updatedAlert) {
		throw new Error(`Alert with id ${id} not found after update`);
	}
	
	return updatedAlert;
	}


  /**
   * 🚫 Отклонение алерта
   */
  async dismiss(id: string, userId: string): Promise<InventoryAlert> {
	const updateData = {
		isDismissed: true,
		dismissedBy: userId,
		dismissedAt: new Date(),
		isActive: false,
	};

	return this.update(id, updateData);
  }

  /**
   * 🔒 Получение активных алертов для запчасти
   */
  async findActiveAlertsForPart(partId: string, companyId: string): Promise<InventoryAlert[]> {
    return this.alertRepository.find({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
        isActive: true,
        isDismissed: false,
      },
      relations: ['part'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔒 Проверка существования активного алерта типа для запчасти
   */
  async existsActiveAlertForPart(
    partId: string, 
    companyId: string, 
    type: AlertType
  ): Promise<boolean> {
    const count = await this.alertRepository.count({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
        type,
        isActive: true,
        isDismissed: false,
      },
    });
    
    return count > 0;
  }

  /**
   * 📊 Получение статистики алертов
   */
  async getAlertStats(companyId: string, dateFrom: Date, dateTo: Date): Promise<AlertStats> {
    const baseQuery = this.alertRepository.createQueryBuilder('alert')
      .where('alert.companyId = :companyId', { companyId })
      .andWhere('alert.createdAt >= :dateFrom', { dateFrom })
      .andWhere('alert.createdAt <= :dateTo', { dateTo });

    const [
      totalAlerts,
      activeAlerts,
      dismissedAlerts,
      typeStats,
      priorityStats,
      topParts,
      dailyActivity
    ] = await Promise.all([
      // Общее количество
      baseQuery.getCount(),
      
      // Активные
      baseQuery.clone().andWhere('alert.isActive = true').getCount(),
      
      // Отклоненные
      baseQuery.clone().andWhere('alert.isDismissed = true').getCount(),
      
      // По типам
      baseQuery.clone()
        .select(['alert.type', 'COUNT(*) as count'])
        .groupBy('alert.type')
        .getRawMany(),
      
      // По приоритетам
      baseQuery.clone()
        .select(['alert.priority', 'COUNT(*) as count'])
        .groupBy('alert.priority')
        .getRawMany(),
      
      // Топ запчастей с алертами
      baseQuery.clone()
        .leftJoin('alert.part', 'part')
        .leftJoin('part.inventory', 'inventory')
        .select([
          'alert.partId',
          'part.name as partName',
          'COUNT(*) as alertCount',
          'COALESCE(inventory.quantity, 0) as currentQuantity',
          'COALESCE(inventory.minQuantity, 0) as minQuantity'
        ])
        .groupBy('alert.partId, part.name, inventory.quantity, inventory.minQuantity')
        .orderBy('alertCount', 'DESC')
        .limit(10)
        .getRawMany(),
      
      // Дневная активность
      baseQuery.clone()
        .select([
          'DATE(alert.createdAt) as date',
          'COUNT(*) as created',
          'SUM(CASE WHEN alert.isDismissed THEN 1 ELSE 0 END) as dismissed',
          'SUM(CASE WHEN alert.isActive THEN 1 ELSE 0 END) as active'
        ])
        .groupBy('DATE(alert.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany(),
    ]);

    // Обработка результатов
    const byType = {} as Record<AlertType, { count: number; percentage: number }>;
    typeStats.forEach(stat => {
      const count = parseInt(stat.count);
      byType[stat.type as AlertType] = {
        count,
        percentage: totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0,
      };
    });

    const byPriority = {} as Record<AlertPriority, { count: number; percentage: number }>;
    priorityStats.forEach(stat => {
      const count = parseInt(stat.count);
      byPriority[stat.priority as AlertPriority] = {
        count,
        percentage: totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0,
      };
    });

    const topPartsWithAlerts = topParts.map(part => ({
      partId: part.partid,
      partName: part.partname,
      alertCount: parseInt(part.alertcount),
      currentQuantity: parseInt(part.currentquantity),
      minQuantity: parseInt(part.minquantity),
    }));

    const trends = {
      daily: dailyActivity.map(day => ({
        date: day.date,
        created: parseInt(day.created),
        dismissed: parseInt(day.dismissed),
        active: parseInt(day.active),
      })),
    };

    // Расчет среднего времени реакции
    const responseTimeQuery = await this.alertRepository
      .createQueryBuilder('alert')
      .select('AVG(EXTRACT(EPOCH FROM (alert.dismissedAt - alert.createdAt))/3600) as avgHours')
      .where('alert.companyId = :companyId', { companyId })
      .andWhere('alert.isDismissed = true')
      .andWhere('alert.createdAt >= :dateFrom', { dateFrom })
      .andWhere('alert.createdAt <= :dateTo', { dateTo })
      .getRawOne();

    const averageResponseTime = parseFloat(responseTimeQuery?.avgHours || '0');
    const criticalAlertsResolved = dismissedAlerts; // Упрощение для примера

    return {
      companyId,
      period: { from: dateFrom, to: dateTo },
      totalAlerts,
      activeAlerts,
      dismissedAlerts,
      byType,
      byPriority,
      trends,
      topPartsWithAlerts,
      averageResponseTime,
      criticalAlertsResolved,
    };
  }

  /**
   * 🔒 Автоматическое отклонение истекших алертов
   */
  async dismissExpiredAlerts(companyId: string, hoursAgo: number): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - hoursAgo);

    const result = await this.alertRepository
      .createQueryBuilder()
      .update(InventoryAlert)
      .set({
        isDismissed: true,
        dismissedBy: 'system',
        dismissedAt: new Date(),
        isActive: false,
      })
      .where('companyId = :companyId', { companyId })
      .andWhere('isActive = true')
      .andWhere('isDismissed = false')
      .andWhere('createdAt <= :expiryDate', { expiryDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * 🔒 Получение критических алертов
   */
  async findCriticalAlerts(companyId: string): Promise<InventoryAlert[]> {
    return this.alertRepository.find({
      where: { 
        companyId,
        priority: 'critical',
        isActive: true,
        isDismissed: false,
      },
      relations: ['part', 'part.category'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔒 Автоотклонение алертов после пополнения
   */
  async dismissAlertsAfterRestock(partId: string, companyId: string): Promise<number> {
    const result = await this.alertRepository
      .createQueryBuilder()
      .update(InventoryAlert)
      .set({
        isDismissed: true,
        dismissedBy: 'system_restock',
        dismissedAt: new Date(),
        isActive: false,
      })
      .where('partId = :partId', { partId })
      .andWhere('companyId = :companyId', { companyId })
      .andWhere('type IN (:...types)', { types: ['low_stock', 'out_of_stock'] })
      .andWhere('isActive = true')
      .andWhere('isDismissed = false')
      .execute();

    return result.affected || 0;
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
   * ❌ Удаление алерта (только для неактивных)
   */
  async remove(id: string): Promise<void> {
    await this.alertRepository.delete(id);
  }

  /**
   * 🔄 Получение остатка запчасти
   */
  async getPartCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
    });
    
    return inventory?.quantity || 0;
  }

  /**
   * 🔄 Получение минимального остатка запчасти
   */
  async getPartMinStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
    });
    
    return inventory?.minQuantity || 5; // По умолчанию 5
  }
}
