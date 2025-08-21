// path: apps/backend/src/modules/inventory/stock-movements/services/stock-movements-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DeepPartial, Repository } from 'typeorm';
import { StockMovement, Part, Inventory, User, Supplier, Company } from '../../../../database/entities';
import { StockMovementFilter, CreateMovementData, UpdateMovementData, MovementSummary } from '../types/stock-movements.types';

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
   * 🔒 Поиск движений с ОБЯЗАТЕЛЬНОЙ фильтрацией по компании (передаётся контроллером)
   */
  async findWithFilters(filter: StockMovementFilter): Promise<[StockMovement[], number]> {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .leftJoinAndSelect('movement.supplier', 'supplier');

    if (filter.companyId) {
      query.andWhere('movement.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.partId) {
      query.andWhere('movement.partId = :partId', { partId: filter.partId });
    }

    if (filter.type) {
      query.andWhere('movement.type = :type', { type: filter.type });
    }

    if (filter.reason) {
      query.andWhere('movement.reason = :reason', { reason: filter.reason });
    }

    if (filter.userId) {
      query.andWhere('movement.createdBy = :userId', { userId: filter.userId });
    }

    if (filter.orderId) {
      query.andWhere('movement.orderId = :orderId', { orderId: filter.orderId });
    }

    if (filter.supplierId) {
      query.andWhere('movement.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    if (filter.documentNumber) {
      query.andWhere('movement.documentNumber ILIKE :documentNumber', {
        documentNumber: `%${filter.documentNumber}%`,
      });
    }

    if (filter.minQuantity !== undefined) {
      query.andWhere('ABS(movement.quantity) >= :minQuantity', { minQuantity: filter.minQuantity });
    }

    if (filter.maxQuantity !== undefined) {
      query.andWhere('ABS(movement.quantity) <= :maxQuantity', { maxQuantity: filter.maxQuantity });
    }

    if (filter.dateFrom) {
      query.andWhere('movement.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      query.andWhere('movement.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.search) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search OR movement.documentNumber ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    const sortField = filter.sortField || 'createdAt';
    const sortOrder = (filter.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

    switch (sortField) {
      case 'createdAt':
        query.orderBy('movement.createdAt', sortOrder);
        break;
      case 'type':
        query.orderBy('movement.type', sortOrder);
        break;
      case 'quantity':
        query.orderBy('movement.quantity', sortOrder);
        break;
      case 'totalAmount':
        query.orderBy('movement.totalAmount', sortOrder);
        break;
      case 'partName':
        query.orderBy('part.name', sortOrder);
        break;
      case 'documentNumber':
        query.orderBy('movement.documentNumber', sortOrder);
        break;
      default:
        query.orderBy('movement.createdAt', 'DESC');
    }

    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск движения по ID
   */
  async findById(id: string): Promise<StockMovement | null> {
    return this.stockMovementRepository.findOne({
      where: { id },
      relations: ['part', 'part.category', 'supplier'],
    });
  }

  /**
   * 🔒 Поиск движения по ID для конкретной компании
   */
  async findByIdForCompany(id: string, companyId: string): Promise<StockMovement | null> {
    return this.stockMovementRepository.findOne({
      where: { id, companyId },
      relations: ['part', 'part.category', 'supplier'],
    });
  }

  /**
   * 📝 Создание нового движения
   */
  async create(data: CreateMovementData): Promise<StockMovement> {
    const movementData: DeepPartial<StockMovement> = {
      companyId: data.companyId,
      partId: data.partId,
      type: data.type as any,
      reason: data.reason as any,
      quantity: data.quantity,
      price: data.price as any,
      totalAmount: data.totalAmount as any,
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
    await this.stockMovementRepository.update(id, data as any);
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
      where: { partId, companyId },
      relations: ['part'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 📊 Получение сводки движений за период
   */
  async getMovementSummary(companyId: string, dateFrom: Date, dateTo: Date): Promise<MovementSummary> {
    // Общее количество движений
    const totalMovements = await this.stockMovementRepository.count({
      where: { companyId, createdAt: Between(dateFrom, dateTo) as any },
    });

    // Статистика по приходу
    const receiptsData = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select([
        'COUNT(*)::int as "count"',
        'COALESCE(SUM(movement.quantity),0)::float as "totalQuantity"',
        'COALESCE(SUM(movement.totalAmount),0)::float as "totalValue"',
      ])
      .where('movement.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
      .andWhere('movement.type = :type', { type: 'receipt' })
      .getRawOne();

    // Статистика по расходу
    const issuesData = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select([
        'COUNT(*)::int as "count"',
        'COALESCE(SUM(ABS(movement.quantity)),0)::float as "totalQuantity"',
        'COALESCE(SUM(ABS(movement.totalAmount)),0)::float as "totalValue"',
      ])
      .where('movement.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
      .andWhere('movement.type = :type', { type: 'issue' })
      .getRawOne();

    // Статистика по корректировкам
    const adjustmentsData = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select([
        'COUNT(*)::int as "count"',
        'SUM(CASE WHEN movement.quantity > 0 THEN 1 ELSE 0 END)::int as "positiveAdjustments"',
        'SUM(CASE WHEN movement.quantity < 0 THEN 1 ELSE 0 END)::int as "negativeAdjustments"',
      ])
      .where('movement.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
      .andWhere('movement.type = :type', { type: 'adjustment' })
      .getRawOne();

    // Топ запчастей по движениям
    const topPartsRaw = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoin('movement.part', 'part')
      .select([
        'movement.partId as "partId"',
        'part.name as "partName"',
        'part.partNumber as "partNumber"',
        'COUNT(*)::int as "movementCount"',
        'COALESCE(SUM(movement.quantity),0)::float as "netQuantity"',
      ])
      .where('movement.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
      .groupBy('movement.partId, part.name, part.partNumber')
      .orderBy('"movementCount"', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      companyId,
      period: { from: dateFrom, to: dateTo },
      totalMovements,
      receipts: {
        count: receiptsData?.count || 0,
        totalQuantity: receiptsData?.totalQuantity || 0,
        totalValue: receiptsData?.totalValue || 0,
      },
      issues: {
        count: issuesData?.count || 0,
        totalQuantity: issuesData?.totalQuantity || 0,
        totalValue: issuesData?.totalValue || 0,
      },
      adjustments: {
        count: adjustmentsData?.count || 0,
        positiveAdjustments: adjustmentsData?.positiveAdjustments || 0,
        negativeAdjustments: adjustmentsData?.negativeAdjustments || 0,
      },
      topParts: topPartsRaw.map((item: any) => ({
        partId: item.partId,
        partName: item.partName,
        movementCount: item.movementCount,
        netQuantity: item.netQuantity,
      })),
    };
  }

  /**
   * 🔒 Проверка существования запчасти
   */
  async validatePartExists(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id: partId, companyId },
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
      where: { id: supplierId, companyId },
    });
  }

  /**
   * 🔄 Получение текущего остатка запчасти
   */
  async getCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { partId, companyId },
    });
    return inventory?.quantity || 0;
  }

  /**
   * 🔄 Обновление остатка в инвентаре
   */
  async updateInventoryQuantity(partId: string, companyId: string, newQuantity: number): Promise<void> {
    await this.inventoryRepository.update(
      { partId, companyId },
      {
        quantity: newQuantity,
        lastRestockDate: newQuantity > 0 ? (new Date() as any) : undefined,
      } as any,
    );
  }

  /**
   * 📦 Массовое создание движений
   */
  async createBulk(movementsData: CreateMovementData[]): Promise<StockMovement[]> {
    const movementsToCreate: DeepPartial<StockMovement>[] = movementsData.map((data) => ({
      companyId: data.companyId,
      partId: data.partId,
      type: data.type as any,
      reason: data.reason as any,
      quantity: data.quantity,
      price: data.price as any,
      totalAmount: data.totalAmount as any,
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
    const count = await this.companyRepository.count({ where: { id: companyId } });
    return count > 0;
  }

  /**
   * ❌ Удаление (в публичном API не используем; историчность 402‑ФЗ)
   */
  async remove(id: string): Promise<void> {
    await this.stockMovementRepository.delete(id);
  }

  /**
   * 📊 Получение движений за период для аналитики
   */
  async findForAnalytics(companyId: string, dateFrom: Date, dateTo: Date, categoryId?: string): Promise<StockMovement[]> {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .where('movement.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt >= :dateFrom', { dateFrom })
      .andWhere('movement.createdAt <= :dateTo', { dateTo });

    if (categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId });
    }

    return query.getMany();
  }

  /**
   * 🔍 Поиск по "штрих‑коду" — используем partNumber
   */
  async findPartByBarcodeOrNumber(barcode: string, companyId: string): Promise<Part | null> {
    return this.partRepository
      .createQueryBuilder('part')
      .where('part.companyId = :companyId', { companyId })
      .andWhere('part.partNumber IS NOT NULL')
      .andWhere('LOWER(part.partNumber) = LOWER(:code)', { code: barcode })
      .getOne();
  }
}
