// src/modules/orders/order-parts/services/order-parts-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { OrderPart, Order, Part, Inventory } from '../../../../database/entities';
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
   * Создание записи запчасти в заказе
   */
  async create(data: AddPartToOrderData): Promise<OrderPart> {
    const orderPart = this.orderPartRepository.create(data as DeepPartial<OrderPart>);
    return this.orderPartRepository.save(orderPart);
  }

  /**
   * Все запчасти заказа
   */
  async findByOrderId(orderId: string): Promise<OrderPart[]> {
    return this.orderPartRepository.find({
      where: { orderId },
      relations: ['part', 'part.category'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Запчасть по ID
   */
  async findById(id: string): Promise<OrderPart | null> {
    return this.orderPartRepository.findOne({
      where: { id },
      relations: ['order', 'part', 'part.category'],
    });
  }

  /**
   * Запчасть по ID и заказу
   */
  async findByIdAndOrderId(id: string, orderId: string): Promise<OrderPart | null> {
    return this.orderPartRepository.findOne({
      where: { id, orderId },
      relations: ['order', 'part', 'part.category'],
    });
  }

  /**
   * Проверка наличия запчасти в заказе
   */
  async existsInOrder(orderId: string, partId: string): Promise<boolean> {
    const count = await this.orderPartRepository.count({ where: { orderId, partId } });
    return count > 0;
  }

  /**
   * Обновление запчасти в заказе
   */
  async update(id: string, data: UpdateOrderPartData): Promise<OrderPart> {
    await this.orderPartRepository.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`OrderPart with id ${id} not found after update`);
    return updated;
  }

  /**
   * Удаление запчасти из заказа
   */
  async remove(id: string): Promise<void> {
    await this.orderPartRepository.delete(id);
  }

  /**
   * Запчасть по компании (проверка принадлежности)
   */
  async findPartByIdAndCompany(partId: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id: partId, companyId },
      relations: ['category'],
    });
  }

  /**
   * Заказ по компании (проверка принадлежности)
   */
  async findOrderByIdAndCompany(orderId: string, companyId: string): Promise<Order | null> {
    return this.orderRepository.findOne({ where: { id: orderId, companyId } });
  }

  /**
   * Инвентарь по запчасти и компании
   */
  async findInventoryByPartAndCompany(partId: string, companyId: string): Promise<Inventory | null> {
    return this.inventoryRepository.findOne({ where: { partId, companyId }, relations: ['part'] });
  }

  /**
   * Обновление остатков (резерв/освобождение)
   */
  async updateInventoryQuantity(partId: string, companyId: string, quantityChange: number): Promise<void> {
    const inventory = await this.findInventoryByPartAndCompany(partId, companyId);
    if (!inventory) {
      const newInv = this.inventoryRepository.create({
        partId,
        companyId,
        quantity: Math.max(0, quantityChange),
        minQuantity: 0,
      } as any);
      await this.inventoryRepository.save(newInv);
      return;
    }
    const newQuantity = Math.max(0, inventory.quantity + quantityChange);
    await this.inventoryRepository.update(inventory.id, { quantity: newQuantity } as any);
  }

  /**
   * Количество запчасти уже в заказе
   */
  async getPartQuantityInOrder(orderId: string, partId: string): Promise<number> {
    const op = await this.orderPartRepository.findOne({ where: { orderId, partId } });
    return op ? op.quantity : 0;
  }

  /**
   * Частичная загрузка нескольких запчастей по списку id (с принадлежностью компании)
   */
  async findPartsByIdsAndCompany(partIds: string[], companyId: string): Promise<Part[]> {
    if (partIds.length === 0) return [];
    return this.partRepository.find({
      where: { id: In(partIds), companyId } as any,
      relations: ['category'],
    });
  }

  /**
   * Проверка доступности нескольких запчастей
   */
  async checkMultiplePartsAvailability(
    partQuantities: Array<{ partId: string; quantity: number }>,
    companyId: string,
  ): Promise<Array<{ partId: string; available: number; requested: number; sufficient: boolean }>> {
    const results = [];
    for (const { partId, quantity } of partQuantities) {
      const inv = await this.findInventoryByPartAndCompany(partId, companyId);
      const available = inv?.quantity || 0;
      results.push({ partId, available, requested: quantity, sufficient: available >= quantity });
    }
    return results;
  }

  /**
   * Агрегаты по запчастям заказа (для OrderPartsListResponseDto)
   */
  async getOrderPartsStats(orderId: string): Promise<{
    total: number;
    customerProvided: number;
    ourParts: number;
    totalAmount: number;
    needsInventoryCheck: boolean;
  }> {
    const parts = await this.findByOrderId(orderId);

    const stats = parts.reduce(
      (acc, p) => {
        acc.total += 1;
        if (p.isCustomerProvided) acc.customerProvided += 1;
        else acc.ourParts += 1;
        acc.totalAmount += parseFloat(p.totalAmount.toString() || '0');
        return acc;
      },
      { total: 0, customerProvided: 0, ourParts: 0, totalAmount: 0 },
    );

    return {
      ...stats,
      totalAmount: Math.round(stats.totalAmount * 100) / 100,
      needsInventoryCheck: stats.ourParts > 0,
    };
  }

  /**
   * Распределение по категориям
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
}
