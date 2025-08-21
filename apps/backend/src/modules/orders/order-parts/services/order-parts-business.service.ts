// src/modules/orders/order-parts/services/order-parts-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderPartsDataService } from './order-parts-data.service';
import { OrderPart } from '../../../../database/entities';
import { AddPartToOrderData, UpdateOrderPartData } from '../types/order-parts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { ValidationDataException, OrderPartNotFoundException } from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrderPartsBusinessService {
  private readonly logger = new Logger(OrderPartsBusinessService.name);

  constructor(
    private readonly orderPartsDataService: OrderPartsDataService,
    private readonly auditService: AuditService,
  ) {}

  async addPartToOrder(orderId: string, data: AddPartToOrderData, user: RequestWithUser['user']): Promise<OrderPart> {
    this.logger.log(`Adding part ${data.partId} to order ${orderId}`);

    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) throw new ValidationDataException('orderId', 'Заказ не найден или принадлежит другой компании');

    const part = await this.orderPartsDataService.findPartByIdAndCompany(data.partId, user.companyId);
    if (!part) throw new ValidationDataException('partId', `Запчасть ${data.partId} не найдена или не принадлежит компании`);

    const quantity = data.quantity || 1;
    const discountPercent = data.discountPercent || 0;

    let basePrice: number;
    let totalAmount: number;

    if (data.isCustomerProvided) {
      basePrice = data.customPrice || 0;
      totalAmount = basePrice * quantity;
    } else {
      basePrice = data.customPrice || parseFloat(part.sellingPrice.toString());
      const subtotal = basePrice * quantity;
      const discountAmount = subtotal * (discountPercent / 100);
      totalAmount = subtotal - discountAmount;

      await this.reservePartFromInventory(data.partId, quantity, user.companyId);
    }

    const orderPartData: AddPartToOrderData = {
      orderId,
      partId: data.partId,
      price: basePrice,
      quantity,
      discountPercent,
      totalAmount,
      isCustomerProvided: !!data.isCustomerProvided,
    };

    const orderPart = await this.orderPartsDataService.create(orderPartData);

    await this.auditService.log(AuditAction.ORDER_PART_ADDED, {
      entityType: 'OrderPart',
      entityId: orderPart.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        orderId,
        partId: data.partId,
        partName: part.name,
        quantity,
        totalAmount,
        basePrice,
        discountPercent,
        isCustomerProvided: !!data.isCustomerProvided,
        inventoryReserved: !data.isCustomerProvided,
      },
    });

    this.logger.log(`Part added to order: ${orderPart.id}`);
    return orderPart;
  }

  async updateOrderPart(id: string, data: UpdateOrderPartData): Promise<OrderPart> {
    this.logger.log(`Updating order part: ${id}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) throw new OrderPartNotFoundException(id);

    const oldQuantity = orderPart.quantity;
    const newQuantity = data.quantity ?? oldQuantity;
    const quantityDiff = newQuantity - oldQuantity;

    let updateData = { ...data };

    if (data.quantity !== undefined || data.price !== undefined || data.discountPercent !== undefined) {
      const quantity = newQuantity;
      const price = data.price ?? parseFloat(orderPart.price.toString());
      const discountPercent = data.discountPercent ?? parseFloat(orderPart.discountPercent.toString());

      if (orderPart.isCustomerProvided) {
        updateData.totalAmount = price * quantity;
      } else {
        const subtotal = price * quantity;
        const discountAmount = subtotal * (discountPercent / 100);
        updateData.totalAmount = subtotal - discountAmount;
      }
    }

    if (quantityDiff !== 0 && !orderPart.isCustomerProvided) {
      await this.updateInventoryReservation(orderPart.partId, quantityDiff, orderPart.order?.companyId!);
    }

    const updatedOrderPart = await this.orderPartsDataService.update(id, updateData);

    await this.auditService.log(AuditAction.ORDER_PART_UPDATED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        changes: this.detectChanges(orderPart, updateData),
        quantityChanged: quantityDiff !== 0,
        inventoryAdjusted: quantityDiff !== 0 && !orderPart.isCustomerProvided,
      },
    });

    this.logger.log(`Order part updated: ${id}`);
    return updatedOrderPart;
  }

  async toggleCustomerProvided(id: string, isCustomerProvided: boolean): Promise<OrderPart> {
    this.logger.log(`Toggling customer provided for part ${id}: ${isCustomerProvided}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) throw new OrderPartNotFoundException(id);

    const oldValue = orderPart.isCustomerProvided;

    if (oldValue === isCustomerProvided) return orderPart;

    if (isCustomerProvided && !oldValue) {
      await this.releaseInventoryReservation(orderPart.partId, orderPart.quantity, orderPart.order?.companyId!);
    } else if (!isCustomerProvided && oldValue) {
      await this.reservePartFromInventory(orderPart.partId, orderPart.quantity, orderPart.order?.companyId!);
    }

    let newPrice = parseFloat(orderPart.price.toString());
    let newTotalAmount: number;

    if (isCustomerProvided) {
      newPrice = 0;
      newTotalAmount = 0;
    } else {
      const part = await this.orderPartsDataService.findPartByIdAndCompany(orderPart.partId, orderPart.order?.companyId!);
      newPrice = part ? parseFloat(part.sellingPrice.toString()) : newPrice;

      const subtotal = newPrice * orderPart.quantity;
      const discountAmount = subtotal * (parseFloat(orderPart.discountPercent.toString()) / 100);
      newTotalAmount = subtotal - discountAmount;
    }

    const updatedOrderPart = await this.orderPartsDataService.update(id, {
      isCustomerProvided,
      price: newPrice,
      totalAmount: newTotalAmount,
    });

    await this.auditService.log(AuditAction.ORDER_PART_UPDATED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        action: 'toggle_customer_provided',
        oldValue,
        newValue: isCustomerProvided,
        priceRecalculated: true,
        inventoryAdjusted: true,
      },
    });

    this.logger.log(`Customer provided toggled for part: ${id} → ${isCustomerProvided}`);
    return updatedOrderPart;
  }

  async removePartFromOrder(id: string): Promise<void> {
    this.logger.log(`Removing part from order: ${id}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) throw new OrderPartNotFoundException(id);

    if (!orderPart.isCustomerProvided) {
      await this.releaseInventoryReservation(orderPart.partId, orderPart.quantity, orderPart.order?.companyId!);
    }

    await this.orderPartsDataService.remove(id);

    await this.auditService.log(AuditAction.ORDER_PART_REMOVED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        partName: orderPart.part?.name,
        quantity: orderPart.quantity,
        isCustomerProvided: orderPart.isCustomerProvided,
        inventoryReleased: !orderPart.isCustomerProvided,
      },
    });

    this.logger.log(`Part removed from order: ${id}`);
  }

  async checkPartAvailability(
    orderId: string,
    partId: string,
    user: RequestWithUser['user'],
  ): Promise<{ partId: string; available: number; reserved: number; canAddToOrder: boolean; maxQuantity: number }> {
    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) throw new ValidationDataException('orderId', 'Заказ не найден');

    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(partId, user.companyId);
    const available = inventory?.quantity || 0;
    const alreadyInOrder = await this.orderPartsDataService.getPartQuantityInOrder(orderId, partId);

    return {
      partId,
      available,
      reserved: 0,
      canAddToOrder: available > alreadyInOrder,
      maxQuantity: Math.max(0, available - alreadyInOrder),
    };
  }

  private async reservePartFromInventory(partId: string, quantity: number, companyId: string): Promise<void> {
    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(partId, companyId);
    if (!inventory) throw new ValidationDataException('partId', `Запчасть ${partId} не найдена на складе`);
    if (inventory.quantity < quantity) {
      throw new ValidationDataException('quantity', `Недостаточно запчастей на складе. Доступно: ${inventory.quantity}, требуется: ${quantity}`);
    }
    await this.orderPartsDataService.updateInventoryQuantity(partId, companyId, -quantity);
  }

  private async releaseInventoryReservation(partId: string, quantity: number, companyId: string): Promise<void> {
    await this.orderPartsDataService.updateInventoryQuantity(partId, companyId, quantity);
  }

  private async updateInventoryReservation(partId: string, quantityChange: number, companyId: string): Promise<void> {
    if (quantityChange > 0) await this.reservePartFromInventory(partId, quantityChange, companyId);
    if (quantityChange < 0) await this.releaseInventoryReservation(partId, Math.abs(quantityChange), companyId);
  }

  private detectChanges(original: OrderPart, updates: UpdateOrderPartData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if ((updates as any)[key] !== (original as any)[key]) {
        changes[key] = { from: (original as any)[key], to: (updates as any)[key] };
      }
    });
    return changes;
  }
}
