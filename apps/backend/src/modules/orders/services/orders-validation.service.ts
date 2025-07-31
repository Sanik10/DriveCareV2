// src/modules/orders/services/orders-validation.service.ts
import { Injectable } from '@nestjs/common';
import { OrdersDataService } from './orders-data.service';
import { Order, Customer, Vehicle, User } from '../../../database/entities';
import { CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service'; // 🔥 ДОБАВЛЕНО
import { 
  OrderNotFoundException,
  OrderStatusTransitionException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrdersValidationService {
  constructor(
    private readonly ordersDataService: OrdersDataService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService, // 🔥 ДОБАВЛЕНО
  ) {}

  /**
   * 🔒 Валидация создания заказа для пользователя
   */
  async validateCreateDataForUser(data: CreateOrderData, user: RequestWithUser['user']): Promise<void> {
    // Проверяем что пользователь создает заказ для своей компании
    if (data.companyId && data.companyId !== user.companyId) {
      throw new ValidationDataException(
        'companyId',
        `Нельзя создавать заказы для чужой компании ${data.companyId}`
      );
    }

    // Устанавливаем companyId пользователя, если не указан
    if (!data.companyId) {
      data.companyId = user.companyId;
    }

    // Проверяем что создатель является сотрудником компании
    if (data.createdBy !== user.id) {
      throw new ValidationDataException(
        'createdBy',
        'Заказ может создать только текущий пользователь'
      );
    }

    // 🔥 ДОБАВЛЕНО: Проверка лимитов подписки
    await this.validateSubscriptionLimits(user.companyId);

    // Валидация бизнес-правил
    await this.validateBusinessRules(data);
  }

  /**
   * 🔒 Проверка лимитов подписки перед созданием заказа
   */
  private async validateSubscriptionLimits(companyId: string): Promise<void> {
    try {
      // Получаем текущее количество заказов компании
      const currentOrdersCount = await this.ordersDataService.getOrdersCountForCompany(companyId);
      
      // Проверяем лимит заказов
      const limitCheckResult = await this.subscriptionLimitsService.checkOrderLimit(
        companyId, 
        currentOrdersCount, 
        1
      );

      if (!limitCheckResult.allowed) {
        if (limitCheckResult.limit === null) {
          throw new ValidationDataException(
            'subscription',
            'У компании нет активной подписки для создания заказов'
          );
        } else {
          throw new ValidationDataException(
            'subscription',
            `Превышен лимит заказов по тарифу. Лимит: ${limitCheckResult.limit}, текущее количество: ${limitCheckResult.currentCount}`
          );
        }
      }
    } catch (error) {
      if (error instanceof ValidationDataException) {
        throw error;
      }
      
      // В случае ошибки проверки лимитов логируем и разрешаем создание
      console.warn(`⚠️ Ошибка проверки лимитов заказов для компании ${companyId}:`, error);
    }
  }

  /**
   * ✅ Проверка существования заказа
   */
  async validateOrderExists(id: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    
    if (!order) {
      throw new OrderNotFoundException(id);
    }

    return order;
  }

  /**
   * 🔒 Валидация ownership заказа
   */
  async validateOrderOwnership(orderId: string, userCompanyId: string): Promise<Order> {
    const order = await this.ordersDataService.findByIdForCompany(orderId, userCompanyId);
    
    if (!order) {
      throw new ResourceOwnershipException('order', orderId);
    }

    return order;
  }

  /**
   * 📝 Валидация обновления заказа
   */
  async validateUpdateData(id: string, data: UpdateOrderData): Promise<void> {
    // Проверяем существование заказа
    const order = await this.validateOrderExists(id);

    // Проверяем что не пытается изменить companyId
    if (data.companyId && data.companyId !== order.companyId) {
      throw new ValidationDataException(
        'companyId',
        'Нельзя изменять принадлежность заказа к компании'
      );
    }

    // Проверяем что не пытается изменить номер заказа
    if (data.orderNumber && data.orderNumber !== order.orderNumber) {
      throw new ValidationDataException(
        'orderNumber',
        'Нельзя изменять номер заказа'
      );
    }

    // Валидация статуса
    if (data.status && data.status !== order.status) {
      await this.validateStatusTransition(order.status as OrderStatus, data.status);
    }
  }

  /**
   * 🔄 Валидация перехода статусов
   */
  async validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): Promise<void> {
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
   * 👤 Валидация назначения механика
   */
  async validateMechanicAssignment(orderId: string, mechanicId: string): Promise<void> {
    const order = await this.validateOrderExists(orderId);

    // Проверяем что заказ не завершен
    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException(
        'status',
        'Нельзя назначить исполнителя на завершенный заказ'
      );
    }

    // Проверяем что заказ не отменен
    if (order.status === OrderStatus.CANCELED) {
      throw new ValidationDataException(
        'status',
        'Нельзя назначить исполнителя на отмененный заказ'
      );
    }

    // TODO: Добавить проверку что mechanicId является действительным механиком компании
    // const mechanic = await this.usersService.findMechanicByIdAndCompany(mechanicId, order.companyId);
  }

  /**
   * ❌ Валидация возможности отмены заказа
   */
  async validateOrderCancellation(id: string): Promise<void> {
    const order = await this.validateOrderExists(id);

    // Проверяем что заказ не завершен
    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException(
        'status',
        'Нельзя отменить завершенный заказ'
      );
    }

    // Проверяем что заказ еще не отменен
    if (order.status === OrderStatus.CANCELED) {
      throw new ValidationDataException(
        'status',
        'Заказ уже отменен'
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил
   */
  private async validateBusinessRules(data: CreateOrderData): Promise<void> {
    // Проверяем что дата планируемого завершения в будущем
    if (data.estimatedCompletionTime) {
      const estimatedDate = new Date(data.estimatedCompletionTime);
      if (estimatedDate <= new Date()) {
        throw new ValidationDataException(
          'estimatedCompletionTime',
          'Планируемое время завершения должно быть в будущем'
        );
      }
    }

    // Проверяем пробег
    if (data.mileage && data.mileage < 0) {
      throw new ValidationDataException(
        'mileage',
        'Пробег не может быть отрицательным'
      );
    }

    // TODO: Добавить проверки существования customer, vehicle, createdBy, assignedTo
    // в рамках companyId пользователя
  }
}
