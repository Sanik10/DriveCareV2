// src/modules/orders/services/orders-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersDataService } from './orders-data.service';
import { Order, Customer, Vehicle, User } from '../../../database/entities';
import { CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import {
  OrderNotFoundException,
  OrderStatusTransitionException,
  ValidationDataException,
  ResourceOwnershipException,
} from '../../../common/exceptions/domain.exceptions';
import { ORDERS_CONSTANTS } from '../constants/orders.constants';

@Injectable()
export class OrdersValidationService {
  constructor(
    private readonly ordersDataService: OrdersDataService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async validateCreateDataForUser(data: CreateOrderData, user: RequestWithUser['user']): Promise<void> {
    if (data.companyId && data.companyId !== user.companyId) {
      throw new ValidationDataException('companyId', `Нельзя создавать заказы для чужой компании ${data.companyId}`);
    }
    if (!data.companyId) data.companyId = user.companyId;
    if (data.createdBy !== user.id) {
      throw new ValidationDataException('createdBy', 'Заказ может создать только текущий пользователь');
    }

    await this.validateSubscriptionLimits(user.companyId);
    await this.validateBusinessRules(data);

    const customer = await this.customerRepo.findOne({ where: { id: data.customerId, companyId: data.companyId } as any });
    if (!customer) throw new ValidationDataException('customerId', 'Клиент не найден или принадлежит другой компании');

    const vehicle = await this.vehicleRepo.findOne({ where: { id: data.vehicleId, companyId: data.companyId } as any });
    if (!vehicle) throw new ValidationDataException('vehicleId', 'Автомобиль не найден или принадлежит другой компании');

    if (data.assignedTo) {
      // через relation company, без companyId в where
      const assigned = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.company', 'c')
        .where('u.id = :id', { id: data.assignedTo })
        .andWhere('c.id = :companyId', { companyId: data.companyId })
        .getOne();

      if (!assigned) throw new ValidationDataException('assignedTo', 'Исполнитель не найден в компании');
    }
  }

  private async validateSubscriptionLimits(companyId: string): Promise<void> {
    try {
      const currentOrdersCount = await this.ordersDataService.getOrdersCountForCompany(companyId);
      const limitCheckResult = await this.subscriptionLimitsService.checkOrderLimit(companyId, currentOrdersCount, 1);

      if (!limitCheckResult.allowed) {
        if (limitCheckResult.limit === null) {
          throw new ValidationDataException('subscription', 'У компании нет активной подписки для создания заказов');
        } else {
          throw new ValidationDataException(
            'subscription',
            `Превышен лимит заказов по тарифу. Лимит: ${limitCheckResult.limit}, текущее количество: ${limitCheckResult.currentCount}`,
          );
        }
      }
    } catch (error) {
      if (error instanceof ValidationDataException) throw error;
      console.warn(`⚠️ Ошибка проверки лимитов заказов для компании ${companyId}:`, error);
    }
  }

  async validateOrderExists(id: string): Promise<Order> {
    const order = await this.ordersDataService.findById(id);
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }

  async validateOrderOwnership(orderId: string, userCompanyId: string): Promise<Order> {
    const order = await this.ordersDataService.findByIdForCompany(orderId, userCompanyId);
    if (!order) {
      throw new ResourceOwnershipException('order', orderId);
    }
    return order;
  }

  async validateUpdateData(id: string, data: UpdateOrderData): Promise<void> {
    const order = await this.validateOrderExists(id);

    if (data.companyId && data.companyId !== order.companyId) {
      throw new ValidationDataException('companyId', 'Нельзя изменять принадлежность заказа к компании');
    }
    if (data.orderNumber && data.orderNumber !== order.orderNumber) {
      throw new ValidationDataException('orderNumber', 'Нельзя изменять номер заказа');
    }
    if (data.status && data.status !== order.status) {
      await this.validateStatusTransition(order.status as OrderStatus, data.status);
    }
    if (data.assignedTo) {
      const assigned = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.company', 'c')
        .where('u.id = :id', { id: data.assignedTo })
        .andWhere('c.id = :companyId', { companyId: order.companyId })
        .getOne();

      if (!assigned) throw new ValidationDataException('assignedTo', 'Исполнитель не найден в компании');
    }
  }

  async validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): Promise<void> {
    const allowed = (ORDERS_CONSTANTS.STATUS_TRANSITIONS as Record<OrderStatus, OrderStatus[]>)[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new OrderStatusTransitionException(currentStatus, newStatus);
    }
  }

  async validateMechanicAssignment(orderId: string, mechanicId: string): Promise<void> {
    const order = await this.validateOrderExists(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException('status', 'Нельзя назначить исполнителя на завершенный заказ');
    }
    if (order.status === OrderStatus.CANCELED) {
      throw new ValidationDataException('status', 'Нельзя назначить исполнителя на отмененный заказ');
    }

    // ищем механика в компании + подхватываем роль
    const mechanic = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.company', 'c')
      .leftJoinAndSelect('u.role', 'role')
      .where('u.id = :id', { id: mechanicId })
      .andWhere('c.id = :companyId', { companyId: order.companyId })
      .getOne();

    if (!mechanic) {
      throw new ValidationDataException('mechanicId', 'Механик не найден в компании');
    }

    const roleName =
      (mechanic as any)?.role?.name ||
      (mechanic as any)?.roleName ||
      (mechanic as any)?.role?.code ||
      null;

    const allowedMechanicRoles = new Set(['mechanic', 'lead_mechanic']);
    if (roleName && !allowedMechanicRoles.has(String(roleName).toLowerCase())) {
      throw new ValidationDataException('mechanicId', 'Назначаемый пользователь не является механиком');
    }
  }

  async validateOrderCancellation(id: string): Promise<void> {
    const order = await this.validateOrderExists(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new ValidationDataException('status', 'Нельзя отменить завершенный заказ');
    }
    if (order.status === OrderStatus.CANCELED) {
      throw new ValidationDataException('status', 'Заказ уже отменен');
    }
  }

  private async validateBusinessRules(data: CreateOrderData): Promise<void> {
    if (data.estimatedCompletionTime) {
      const estimatedDate = new Date(data.estimatedCompletionTime);
      if (estimatedDate <= new Date()) {
        throw new ValidationDataException('estimatedCompletionTime', 'Планируемое время завершения должно быть в будущем');
      }
    }
    if (data.mileage && data.mileage < 0) {
      throw new ValidationDataException('mileage', 'Пробег не может быть отрицательным');
    }
  }
}
