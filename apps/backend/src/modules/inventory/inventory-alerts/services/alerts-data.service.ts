// path: apps/backend/src/modules/inventory/inventory-alerts/services/alerts-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  InventoryAlert,
  Part,
  Inventory,
  Company,
  User,
} from '../../../../database/entities';
import { InventoryAlertSettings } from '../../../../database/entities/inventory-alert-settings.entity';
import {
  AlertFilter,
  CreateAlertData,
  UpdateAlertData,
  AlertStats,
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
    @InjectRepository(InventoryAlertSettings)
    private readonly settingsRepository: Repository<InventoryAlertSettings>,
  ) {}

  /**
   * Поиск уведомлений с фильтрацией. companyId обязателен (листинг без companyId запрещён).
   */
  async findWithFilters(filter: AlertFilter): Promise<[InventoryAlert[], number]> {
    if (!filter.companyId) {
      // Жёсткая защита от утечек: без companyId возвращаем пусто
      return [[], 0];
    }

    const query = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .where('alert.companyId = :companyId', { companyId: filter.companyId });

    // Безопасные фильтры
    if (filter.partId) {
      query.andWhere('alert.partId = :partId', { partId: filter.partId });
    }

    if (filter.type) {
      query.andWhere('alert.type = :type', { type: filter.type });
    }

    if (filter.priority) {
      query.andWhere('alert.priority = :priority', { priority: filter.priority });
    }

    if (typeof filter.isActive === 'boolean') {
      query.andWhere('alert.isActive = :isActive', { isActive: filter.isActive });
    }

    if (typeof filter.isDismissed === 'boolean') {
      query.andWhere('alert.isDismissed = :isDismissed', { isDismissed: filter.isDismissed });
    }

    if (filter.categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    if (filter.search) {
      const s = String(filter.search).trim().slice(0, 100);
      if (s.length > 0) {
        query.andWhere(
          '(part.name ILIKE :search OR part.partNumber ILIKE :search OR alert.title ILIKE :search)',
          { search: `%${s}%` },
        );
      }
    }

    if (filter.createdFrom) {
      query.andWhere('alert.createdAt >= :createdFrom', { createdFrom: filter.createdFrom });
    }
    if (filter.createdTo) {
      query.andWhere('alert.createdAt <= :createdTo', { createdTo: filter.createdTo });
    }

    // Whitelist сортировки
    const sortField = filter.sortField || 'createdAt';
    const sortOrder = (filter.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortField) {
      case 'createdAt':
        query.orderBy('alert.createdAt', sortOrder as 'ASC' | 'DESC');
        break;
      case 'priority':
        // critical > high > medium > low
        query.orderBy(
          `CASE 
            WHEN alert.priority = 'critical' THEN 1
            WHEN alert.priority = 'high' THEN 2
            WHEN alert.priority = 'medium' THEN 3
            WHEN alert.priority = 'low' THEN 4
            ELSE 5
          END`,
          sortOrder as 'ASC' | 'DESC',
        );
        break;
      case 'type':
        query.orderBy('alert.type', sortOrder as 'ASC' | 'DESC');
        break;
      case 'partName':
        query.orderBy('part.name', sortOrder as 'ASC' | 'DESC');
        break;
      case 'currentQuantity':
        query.orderBy('alert.currentQuantity', sortOrder as 'ASC' | 'DESC');
        break;
      case 'shortage':
        query.orderBy('(alert.thresholdQuantity - alert.currentQuantity)', sortOrder as 'ASC' | 'DESC');
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

  async findById(id: string): Promise<InventoryAlert | null> {
    return this.alertRepository.findOne({
      where: { id },
      relations: ['part', 'part.category'],
    });
  }

  async findByIdForCompany(id: string, companyId: string): Promise<InventoryAlert | null> {
    return this.alertRepository.findOne({
      where: { id, companyId },
      relations: ['part', 'part.category'],
    });
  }

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
      minQuantity: data.thresholdQuantity || 0,
      alertEnabled: true,
      notified: false,
    });

    return this.alertRepository.save(alert);
  }

  async update(id: string, data: UpdateAlertData): Promise<InventoryAlert> {
    const updateFields: any = {};
    Object.keys(data).forEach((key) => {
      if ((data as any)[key] !== undefined) {
        (updateFields as any)[key] = (data as any)[key];
      }
    });

    await this.alertRepository.update(id, updateFields);
    const updatedAlert = await this.findById(id);
    if (!updatedAlert) {
      throw new Error(`Alert with id ${id} not found after update`);
    }
    return updatedAlert;
  }

  async dismiss(id: string, userId: string): Promise<InventoryAlert> {
    const updateData = {
      isDismissed: true,
      dismissedBy: userId,
      dismissedAt: new Date(),
      isActive: false,
    };
    return this.update(id, updateData);
  }

  async findActiveAlertsForPart(partId: string, companyId: string): Promise<InventoryAlert[]> {
    return this.alertRepository.find({
      where: { partId, companyId, isActive: true, isDismissed: false },
      relations: ['part'],
      order: { createdAt: 'DESC' },
    });
  }

  async existsActiveAlertForPart(partId: string, companyId: string, type: AlertType): Promise<boolean> {
    const count = await this.alertRepository.count({
      where: { partId, companyId, type, isActive: true, isDismissed: false },
    });
    return count > 0;
  }

  async getAlertStats(companyId: string, dateFrom: Date, dateTo: Date): Promise<AlertStats> {
    const baseQuery = this.alertRepository
      .createQueryBuilder('alert')
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
      dailyActivity,
    ] = await Promise.all([
      baseQuery.getCount(),
      baseQuery.clone().andWhere('alert.isActive = true').getCount(),
      baseQuery.clone().andWhere('alert.isDismissed = true').getCount(),
      baseQuery
        .clone()
        .select(['alert.type AS "type"', 'COUNT(*)::int as "count"'])
        .groupBy('alert.type')
        .getRawMany(),
      baseQuery
        .clone()
        .select(['alert.priority AS "priority"', 'COUNT(*)::int as "count"'])
        .groupBy('alert.priority')
        .getRawMany(),
      baseQuery
        .clone()
        .leftJoin('alert.part', 'part')
        .leftJoin(Inventory, 'inventory', 'inventory.partId = alert.partId AND inventory.companyId = alert.companyId')
        .select([
          'alert.partId AS "partId"',
          'part.name AS "partName"',
          'COUNT(*)::int AS "alertCount"',
          'COALESCE(inventory.quantity, 0)::int AS "currentQuantity"',
          'COALESCE(inventory.minQuantity, 0)::int AS "minQuantity"',
        ])
        .groupBy('alert.partId, part.name, inventory.quantity, inventory.minQuantity')
        .orderBy('"alertCount"', 'DESC')
        .limit(10)
        .getRawMany(),
      baseQuery
        .clone()
        .select([
          'DATE(alert.createdAt) as "date"',
          'COUNT(*)::int as "created"',
          'SUM(CASE WHEN alert.isDismissed THEN 1 ELSE 0 END)::int as "dismissed"',
          'SUM(CASE WHEN alert.isActive THEN 1 ELSE 0 END)::int as "active"',
        ])
        .groupBy('DATE(alert.createdAt)')
        .orderBy('"date"', 'ASC')
        .getRawMany(),
    ]);

    const byType = {} as Record<AlertType, { count: number; percentage: number }>;
    typeStats.forEach((stat: any) => {
      const count = stat.count as number;
      byType[stat.type as AlertType] = {
        count,
        percentage: totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0,
      };
    });

    const byPriority = {} as Record<AlertPriority, { count: number; percentage: number }>;
    priorityStats.forEach((stat: any) => {
      const count = stat.count as number;
      byPriority[stat.priority as AlertPriority] = {
        count,
        percentage: totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0,
      };
    });

    const trends = {
      daily: dailyActivity.map((day: any) => ({
        date: day.date,
        created: day.created,
        dismissed: day.dismissed,
        active: day.active,
      })),
    };

    return {
      companyId,
      period: { from: dateFrom, to: dateTo },
      totalAlerts,
      activeAlerts,
      dismissedAlerts,
      byType,
      byPriority,
      trends,
      topPartsWithAlerts: topParts,
      averageResponseTime: await this.getAverageResponseTime(companyId, dateFrom, dateTo),
      criticalAlertsResolved: dismissedAlerts, // упрощение
    };
  }

  private async getAverageResponseTime(companyId: string, dateFrom: Date, dateTo: Date): Promise<number> {
    const responseTimeQuery = await this.alertRepository
      .createQueryBuilder('alert')
      .select('AVG(EXTRACT(EPOCH FROM (alert.dismissedAt - alert.createdAt))/3600) as "avgHours"')
      .where('alert.companyId = :companyId', { companyId })
      .andWhere('alert.isDismissed = true')
      .andWhere('alert.createdAt >= :dateFrom', { dateFrom })
      .andWhere('alert.createdAt <= :dateTo', { dateTo })
      .getRawOne();

    return parseFloat(responseTimeQuery?.avgHours || '0');
  }

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

  async findCriticalAlerts(companyId: string): Promise<InventoryAlert[]> {
    return this.alertRepository.find({
      where: { companyId, priority: 'critical', isActive: true, isDismissed: false },
      relations: ['part', 'part.category'],
      order: { createdAt: 'DESC' },
    });
  }

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

  async validateCompanyExists(companyId: string): Promise<boolean> {
    const count = await this.companyRepository.count({ where: { id: companyId } });
    return count > 0;
  }

  async validatePartExists(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id: partId, companyId },
      relations: ['category'],
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
  }

  // 402-ФЗ: публичный hard delete не предоставляем

  async getPartCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({ where: { partId, companyId } });
    return inventory?.quantity || 0;
    }

  async getPartMinStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({ where: { partId, companyId } });
    return inventory?.minQuantity || 5;
  }

  // Alert Settings persistence
  async getOrCreateSettings(companyId: string): Promise<InventoryAlertSettings> {
    let settings = await this.settingsRepository.findOne({ where: { companyId, userId: null } });
    if (!settings) {
      settings = this.settingsRepository.create({
        companyId,
        userId: null,
        enableEmailNotifications: true,
        enablePushNotifications: true,
        emailAddresses: [],
        lowStockThreshold: 5,
        criticalStockThreshold: 2,
        overstockMultiplier: 5,
        enabledAlertTypes: ['low_stock', 'out_of_stock', 'overstock'],
        alertFrequency: 'immediate',
        autoDismissAfterRestock: true,
        autoDismissAfterHours: 72,
        workingHoursStart: null,
        workingHoursEnd: null,
        workingDays: null,
        timezone: null,
        lastNotificationSent: null,
      });
      settings = await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(companyId: string, patch: Partial<InventoryAlertSettings>): Promise<InventoryAlertSettings> {
    let settings = await this.getOrCreateSettings(companyId);
    Object.assign(settings, patch, { companyId, userId: null });
    settings = await this.settingsRepository.save(settings);
    return settings;
  }
}
