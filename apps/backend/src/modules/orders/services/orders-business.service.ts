// src/modules/orders/services/orders-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrdersDataService } from './orders-data.service';
import { Order } from '../../../database/entities';
import { CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';
import { AuditService } from '../../../common/audit/audit.service';
import { 
  OrderStatusTransitionException,
  ValidationDataException 
} from '../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrdersBusinessService {
  private readonly logger = new Logger(OrdersBusinessService.name);

  constructor(
    private readonly ordersDataService: OrdersDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📋 Создание заказа для компании с генерацией номера
   */
  async createOrderForCompany(data: CreateOrderData, companyId: string): Promise<Order> {
    // Генерируем номер заказа
    const orderNumber = await this.ordersDataService.generateOrderNumber(companyId);
    
    // Создаем заказ с номером
    const orderData: CreateOrderData = {
      ...data,
      companyId,
      orderNumber,
    };

    const order = await this.ordersDataService.create(orderData);

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService
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

  /**
   * 📝 Обновление заказа с business logic
   */
  async updateOrder(id: string, data: UpdateOrderData): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    // Если изменяется статус, применяем business rules
    if (data.status && data.status !== order.status) {
      await this.validateStatusTransition(order.status as OrderStatus, data.status);
      
      // Автоматически устанавливаем actualCompletionTime при завершении
      if (data.status === OrderStatus.COMPLETED && order.status !== OrderStatus.COMPLETED) {
        data.actualCompletionTime = new Date();
      }
    }

    const updatedOrder = await this.ordersDataService.update(id, data);

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService
    await this.auditService.logOrderUpdated({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      userId: data.updatedBy || order.createdBy,
      metadata: {
        orderNumber: order.orderNumber,
        changes: this.detectChanges(order, data),
      },
    });

    return updatedOrder;
  }

  /**
   * 🔄 Изменение статуса заказа с workflow logic
   */
  async changeOrderStatus(id: string, newStatus: OrderStatus): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    const oldStatus = order.status as OrderStatus;

    // Валидация перехода статусов
    await this.validateStatusTransition(oldStatus, newStatus);

    // Подготавливаем данные для обновления
    const updateData: UpdateOrderData = { status: newStatus };

    // Business logic для каждого статуса
    switch (newStatus) {
      case OrderStatus.IN_PROGRESS:
        // Проверяем назначение исполнителя
        if (!order.assignedTo) {
          throw new ValidationDataException(
            'assignedTo',
            'Для перевода заказа в работу необходимо назначить исполнителя'
          );
        }
        break;

      case OrderStatus.COMPLETED:
        updateData.actualCompletionTime = new Date();
        break;

      case OrderStatus.CANCELED:
        // При отмене заказа можно добавить логику освобождения ресурсов
        break;
    }

    const updatedOrder = await this.ordersDataService.update(id, updateData);

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService с проверкой статуса
    if (newStatus === OrderStatus.COMPLETED) {
      await this.auditService.logOrderCompleted({
        entityType: 'Order',
        entityId: id,
        companyId: order.companyId,
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

  /**
   * 👤 Назначение механика на заказ
   */
  async assignMechanicToOrder(orderId: string, mechanicId: string): Promise<Order> {
    const order = await this.ordersDataService.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const updatedOrder = await this.ordersDataService.update(orderId, {
      assignedTo: mechanicId,
    });

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService
    await this.auditService.logOrderMechanicAssigned({
      entityType: 'Order',
      entityId: orderId,
      companyId: order.companyId,
      metadata: {
        orderNumber: order.orderNumber,
        mechanicId,
        previousMechanic: order.assignedTo,
      },
    });

    this.logger.log(`Mechanic assigned to order: ${order.orderNumber} → ${mechanicId}`);
    return updatedOrder;
  }

  /**
   * ❌ Отмена заказа
   */
  async cancelOrder(id: string): Promise<void> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    // Проверяем возможность отмены
    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException(
        'status',
        'Нельзя отменить завершенный заказ'
      );
    }

    await this.ordersDataService.update(id, {
      status: OrderStatus.CANCELED,
    });

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService
    await this.auditService.logOrderCanceled({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
      },
    });

    this.logger.log(`Order canceled: ${order.orderNumber}`);
  }

  /**
   * 💰 Пересчет финансов заказа
   */
  async recalculateOrderFinancials(id: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) {
      throw new Error(`Order ${id} not found`);
    }

    // Расчет суммы услуг
    const servicesTotal = order.orderServices?.reduce((sum, orderService) => {
      return sum + parseFloat(orderService.totalAmount.toString());
    }, 0) || 0;

    // Расчет суммы запчастей
    const partsTotal = order.orderParts?.reduce((sum, orderPart) => {
      return sum + parseFloat(orderPart.totalAmount.toString());
    }, 0) || 0;

    const totalAmount = servicesTotal + partsTotal;
    const discountAmount = order.discountAmount || 0;
    const taxAmount = this.calculateTax(totalAmount - discountAmount);
    const finalAmount = totalAmount - discountAmount + taxAmount;

    const updatedOrder = await this.ordersDataService.update(id, {
      totalAmount,
      taxAmount,
      finalAmount,
    });

    // ✅ ИСПРАВЛЕНО: Правильный вызов AuditService
    await this.auditService.logOrderFinancialsRecalculated({
      entityType: 'Order',
      entityId: id,
      companyId: order.companyId,
      metadata: {
        orderNumber: order.orderNumber,
        servicesTotal,
        partsTotal,
        totalAmount,
        finalAmount,
      },
    });

    this.logger.log(`Order financials recalculated: ${order.orderNumber}`);
    return updatedOrder;
  }

  /**
   * ✅ Валидация перехода статусов
   */
  private async validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): Promise<void> {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.AWAITING_PARTS, OrderStatus.COMPLETED, OrderStatus.CANCELED],
      [OrderStatus.AWAITING_PARTS]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
      [OrderStatus.COMPLETED]: [], // Завершенный заказ нельзя изменить
      [OrderStatus.CANCELED]: [], // Отмененный заказ нельзя изменить
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new OrderStatusTransitionException(currentStatus, newStatus);
    }
  }

  /**
   * 💰 Расчет налога (18% НДС по умолчанию)
   */
  private calculateTax(amount: number, taxRate: number = 0.18): number {
    return Math.round(amount * taxRate * 100) / 100;
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: Order, updates: UpdateOrderData): Record<string, any> {
    const changes: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== original[key]) {
        changes[key] = {
          from: original[key],
          to: updates[key],
        };
      }
    });

    return changes;
  }
}
