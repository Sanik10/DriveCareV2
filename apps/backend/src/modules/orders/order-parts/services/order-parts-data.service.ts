// src/modules/orders/order-parts/services/order-parts-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderPart, Order, Part, PartCategory, Inventory } from '../../../../database/entities';
import { AddPartToOrderData, UpdateOrderPartData } from '../types/order-parts.types';

@Injectable()
export class OrderPartsDataService {
  constructor(
    @InjectRepository(OrderPart)
    private readonly orderPartRepository: Repository<OrderPart>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  /**
   * 🔒 Создание записи запчасти в заказе
   */
  async create(data: AddPartToOrderData): Promise<OrderPart> {
    const orderPart = this.orderPartRepository.create(data);
    return this.orderPartRepository.save(orderPart);
  }

  /**
   * 🔒 Поиск всех запчастей заказа
   */
  async findByOrderId(orderId: string): Promise<OrderPart[]> {
    return this.orderPartRepository.find({
      where: { orderId },
      relations: [
        'part',
        'part.category',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 🔒 Поиск запчасти в заказе по ID
   */
  async findById(id: string): Promise<OrderPart | null> {
    return this.orderPartRepository.findOne({
      where: { id },
      relations: [
        'order',
        'part',
        'part.category',
      ],
    });
  }

  /**
   * 🔒 Поиск запчасти в заказе с проверкой принадлежности
   */
  async findByIdAndOrderId(id: string, orderId: string): Promise<OrderPart | null> {
    return this.orderPartRepository.findOne({
      where: { id, orderId },
      relations: [
        'order',
        'part',
        'part.category',
      ],
    });
  }

  /**
   * 🔒 Проверка существования запчасти в заказе
   */
  async existsInOrder(orderId: string, partId: string): Promise<boolean> {
    const count = await this.orderPartRepository.count({
      where: { orderId, partId },
    });
    return count > 0;
  }

  /**
   * 📝 Обновление запчасти в заказе
   */
  async update(id: string, data: UpdateOrderPartData): Promise<OrderPart> {
    await this.orderPartRepository.update(id, data);
    
    const updatedOrderPart = await this.findById(id);
    if (!updatedOrderPart) {
      throw new Error(`OrderPart with id ${id} not found after update`);
    }
    
    return updatedOrderPart;
  }

  /**
   * ❌ Удаление запчасти из заказа
   */
  async remove(id: string): Promise<void> {
    await this.orderPartRepository.delete(id);
  }

  /**
   * 🔒 Получение запчасти по компании (для проверки принадлежности)
   */
  async findPartByIdAndCompany(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { 
        id: partId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность запчасти компании
      },
      relations: ['category'],
    });
  }

  /**
   * 🔒 Получение заказа с проверкой принадлежности
   */
  async findOrderByIdAndCompany(orderId: string, companyId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { 
        id: orderId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность заказа компании
      },
    });
  }

  /**
   * 📦 Получение информации о наличии на складе
   */
  async findInventoryByPartAndCompany(partId: string, companyId: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({
      where: { 
        partId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность инвентаря компании
      },
      relations: ['part'],
    });
  }

  /**
   * 📦 Обновление остатков на складе (резервирование)
   */
  async updateInventoryQuantity(partId: string, companyId: string, quantityChange: number): Promise<void> {
    const inventory = await this.findInventoryByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      // Создаем запись в инвентаре если её нет
      const newInventory = this.inventoryRepository.create({
        partId,
        companyId,
        quantity: Math.max(0, quantityChange), // Не может быть отрицательным
        minQuantity: 0,
      });
      await this.inventoryRepository.save(newInventory);
      return;
    }

    // Обновляем существующую запись
    const newQuantity = Math.max(0, inventory.quantity + quantityChange);
    await this.inventoryRepository.update(inventory.id, {
      quantity: newQuantity,
    });
  }

  /**
   * 📊 Расчет общей стоимости запчастей заказа
   */
  async calculateOrderPartsTotal(orderId: string): Promise<number> {
    const result = await this.orderPartRepository
      .createQueryBuilder('orderPart')
      .select('SUM(orderPart.totalAmount)', 'total')
      .where('orderPart.orderId = :orderId', { orderId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  /**
   * 📊 Получение статистики запчастей заказа
   */
  async getOrderPartsStats(orderId: string): Promise<{
    total: number;
    customerProvided: number;
    ourParts: number;
    totalAmount: number;
    needsInventoryCheck: boolean;
  }> {
    const parts = await this.orderPartRepository.find({
      where: { orderId },
    });

    const stats = parts.reduce((acc, part) => {
      acc.total++;
      if (part.isCustomerProvided) {
        acc.customerProvided++;
      } else {
        acc.ourParts++;
      }
      acc.totalAmount += parseFloat(part.totalAmount.toString());
      return acc;
    }, {
      total: 0,
      customerProvided: 0,
      ourParts: 0,
      totalAmount: 0,
    });

    return {
      ...stats,
      needsInventoryCheck: stats.ourParts > 0,
    };
  }

  /**
   * 📊 Получение запчастей по категориям
   */
  async getPartsByCategory(orderId: string): Promise<Record<string, number>> {
    const parts = await this.orderPartRepository.find({
      where: { orderId },
      relations: ['part', 'part.category'],
    });

    return parts.reduce((acc, part) => {
      const categoryName = part.part?.category?.name || 'Без категории';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 🔒 Получение количества запчасти уже в заказе
   */
  async getPartQuantityInOrder(orderId: string, partId: string): Promise<number> {
    const orderPart = await this.orderPartRepository.findOne({
      where: { orderId, partId },
    });

    return orderPart ? orderPart.quantity : 0;
  }

  /**
   * 📊 Получение списка запчастей требующих пополнения
   */
  async getLowStockParts(companyId: string, orderParts: OrderPart[]): Promise<string[]> {
    const lowStockParts: string[] = [];

    for (const orderPart of orderParts.filter(p => !p.isCustomerProvided)) {
      const inventory = await this.findInventoryByPartAndCompany(orderPart.partId, companyId);
      
      if (!inventory || inventory.quantity <= inventory.minQuantity) {
        lowStockParts.push(orderPart.part?.name || `Part ${orderPart.partId}`);
      }
    }

    return lowStockParts;
  }

  /**
   * 🔒 Bulk операции - получение информации о нескольких запчастях
   */
  async findPartsByIdsAndCompany(partIds: string[], companyId: string): Promise<Part[]> {
    if (partIds.length === 0) return [];

    return this.partRepository.find({
      where: { 
        id: partIds as any, // TypeORM's In operator
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['category'],
    });
  }

  /**
   * 📦 Проверка доступности нескольких запчастей
   */
  async checkMultiplePartsAvailability(
    partQuantities: Array<{ partId: string; quantity: number }>,
    companyId: string
  ): Promise<Array<{ partId: string; available: number; requested: number; sufficient: boolean }>> {
    const results = [];

    for (const { partId, quantity } of partQuantities) {
      const inventory = await this.findInventoryByPartAndCompany(partId, companyId);
      const available = inventory?.quantity || 0;
      
      results.push({
        partId,
        available,
        requested: quantity,
        sufficient: available >= quantity,
      });
    }

    return results;
  }
}
