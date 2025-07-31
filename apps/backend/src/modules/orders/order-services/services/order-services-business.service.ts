import { Injectable, Logger } from '@nestjs/common';
import { OrderServicesDataService } from './order-services-data.service';
import { OrderService } from '../../../../database/entities';
import { AddServiceToOrderData, UpdateOrderServiceData } from '../types/order-services.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { OrderServiceStatus } from '../../../../database/entities/order-service.entity';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service'; // 🔥 ИСПРАВЛЕНО: добавлен AuditAction
import { 
  ValidationDataException,
  OrderServiceNotFoundException
} from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrderServicesBusinessService {
  private readonly logger = new Logger(OrderServicesBusinessService.name);

  constructor(
    private readonly orderServicesDataService: OrderServicesDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📋 Добавление услуги в заказ с автоматическим расчетом стоимости
   */
  async addServiceToOrder(
    orderId: string, 
    data: AddServiceToOrderData, 
    user: RequestWithUser['user']
  ): Promise<OrderService> {
    this.logger.log(`Adding service ${data.serviceId} to order ${orderId}`);

    // Получаем информацию об услуге для расчета стоимости
    const service = await this.orderServicesDataService.findServiceByIdAndCompany(
      data.serviceId, 
      user.companyId
    );

    if (!service) {
      throw new ValidationDataException(
        'serviceId',
        `Услуга ${data.serviceId} не найдена или не принадлежит компании`
      );
    }

    // 🔥 ИСПРАВЛЕНО: Правильная обработка customPrice
    const basePrice = data.customPrice || parseFloat(service.price.toString());
    const quantity = data.quantity || 1;
    const discountPercent = data.discountPercent || 0;
    
    const subtotal = basePrice * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalAmount = subtotal - discountAmount;

    // Создание записи услуги в заказе
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

    // 🔥 ИСПРАВЛЕНО: Используем правильный AuditAction
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

    this.logger.log(`Service added to order: ${orderService.id}`);
    return orderService;
  }

  /**
   * 📝 Обновление услуги в заказе с пересчетом стоимости
   */
  async updateOrderService(id: string, data: UpdateOrderServiceData): Promise<OrderService> {
    this.logger.log(`Updating order service: ${id}`);

    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) {
      throw new OrderServiceNotFoundException(id);
    }

    // Пересчет стоимости при изменении количества, цены или скидки
    let updateData = { ...data };

    if (data.quantity !== undefined || data.price !== undefined || data.discountPercent !== undefined) {
      const quantity = data.quantity ?? orderService.quantity;
      const price = data.price ?? parseFloat(orderService.price.toString());
      const discountPercent = data.discountPercent ?? parseFloat(orderService.discountPercent.toString());

      const subtotal = price * quantity;
      const discountAmount = subtotal * (discountPercent / 100);
      const totalAmount = subtotal - discountAmount;

      updateData = {
        ...updateData,
        totalAmount,
      };
    }

    const updatedOrderService = await this.orderServicesDataService.update(id, updateData);

    // 🔥 ИСПРАВЛЕНО: Используем правильный AuditAction
    await this.auditService.log(AuditAction.ORDER_SERVICE_UPDATED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        changes: this.detectChanges(orderService, updateData),
      },
    });

    this.logger.log(`Order service updated: ${id}`);
    return updatedOrderService;
  }

  /**
   * 🔄 Изменение статуса услуги с workflow логикой
   */
  async updateServiceStatus(
    id: string, 
    newStatus: OrderServiceStatus, 
    user: RequestWithUser['user']
  ): Promise<OrderService> {
    this.logger.log(`Updating service status: ${id} → ${newStatus}`);

    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) {
      throw new OrderServiceNotFoundException(id);
    }

    const oldStatus = orderService.status;

    // Валидация перехода статусов
    this.validateStatusTransition(oldStatus, newStatus);

    // Подготовка данных для обновления в зависимости от статуса
    const updateData: UpdateOrderServiceData = { status: newStatus };

    switch (newStatus) {
      case OrderServiceStatus.IN_PROGRESS:
        updateData.startTime = new Date();
        // Автоматически назначаем текущего пользователя как механика, если не назначен
        if (!orderService.mechanicId && user.role === 'mechanic') {
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

    // 🔥 ИСПРАВЛЕНО: Используем правильный AuditAction
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

    this.logger.log(`Service status updated: ${id} ${oldStatus} → ${newStatus}`);
    return updatedOrderService;
  }

  /**
   * 👤 Назначение механика на услугу
   */
  async assignMechanicToService(id: string, mechanicId: string): Promise<OrderService> {
    this.logger.log(`Assigning mechanic ${mechanicId} to service ${id}`);

    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) {
      throw new OrderServiceNotFoundException(id);
    }

    const updatedOrderService = await this.orderServicesDataService.update(id, {
      mechanicId,
    });

    // 🔥 ИСПРАВЛЕНО: Используем правильный AuditAction
    await this.auditService.log(AuditAction.ORDER_SERVICE_UPDATED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        mechanicId,
        previousMechanic: orderService.mechanicId,
        action: 'mechanic_assigned',
      },
    });

    this.logger.log(`Mechanic assigned to service: ${id} → ${mechanicId}`);
    return updatedOrderService;
  }

  /**
   * ▶️ Начало выполнения услуги
   */
  async startService(id: string, user: RequestWithUser['user']): Promise<OrderService> {
    return this.updateServiceStatus(id, OrderServiceStatus.IN_PROGRESS, user);
  }

  /**
   * ✅ Завершение выполнения услуги
   */
  async completeService(
    id: string, 
    notes?: string, 
    user?: RequestWithUser['user']
  ): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) {
      throw new OrderServiceNotFoundException(id);
    }

    // Сначала завершаем услугу
    const updatedOrderService = await this.updateServiceStatus(
      id, 
      OrderServiceStatus.COMPLETED, 
      user!
    );

    // Добавляем заметки если есть
    if (notes) {
      await this.orderServicesDataService.update(id, { notes });
    }

    return updatedOrderService;
  }

  /**
   * ❌ Удаление услуги из заказа
   */
  async removeServiceFromOrder(id: string): Promise<void> {
    this.logger.log(`Removing service from order: ${id}`);

    const orderService = await this.orderServicesDataService.findById(id);
    if (!orderService) {
      throw new OrderServiceNotFoundException(id);
    }

    // Проверяем что услугу можно удалить
    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException(
        'status',
        'Нельзя удалить завершенную услугу'
      );
    }

    await this.orderServicesDataService.remove(id);

    // 🔥 ИСПРАВЛЕНО: Используем правильный AuditAction
    await this.auditService.log(AuditAction.ORDER_SERVICE_REMOVED, {
      entityType: 'OrderService',
      entityId: id,
      companyId: orderService.order?.companyId,
      metadata: {
        orderId: orderService.orderId,
        serviceId: orderService.serviceId,
        serviceName: orderService.service?.name,
        status: orderService.status,
      },
    });

    this.logger.log(`Service removed from order: ${id}`);
  }

  /**
   * ✅ Валидация перехода статусов
   */
  private validateStatusTransition(current: OrderServiceStatus, target: OrderServiceStatus): void {
    const allowedTransitions: Record<OrderServiceStatus, OrderServiceStatus[]> = {
      [OrderServiceStatus.PLANNED]: [OrderServiceStatus.IN_PROGRESS],
      [OrderServiceStatus.IN_PROGRESS]: [OrderServiceStatus.COMPLETED, OrderServiceStatus.PLANNED],
      [OrderServiceStatus.COMPLETED]: [], // Завершенную услугу нельзя изменить
    };

    if (!allowedTransitions[current]?.includes(target)) {
      throw new ValidationDataException(
        'status',
        `Недопустимый переход статуса: ${current} → ${target}`
      );
    }
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: OrderService, updates: UpdateOrderServiceData): Record<string, any> {
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
