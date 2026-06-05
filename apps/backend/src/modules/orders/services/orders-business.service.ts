// path: apps/backend/src/modules/orders/services/orders-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrdersDataService } from './orders-data.service';
import { Order } from '../../../database/entities';
import { CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';
import { AuditService } from '../../../common/audit/audit.service';
import { OrderStatusTransitionException, ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { OrdersValidationService } from './orders-validation.service';
import { ORDERS_CONSTANTS } from '../constants/orders.constants';
import { computeOrderTotals } from './pricing-engine';

@Injectable()
export class OrdersBusinessService {
  private readonly logger = new Logger(OrdersBusinessService.name);

  constructor(
    private readonly ordersDataService: OrdersDataService,
    private readonly auditService: AuditService,
    private readonly ordersValidationService: OrdersValidationService,
  ) {}

  async createOrderForCompany(data: CreateOrderData, companyId: string): Promise<Order> {
    const orderNumber = await this.ordersDataService.generateOrderNumber(companyId);
    const orderData: CreateOrderData = { ...data, companyId, orderNumber };
    const order = await this.ordersDataService.create(orderData);

    await this.auditService.logOrderCreated({
      entityType: 'Order',
      entityId: order.id,
      companyId,
      userId: data.createdBy,
      metadata: {
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        vehicleId: order.vehicleId,
        status: order.status,
      },
    });

    this.logger.log(`Order created for company ${companyId}: ${order.orderNumber}`);
    return order;
  }

  async updateOrder(id: string, data: UpdateOrderData, actorUserId: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    // Статус — по правилам переходов
    if (data.status && data.status !== order.status) {
      await this.ordersValidationService.validateStatusTransition(order.status as OrderStatus, data.status);
      if (data.status === OrderStatus.COMPLETED && order.status !== OrderStatus.COMPLETED) {
        data.actualCompletionTime = new Date();
      }
    }

    // Массовое обновление — только whitelist полей
    const sanitized = this.sanitizeUpdateData({ ...data, updatedBy: actorUserId });

    const updatedOrder = await this.ordersDataService.update(id, sanitized);

    await this.auditService.logOrderUpdated({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      userId: actorUserId,
      metadata: {
        orderNumber: order.orderNumber,
        changes: this.detectChanges(order, sanitized),
      },
    });

    return updatedOrder;
  }

  async changeOrderStatus(id: string, newStatus: OrderStatus, actorUserId: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    const oldStatus = order.status as OrderStatus;
    await this.ordersValidationService.validateStatusTransition(oldStatus, newStatus);

    const updateData: UpdateOrderData = { status: newStatus, updatedBy: actorUserId };

    switch (newStatus) {
      case OrderStatus.IN_PROGRESS:
        if (!order.assignedTo) {
          throw new ValidationDataException('assignedTo', 'Для перевода заказа в работу необходимо назначить исполнителя');
        }
        break;
      case OrderStatus.COMPLETED:
        updateData.actualCompletionTime = new Date();
        break;
      case OrderStatus.CANCELED:
        break;
    }

    const updatedOrder = await this.ordersDataService.update(id, updateData);

    if (newStatus === OrderStatus.COMPLETED) {
      await this.auditService.logOrderCompleted({
        entityType: 'Order',
        entityId: id,
        companyId: order.companyId,
        userId: actorUserId,
        metadata: {
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus,
          completedAt: updateData.actualCompletionTime,
        },
      });
    } else {
      await this.auditService.logOrderStatusChanged({
        entityType: 'Order',
        entityId: id,
        companyId: order.companyId,
        userId: actorUserId,
        metadata: {
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus,
        },
      });
    }

    this.logger.log(`Order status changed: ${order.orderNumber} ${oldStatus} → ${newStatus}`);
    return updatedOrder;
  }

  async assignMechanicToOrder(orderId: string, mechanicId: string, actorUserId: string): Promise<Order> {
    const order = await this.ordersDataService.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const updatedOrder = await this.ordersDataService.update(orderId, {
      assignedTo: mechanicId,
      updatedBy: actorUserId,
    });

    await this.auditService.logOrderMechanicAssigned({
      entityType: 'Order',
      entityId: orderId,
      companyId: order.companyId,
      userId: actorUserId,
      metadata: {
        orderNumber: order.orderNumber,
        mechanicId,
        previousMechanic: order.assignedTo,
      },
    });

    this.logger.log(`Mechanic assigned to order: ${order.orderNumber} → ${mechanicId}`);
    return updatedOrder;
  }

  async cancelOrder(id: string, actorUserId: string): Promise<void> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }
    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException('status', 'Нельзя отменить завершенный заказ');
    }

    await this.ordersDataService.update(id, { status: OrderStatus.CANCELED, updatedBy: actorUserId });

    await this.auditService.logOrderCanceled({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      userId: actorUserId,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
      },
    });

    this.logger.log(`Order canceled: ${order.orderNumber}`);
  }

  async recalculateOrderFinancials(id: string, actorUserId: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    const pricing = computeOrderTotals(order);

    // 🔥 ЗАЩИТА ОТ NaN / undefined / Infinity
    const safe = (val: any) => {
      const n = Number(val);
      return isFinite(n) ? n : 0;
    };

    const updatedOrder = await this.ordersDataService.update(id, {
      totalAmount: safe(pricing.subtotal),
      taxAmount: safe(pricing.taxAmount),
      finalAmount: safe(pricing.finalAmount),
      updatedBy: actorUserId,
    });

    await this.auditService.logOrderFinancialsRecalculated({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      userId: actorUserId,
      metadata: {
        orderNumber: order.orderNumber,
        servicesTotal: safe(pricing.servicesTotal),
        partsTotal: safe(pricing.partsTotal),
        subtotal: safe(pricing.subtotal),
        discountAmount: safe(pricing.discountAmount),
        taxAmount: safe(pricing.taxAmount),
        finalAmount: safe(pricing.finalAmount),
        taxRate: pricing.rates?.taxRate ?? 0,
      },
    });

    this.logger.log(`Order financials recalculated: ${order.orderNumber}`);
    return updatedOrder;
  }

  private sanitizeUpdateData(data: UpdateOrderData): UpdateOrderData {
    const allowed = new Set(ORDERS_CONSTANTS.ALLOWED_UPDATE_FIELDS);
    const sanitized: UpdateOrderData = { updatedBy: data.updatedBy };
    Object.entries(data).forEach(([k, v]) => {
      if (allowed.has(k as any)) {
        (sanitized as any)[k] = v;
      }
    });
    return sanitized;
  }

  // Kept for backwards compatibility (not used by new pricing engine directly)
  private calculateTax(amount: number): number {
    const rate = ORDERS_CONSTANTS.DEFAULTS.TAX_RATE;
    return Math.round(amount * rate * 100) / 100;
  }

  private detectChanges(original: Order, updates: UpdateOrderData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if ((updates as any)[key] !== (original as any)[key]) {
        changes[key] = {
          from: (original as any)[key],
          to: (updates as any)[key],
        };
      }
    });
    return changes;
  }
}
