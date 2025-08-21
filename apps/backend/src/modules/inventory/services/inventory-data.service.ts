// path: apps/backend/src/modules/inventory/services/inventory-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Inventory, Part, StockMovement, Company, PartReservation } from '../../../database/entities';
import { InventoryFilter, UpdateInventoryData } from '../types/inventory.types';
import { ReservationStatus } from '../../../database/entities/part-reservation.entity';

@Injectable()
export class InventoryDataService {
  constructor(
    @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Part) private readonly partRepository: Repository<Part>,
    @InjectRepository(StockMovement) private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    @InjectRepository(PartReservation) private readonly reservationRepository: Repository<PartReservation>,
  ) {}

  async findWithFilters(filter: InventoryFilter): Promise<[Inventory[], number]> {
    const qb = this.inventoryRepository.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.part', 'part')
      .leftJoinAndSelect('part.category', 'category');

    if (filter.companyId) {
      qb.andWhere('inventory.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.partId) qb.andWhere('inventory.partId = :partId', { partId: filter.partId });
    if (filter.categoryId) qb.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    if (typeof filter.lowStock === 'boolean') {
      if (filter.lowStock) qb.andWhere('inventory.quantity <= inventory.minQuantity');
      else qb.andWhere('inventory.quantity > inventory.minQuantity');
    }
    if (filter.location) qb.andWhere('inventory.location ILIKE :location', { location: `%${filter.location}%` });
    if (filter.search) {
      qb.andWhere('(part.name ILIKE :search OR part.partNumber ILIKE :search)', { search: `%${filter.search}%` });
    }
    if (filter.minQuantity !== undefined) qb.andWhere('inventory.quantity >= :minQuantity', { minQuantity: filter.minQuantity });
    if (filter.maxQuantity !== undefined) qb.andWhere('inventory.quantity <= :maxQuantity', { maxQuantity: filter.maxQuantity });
    if (filter.dateFrom) qb.andWhere('inventory.lastRestockDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) qb.andWhere('inventory.lastRestockDate <= :dateTo', { dateTo: filter.dateTo });

    const sortField = filter.sortField || 'partName';
    const sortOrder = (filter.sortOrder || 'asc').toUpperCase() as 'ASC' | 'DESC';
    switch (sortField) {
      case 'partName': qb.orderBy('part.name', sortOrder); break;
      case 'quantity': qb.orderBy('inventory.quantity', sortOrder); break;
      case 'minQuantity': qb.orderBy('inventory.minQuantity', sortOrder); break;
      case 'location': qb.orderBy('inventory.location', sortOrder); break;
      case 'lastRestockDate': qb.orderBy('inventory.lastRestockDate', sortOrder); break;
      case 'categoryName': qb.orderBy('category.name', sortOrder); break;
      default: qb.orderBy('part.name', 'ASC');
    }

    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      qb.skip(skip).take(filter.limit);
    }

    return qb.getManyAndCount();
  }

  async findById(id: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: { id },
      relations: ['part', 'part.category'],
    });
  }

  async findByPartAndCompany(partId: string, companyId: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: { partId, companyId },
      relations: ['part', 'part.category'],
    });
  }

  async update(id: string, data: UpdateInventoryData): Promise<Inventory> {
    await this.inventoryRepository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Inventory item with id ${id} not found after update`);
    return updated;
  }

  async create(data: { companyId: string; partId: string; quantity: number; minQuantity: number; location?: string; }): Promise<Inventory> {
    const entity = this.inventoryRepository.create(data);
    return this.inventoryRepository.save(entity);
  }

  async updateQuantity(id: string, newQuantity: number): Promise<Inventory> {
    await this.inventoryRepository.update(id, {
      quantity: newQuantity,
      lastRestockDate: newQuantity > 0 ? new Date() : undefined,
    });
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Inventory item with id ${id} not found after quantity update`);
    return updated;
  }

  async getCompanyStockStats(companyId: string): Promise<{
    totalParts: number; totalValue: number; lowStockCount: number; outOfStockCount: number; overstockCount: number;
  }> {
    // totalParts
    const totalParts = await this.inventoryRepository.createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .getCount();

    // totalValue
    const totalValueRow = await this.inventoryRepository.createQueryBuilder('i')
      .leftJoin('i.part', 'p')
      .select('COALESCE(SUM(i.quantity * p.costPrice), 0)', 'total')
      .where('i.companyId = :companyId', { companyId })
      .getRawOne<{ total: string }>();
    const totalValue = parseFloat(totalValueRow?.total || '0');

    // lowStockCount
    const lowStockCount = await this.inventoryRepository.createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.quantity > 0 AND i.quantity <= i.minQuantity')
      .getCount();

    // outOfStockCount
    const outOfStockCount = await this.inventoryRepository.createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.quantity = 0')
      .getCount();

    // overstockCount
    const overstockCount = await this.inventoryRepository.createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.minQuantity > 0')
      .andWhere('i.quantity > i.minQuantity * 5')
      .getCount();

    return { totalParts, totalValue, lowStockCount, outOfStockCount, overstockCount };
    }

  async findLowStockItems(companyId: string): Promise<Inventory[]> {
    return this.inventoryRepository.createQueryBuilder('i')
      .leftJoinAndSelect('i.part', 'p')
      .leftJoinAndSelect('p.category', 'c')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.quantity <= i.minQuantity')
      .orderBy('i.quantity', 'ASC')
      .getMany();
  }

  async getTopCategories(companyId: string, limit: number = 5): Promise<Array<{
    categoryId: string; categoryName: string; partCount: number; totalValue: number;
  }>> {
    const rows = await this.inventoryRepository.createQueryBuilder('i')
      .leftJoin('i.part', 'p')
      .leftJoin('p.category', 'c')
      .select([
        'c.id as categoryId',
        'c.name as categoryName',
        'COUNT(*) as partCount',
        'COALESCE(SUM(i.quantity * p.costPrice), 0) as totalValue',
      ])
      .where('i.companyId = :companyId', { companyId })
      .groupBy('c.id, c.name')
      .orderBy('totalValue', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map(r => ({
      categoryId: r.categoryid,
      categoryName: r.categoryname || 'Без категории',
      partCount: parseInt(r.partcount, 10),
      totalValue: parseFloat(r.totalvalue) || 0,
    }));
  }

  async getRecentMovementsCount(companyId: string, days: number = 7): Promise<number> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return this.stockMovementRepository.createQueryBuilder('m')
      .where('m.companyId = :companyId', { companyId })
      .andWhere('m.createdAt >= :dateFrom', { dateFrom })
      .getCount();
  }

  async validateCompanyExists(companyId: string): Promise<boolean> {
    const count = await this.companyRepository.count({ where: { id: companyId } });
    return count > 0;
  }

  async findPartByIdAndCompany(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id: partId, companyId },
      relations: ['category'],
    });
  }

  async findMultipleByCompany(partIds: string[], companyId: string): Promise<Inventory[]> {
    if (!partIds.length) return [];
    return this.inventoryRepository.find({
      where: { partId: In(partIds), companyId },
      relations: ['part', 'part.category'],
    });
  }

  async getActiveReservedQuantity(partId: string, companyId: string, manager = this.reservationRepository.manager): Promise<number> {
    const now = new Date();
    const qb = manager
      .getRepository(PartReservation)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.quantity), 0)', 'reserved')
      .where('r.companyId = :companyId AND r.partId = :partId', { companyId, partId })
      .andWhere('(r.status = :stActive OR (r.status = :stActive AND r.expiresAt IS NULL))', {
        stActive: ReservationStatus.ACTIVE,
      })
      .andWhere('(r.expiresAt IS NULL OR r.expiresAt > :now)', { now });

    const row = await qb.getRawOne<{ reserved: string }>();
    return parseInt(row?.reserved || '0', 10);
  }

   async createReservation(data: {
    companyId: string;
    partId: string;
    orderId?: string;
    quantity: number;
    reservedBy: string;
    expiresAt?: Date | null;
    idempotencyKey?: string | null;
  }, manager = this.reservationRepository.manager) {
    const repo = manager.getRepository(PartReservation);
    const entity = repo.create({
      companyId: data.companyId,
      partId: data.partId,
      orderId: data.orderId || null,
      quantity: data.quantity,
      reservedBy: data.reservedBy,
      reservedAt: new Date(),
      expiresAt: data.expiresAt || null,
      status: ReservationStatus.ACTIVE,
      idempotencyKey: data.idempotencyKey || null,
    });
    return repo.save(entity);
  }

  async findReservationById(reservationId: string): Promise<PartReservation | null> {
    return this.reservationRepository.findOne({ where: { id: reservationId } });
  }

  async findReservationByIdempotency(companyId: string, idempotencyKey: string): Promise<PartReservation | null> {
    return this.reservationRepository.findOne({ where: { companyId, idempotencyKey } });
  }

  async markReservationReleased(reservationId: string, releasedBy: string, manager = this.reservationRepository.manager) {
    await manager.getRepository(PartReservation).update(reservationId, {
      status: ReservationStatus.RELEASED,
      releasedAt: new Date(),
      releasedBy,
    });
  }

  async expireReservations(companyId: string, manager = this.reservationRepository.manager): Promise<number> {
    const now = new Date();
    const res = await manager
      .createQueryBuilder()
      .update(PartReservation)
      .set({ status: ReservationStatus.EXPIRED })
      .where('company_id = :companyId AND status = :st AND expires_at IS NOT NULL AND expires_at <= :now', {
        companyId, st: ReservationStatus.ACTIVE, now,
      })
      .execute();
    return res.affected || 0;
  }

  async checkReservationAvailability(
    partId: string,
    requestedQuantity: number,
    companyId: string,
    _excludeReservationId?: string
  ): Promise<{ available: number; reserved: number; canReserve: boolean }> {
    const inventory = await this.findByPartAndCompany(partId, companyId);
    if (!inventory) return { available: 0, reserved: 0, canReserve: false };

    const reserved = await this.getActiveReservedQuantity(partId, companyId);
    const available = Math.max(0, inventory.quantity - reserved);
    return { available, reserved, canReserve: available >= requestedQuantity };
  }

  async remove(id: string): Promise<void> {
    // ⚠️ Складские записи лучше не удалять физически (402‑ФЗ). Здесь — явный запрет.
    throw new Error('Удаление складской позиции запрещено. Используйте корректирующее движение (adjustment) или архивирование.');
  }
}
