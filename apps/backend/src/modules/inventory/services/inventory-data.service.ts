// src/modules/inventory/services/inventory-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, Part, PartCategory, StockMovement, Company } from '../../../database/entities';
import { InventoryFilter, UpdateInventoryData } from '../types/inventory.types';

@Injectable()
export class InventoryDataService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * 🔒 Поиск всех позиций склада с фильтрацией
   */
  async findWithFilters(filter: InventoryFilter): Promise<[Inventory[], number]> {
    const query = this.inventoryRepository.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.part', 'part')
      .leftJoinAndSelect('part.category', 'category');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('inventory.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтр по конкретной запчасти
    if (filter.partId) {
      query.andWhere('inventory.partId = :partId', { partId: filter.partId });
    }

    // Фильтр по категории
    if (filter.categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    // Фильтр только позиции с низким остатком
    if (filter.lowStock) {
      query.andWhere('inventory.quantity <= inventory.minQuantity');
    }

    // Фильтр по местоположению
    if (filter.location) {
      query.andWhere('inventory.location ILIKE :location', { 
        location: `%${filter.location}%` 
      });
    }

    // Поиск по названию или номеру запчасти
    if (filter.search) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по количеству
    if (filter.minQuantity !== undefined) {
      query.andWhere('inventory.quantity >= :minQuantity', { minQuantity: filter.minQuantity });
    }

    if (filter.maxQuantity !== undefined) {
      query.andWhere('inventory.quantity <= :maxQuantity', { maxQuantity: filter.maxQuantity });
    }

    // Фильтр по дате
    if (filter.dateFrom) {
      query.andWhere('inventory.lastRestockDate >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      query.andWhere('inventory.lastRestockDate <= :dateTo', { dateTo: filter.dateTo });
    }

    // Сортировка
    const sortField = filter.sortField || 'part.name';
    const sortOrder = filter.sortOrder || 'ASC';
    
    switch (sortField) {
      case 'partName':
        query.orderBy('part.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'quantity':
        query.orderBy('inventory.quantity', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'minQuantity':
        query.orderBy('inventory.minQuantity', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'location':
        query.orderBy('inventory.location', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'lastRestockDate':
        query.orderBy('inventory.lastRestockDate', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'categoryName':
        query.orderBy('category.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      default:
        query.orderBy('part.name', 'ASC');
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск позиции по ID
   */
  async findById(id: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: { id },
      relations: [
        'part',
        'part.category',
      ],
    });
  }

  /**
   * 🔒 Поиск позиции по запчасти и компании
   */
  async findByPartAndCompany(partId: string, companyId: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: [
        'part',
        'part.category',
      ],
    });
  }

  /**
   * 📝 Обновление позиции склада
   */
  async update(id: string, data: UpdateInventoryData): Promise<Inventory> {
    await this.inventoryRepository.update(id, data);
    
    const updatedInventory = await this.findById(id);
    if (!updatedInventory) {
      throw new Error(`Inventory item with id ${id} not found after update`);
    }
    
    return updatedInventory;
  }

  /**
   * 🔒 Создание новой позиции склада
   */
  async create(data: {
    companyId: string;
    partId: string;
    quantity: number;
    minQuantity: number;
    location?: string;
  }): Promise<Inventory> {
    const inventory = this.inventoryRepository.create(data);
    return this.inventoryRepository.save(inventory);
  }

  /**
   * 🔄 Обновление количества (для резервирования/движений)
   */
  async updateQuantity(id: string, newQuantity: number): Promise<Inventory> {
    await this.inventoryRepository.update(id, { 
      quantity: newQuantity,
      lastRestockDate: newQuantity > 0 ? new Date() : undefined,
    });
    
    const updatedInventory = await this.findById(id);
    if (!updatedInventory) {
      throw new Error(`Inventory item with id ${id} not found after quantity update`);
    }
    
    return updatedInventory;
  }

  /**
   * 📊 Получение статистики по складу компании
   */
  async getCompanyStockStats(companyId: string): Promise<{
    totalParts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    overstockCount: number;
  }> {
    const query = this.inventoryRepository.createQueryBuilder('inventory')
      .leftJoin('inventory.part', 'part')
      .where('inventory.companyId = :companyId', { companyId });

    const [total, totalValue, lowStock, outOfStock, overstock] = await Promise.all([
      // Общее количество позиций
      query.getCount(),
      
      // Общая стоимость (quantity * costPrice)
      query
        .select('SUM(inventory.quantity * part.costPrice)', 'total')
        .getRawOne()
        .then(result => parseFloat(result.total) || 0),
      
      // Позиции с низким остатком
      query
        .andWhere('inventory.quantity <= inventory.minQuantity')
        .andWhere('inventory.quantity > 0')
        .getCount(),
      
      // Позиции с нулевым остатком
      query
        .andWhere('inventory.quantity = 0')
        .getCount(),
        
      // Позиции с избыточным остатком (больше чем в 5 раз минимум)
      query
        .andWhere('inventory.quantity > inventory.minQuantity * 5')
        .andWhere('inventory.minQuantity > 0')
        .getCount(),
    ]);

    return {
      totalParts: total,
      totalValue,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      overstockCount: overstock,
    };
  }

  /**
   * 🔒 Получение позиций с низким остатком
   */
  async findLowStockItems(companyId: string): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: { 
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['part', 'part.category'],
      order: { quantity: 'ASC' },
    }).then(items => 
      items.filter(item => item.quantity <= item.minQuantity)
    );
  }

  /**
   * 📊 Получение топ категорий по количеству и стоимости
   */
  async getTopCategories(companyId: string, limit: number = 5): Promise<Array<{
    categoryId: string;
    categoryName: string;
    partCount: number;
    totalValue: number;
  }>> {
    const result = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoin('inventory.part', 'part')
      .leftJoin('part.category', 'category')
      .select([
        'category.id as categoryId',
        'category.name as categoryName',
        'COUNT(*) as partCount',
        'SUM(inventory.quantity * part.costPrice) as totalValue',
      ])
      .where('inventory.companyId = :companyId', { companyId })
      .groupBy('category.id, category.name')
      .orderBy('totalValue', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(item => ({
      categoryId: item.categoryid,
      categoryName: item.categoryname || 'Без категории',
      partCount: parseInt(item.partcount),
      totalValue: parseFloat(item.totalvalue) || 0,
    }));
  }

  /**
   * 📈 Получение недавних движений по складу
   */
  async getRecentMovementsCount(companyId: string, days: number = 7): Promise<number> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return this.stockMovementRepository.count({
      where: {
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
        createdAt: { $gte: dateFrom } as any,
      },
    });
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
   * 🔒 Получение запчасти по ID и компании
   */
  async findPartByIdAndCompany(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { 
        id: partId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: ['category'],
    });
  }

  /**
   * 📦 Bulk операции - получение нескольких позиций
   */
  async findMultipleByCompany(partIds: string[], companyId: string): Promise<Inventory[]> {
    if (partIds.length === 0) return [];

    return this.inventoryRepository.find({
      where: { 
        partId: partIds as any, // TypeORM's In operator
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['part', 'part.category'],
    });
  }

  /**
   * 🔄 Проверка доступности для резервирования
   */
  async checkReservationAvailability(
    partId: string, 
    requestedQuantity: number, 
    companyId: string,
    excludeReservationId?: string
  ): Promise<{
    available: number;
    reserved: number;
    canReserve: boolean;
  }> {
    const inventory = await this.findByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      return {
        available: 0,
        reserved: 0,
        canReserve: false,
      };
    }

    // TODO: Реализовать подсчет резерва из таблицы резервирований
    const reserved = 0; // Заглушка
    const available = Math.max(0, inventory.quantity - reserved);
    
    return {
      available,
      reserved,
      canReserve: available >= requestedQuantity,
    };
  }

  /**
   * ❌ Удаление позиции склада (если количество = 0)
   */
  async remove(id: string): Promise<void> {
    await this.inventoryRepository.delete(id);
  }
}
