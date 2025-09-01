// path: apps/backend/src/modules/orders/order-services/services/order-services-business.service.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OrderServicesDataService } from './order-services-data.service';
import { OrderService } from '../../../../database/entities';
import { AddServiceToOrderData, UpdateOrderServiceData } from '../types/order-services.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { OrderServiceStatus } from '../../../../database/entities/order-service.entity';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { ValidationDataException, OrderServiceNotFoundException } from '../../../../common/exceptions/domain.exceptions';
import { OrdersBusinessService } from '../../services/orders-business.service';

@Injectable()
export class OrderServicesBusinessService {
  private readonly logger = new Logger(OrderServicesBusinessService.name);

  constructor(
    private readonly orderServicesDataService: OrderServicesDataService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => OrdersBusinessService))
    private readonly ordersBusinessService: OrdersBusinessService,
  ) {}

  async addServiceToOrder(
    orderId: string,
    data: AddServiceToOrderData,
    user: RequestWithUser['user'],
  ): Promise<OrderService> {
    this.logger.log(`Adding service ${data.serviceId} to order ${orderId}`);

    const service = await this.orderServicesDataService.findServiceByIdAndCompany(data.serviceId, user.companyId);
    if (!service) {
      throw new ValidationDataException('serviceId', `Услуга ${data.serviceId} не найдена или не принадлежит компании`);
    }

    const basePrice = data.customPrice || parseFloat(service.price.toString());
    const quantity = data.quantity || 1;
    const discountPercent = data.discountPercent || 0;

    const subtotal = basePrice * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalAmount = subtotal - discountAmount;

    const orderServiceData: AddServiceToOrderData = {
      orderId,
      serviceId: data.serviceId,
      price: basePrice,
      quantity,
      discountPercent,
      totalAmount,
      status: OrderServiceStatus.PLANNED,
      mechanicId: data.mechanicId || null,
      notes: data.notes || null,
    };

    const orderService = await this.orderServicesDataService.create(orderServiceData);

    await this.auditService.log(AuditAction.ORDER_SERVICE_ADDED, {
      entityType: 'OrderService',
      entityId: orderService.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        orderId,
        serviceId: data.serviceId,
        serviceName: service.name,
        quantity,
        totalAmount,
        basePrice,
        discountPercent,
      },
    });

    // Recalculate order totals
    try {
      await this.ordersBusinessService.recalculateOrderFinancials(orderId, user.id);
    } catch (e: any) {
      this.logger.error(`Recalculate after addServiceToOrder failed (order ${orderId}): ${e?.message || e}`);
    }

    this.logger.log(`Service added to order: ${orderService.id}`);
    return orderService;
  }

  async updateOrderService(
    id: string,
    data: UpdateOrderServiceData,
    user?: RequestWithUser['user'],
  ): Promise<OrderService> {
    this.logger.log(`Updating order service: ${id}`);
    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) throw new OrderServiceNotFoundException(id);

    let updateData = { ...data };
    if (data.quantity !== undefined || data.price !== undefined || data.discountPercent !== undefined) {
      const quantity = data.quantity ?? orderService.quantity;
      const price = data.price ?? parseFloat(orderService.price.toString());
      const discountPercent = data.discountPercent ?? parseFloat(orderService.discountPercent.toString());
      const subtotal = price * quantity;
      const discountAmount = subtotal * (discountPercent / 100);
      updateData.totalAmount = subtotal - discountAmount;
    }

    const updated = await this.orderServicesDataService.update(id, updateData);

    await this.auditService.log(AuditAction.ORDER_SERVICE_UPDATED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      userId: user?.id,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        changes: this.detectChanges(orderService, updateData),
      },
    });

    // Recalculate order totals
    try {
      await this.ordersBusinessService.recalculateOrderFinancials(orderService.orderId, user?.id || 'system');
    } catch (e: any) {
      this.logger.error(`Recalculate after updateOrderService failed (order ${orderService.orderId}): ${e?.message || e}`);
    }

    return updated;
  }

  async updateServiceStatus(id: string, newStatus: OrderServiceStatus, user: RequestWithUser['user']): Promise<OrderService> {
    this.logger.log(`Updating service status: ${id} → ${newStatus}`);
    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) throw new OrderServiceNotFoundException(id);

    const oldStatus = orderService.status;
    this.validateStatusTransition(oldStatus, newStatus);

    const updateData: UpdateOrderServiceData = { status: newStatus };

    switch (newStatus) {
      case OrderServiceStatus.IN_PROGRESS:
        updateData.startTime = new Date();
        if (!orderService.mechanicId && (user.role === 'mechanic' || user.role === 'lead_mechanic')) {
          updateData.mechanicId = user.id;
        }
        break;
      case OrderServiceStatus.COMPLETED:
        if (!orderService.startTime) {
          updateData.startTime = new Date();
        }
        updateData.endTime = new Date();
        break;
    }

    const updatedOrderService = await this.orderServicesDataService.update(id, updateData);

    await this.auditService.log(AuditAction.ORDER_SERVICE_STATUS_CHANGED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      userId: user.id,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        oldStatus,
        newStatus,
        mechanicId: updatedOrderService.mechanicId,
      },
    });

    this.logger.log(`Service status changed: ${id} ${oldStatus} → ${newStatus}`);
    return updatedOrderService;
  }

  async assignMechanicToService(id: string, mechanicId: string, user?: RequestWithUser['user']): Promise<OrderService> {
    this.logger.log(`Assigning mechanic ${mechanicId} to service ${id}`);
    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) throw new OrderServiceNotFoundException(id);

    const updated = await this.orderServicesDataService.update(id, { mechanicId });

    await this.auditService.log(AuditAction.ORDER_SERVICE_UPDATED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      userId: user?.id,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        mechanicId,
        previousMechanic: orderService.mechanicId,
        action: 'mechanic_assigned',
      },
    });

    this.logger.log(`Mechanic assigned to service: ${id} → ${mechanicId}`);
    return updated;
  }

  async startService(id: string, user: RequestWithUser['user']): Promise<OrderService> {
    return this.updateServiceStatus(id, OrderServiceStatus.IN_PROGRESS, user);
  }

  async completeService(id: string, notes: string | undefined, user: RequestWithUser['user']): Promise<OrderService> {
    const updated = await this.updateServiceStatus(id, OrderServiceStatus.COMPLETED, user);
    if (notes) {
      await this.orderServicesDataService.update(id, { notes });
    }
    return updated;
  }

  async removeServiceFromOrder(id: string, user?: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Removing service from order: ${id}`);
    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) throw new OrderServiceNotFoundException(id);

    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException('status', 'Нельзя удалить завершенную услугу');
    }

    const orderId = orderService.orderId;

    await this.orderServicesDataService.remove(id);

    await this.auditService.log(AuditAction.ORDER_SERVICE_REMOVED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      userId: user?.id,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        serviceName: orderService.service?.name,
        status: orderService.status,
      },
    });

    // Recalculate order totals
    try {
      await this.ordersBusinessService.recalculateOrderFinancials(orderId, user?.id || 'system');
    } catch (e: any) {
      this.logger.error(`Recalculate after removeServiceFromOrder failed (order ${orderId}): ${e?.message || e}`);
    }

    this.logger.log(`Service removed from order: ${id}`);
  }

  private validateStatusTransition(current: OrderServiceStatus, target: OrderServiceStatus): void {
    const allowedTransitions: Record<OrderServiceStatus, OrderServiceStatus[]> = {
      [OrderServiceStatus.PLANNED]: [OrderServiceStatus.IN_PROGRESS],
      [OrderServiceStatus.IN_PROGRESS]: [OrderServiceStatus.COMPLETED, OrderServiceStatus.PLANNED],
      [OrderServiceStatus.COMPLETED]: [],
    };
    if (!allowedTransitions[current]?.includes(target)) {
      throw new ValidationDataException('status', `Недопустимый переход статуса: ${current} → ${target}`);
    }
  }

  private detectChanges(original: OrderService, updates: UpdateOrderServiceData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if ((updates as any)[key] !== (original as any)[key]) {
        changes[key] = { from: (original as any)[key], to: (updates as any)[key] };
      }
    });
    return changes;
  }
}
