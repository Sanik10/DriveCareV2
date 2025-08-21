// path: src/modules/orders/order-services/services/order-services-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService, User } from '../../../../database/entities';
import { OrderServicesDataService } from './order-services-data.service';
import { AddServiceToOrderDto } from '../dto/request/add-service-to-order.dto';
import { UpdateOrderServiceDto } from '../dto/request/update-order-service.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { OrderServiceStatus } from '../../../../database/entities/order-service.entity';
import {
  OrderServiceNotFoundException,
  ValidationDataException,
  ResourceOwnershipException,
} from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrderServicesValidationService {
  constructor(
    private readonly orderServicesDataService: OrderServicesDataService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async validateAddService(orderId: string, data: AddServiceToOrderDto, user: RequestWithUser['user']): Promise<void> {
    const order = await this.orderServicesDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) throw new ResourceOwnershipException('order', orderId);

    if (order.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя добавлять услуги в завершенный заказ');
    }
    if (order.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя добавлять услуги в отмененный заказ');
    }

    const service = await this.orderServicesDataService.findServiceByIdAndCompany(data.serviceId, user.companyId);
    if (!service) {
      throw new ValidationDataException('serviceId', `Услуга ${data.serviceId} не найдена или не принадлежит компании`);
    }

    const alreadyExists = await this.orderServicesDataService.existsInOrder(orderId, data.serviceId);
    if (alreadyExists) {
      throw new ValidationDataException('serviceId', 'Услуга уже добавлена в заказ. Используйте обновление для изменения количества');
    }

    this.validateServiceBusinessRules(data);
  }

  async validateUpdateService(orderId: string, serviceId: string, data: UpdateOrderServiceDto): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) throw new OrderServiceNotFoundException(serviceId);

    if (orderService.order?.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя изменять услуги в завершенном заказе');
    }
    if (orderService.order?.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя изменять услуги в отмененном заказе');
    }

    if (
      orderService.status === OrderServiceStatus.COMPLETED &&
      (data.price !== undefined || data.quantity !== undefined || data.discountPercent !== undefined)
    ) {
      throw new ValidationDataException('serviceStatus', 'Нельзя изменять цену или количество завершенной услуги');
    }

    this.validateUpdateBusinessRules(data, orderService);
    return orderService;
  }

  async validateRemoveService(orderId: string, serviceId: string): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) throw new OrderServiceNotFoundException(serviceId);

    if (orderService.order?.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя удалять услуги из завершенного заказа');
    }
    if (orderService.order?.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя удалять услуги из отмененного заказа');
    }
    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException('serviceStatus', 'Нельзя удалить завершенную услугу');
    }

    return orderService;
  }

  async validateStatusChange(
    orderId: string,
    serviceId: string,
    newStatus: OrderServiceStatus,
    user: RequestWithUser['user'],
  ): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) throw new OrderServiceNotFoundException(serviceId);

    const currentStatus = orderService.status;
    this.validateStatusTransition(currentStatus, newStatus);

    switch (newStatus) {
      case OrderServiceStatus.IN_PROGRESS:
        if (orderService.order?.status === 'new') {
          throw new ValidationDataException('orderStatus', 'Нельзя начать выполнение услуги пока заказ не взят в работу');
        }
        if (!orderService.mechanicId && !['mechanic', 'lead_mechanic'].includes(user.role)) {
          throw new ValidationDataException('mechanicId', 'Для начала выполнения услуги необходимо назначить механика');
        }
        break;
      case OrderServiceStatus.COMPLETED:
        if (currentStatus !== OrderServiceStatus.IN_PROGRESS) {
          throw new ValidationDataException('serviceStatus', 'Услуга должна быть в работе перед завершением');
        }
        break;
    }

    return orderService;
  }

  // Новый удобный обёрточный метод — под вызов из сервиса
  async validateServiceStart(
    orderId: string,
    serviceId: string,
    user: RequestWithUser['user'],
  ): Promise<OrderService> {
    return this.validateStatusChange(orderId, serviceId, OrderServiceStatus.IN_PROGRESS, user);
  }

  // Новый удобный обёрточный метод — под вызов из сервиса
  async validateServiceCompletion(
    orderId: string,
    serviceId: string,
    user?: RequestWithUser['user'],
  ): Promise<OrderService> {
    if (!user) {
      throw new ValidationDataException('user', 'Для завершения услуги требуется информация о пользователе');
    }
    return this.validateStatusChange(orderId, serviceId, OrderServiceStatus.COMPLETED, user);
  }

  async validateMechanicAssignment(orderId: string, serviceId: string, mechanicId: string): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) throw new OrderServiceNotFoundException(serviceId);

    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException('serviceStatus', 'Нельзя изменить исполнителя завершенной услуги');
    }

    const mechanic = await this.userRepo.findOne({
      where: { id: mechanicId, company_id: orderService.order?.companyId } as any,
      relations: ['role'],
    });
    if (!mechanic) throw new ValidationDataException('mechanicId', 'Механик не найден в компании');

    const roleName = (mechanic as any)?.role?.name?.toLowerCase?.();
    const allowedRoles = new Set(['mechanic', 'lead_mechanic']);
    if (roleName && !allowedRoles.has(roleName)) {
      throw new ValidationDataException('mechanicId', 'Назначаемый пользователь не является механиком');
    }

    const activeMechanicServices = await this.orderServicesDataService.countActiveMechanicServices(mechanicId);
    if (activeMechanicServices >= 5) {
      throw new ValidationDataException('mechanicId', `Механик уже выполняет максимальное количество услуг (${activeMechanicServices}/5)`);
    }

    return orderService;
  }

  private validateServiceBusinessRules(data: AddServiceToOrderDto): void {
    if (data.quantity && data.quantity <= 0) {
      throw new ValidationDataException('quantity', 'Количество должно быть больше нуля');
    }
    if (data.customPrice && data.customPrice < 0) {
      throw new ValidationDataException('customPrice', 'Цена не может быть отрицательной');
    }
    if (data.discountPercent && (data.discountPercent < 0 || data.discountPercent > 100)) {
      throw new ValidationDataException('discountPercent', 'Процент скидки должен быть от 0 до 100');
    }
  }

  private validateUpdateBusinessRules(data: UpdateOrderServiceDto, _currentService: OrderService): void {
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new ValidationDataException('quantity', 'Количество должно быть больше нуля');
    }
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationDataException('price', 'Цена не может быть отрицательной');
    }
    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
      throw new ValidationDataException('discountPercent', 'Процент скидки должен быть от 0 до 100');
    }
    if (data.notes !== undefined && data.notes.length > 1000) {
      throw new ValidationDataException('notes', 'Заметки не должны превышать 1000 символов');
    }
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
}
