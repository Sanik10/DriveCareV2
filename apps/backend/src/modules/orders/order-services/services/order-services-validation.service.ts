import { Injectable } from '@nestjs/common';
import { OrderServicesDataService } from './order-services-data.service';
import { OrderService } from '../../../../database/entities';
import { AddServiceToOrderDto } from '../dto/request/add-service-to-order.dto';
import { UpdateOrderServiceDto } from '../dto/request/update-order-service.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { OrderServiceStatus } from '../../../../database/entities/order-service.entity';
import { 
  OrderServiceNotFoundException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrderServicesValidationService {
  constructor(
    private readonly orderServicesDataService: OrderServicesDataService,
  ) {}

  /**
   * 🔒 Валидация добавления услуги в заказ
   */
  async validateAddService(
    orderId: string, 
    data: AddServiceToOrderDto, 
    user: RequestWithUser['user']
  ): Promise<void> {
    // Проверяем что заказ существует и принадлежит компании пользователя
    const order = await this.orderServicesDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) {
      throw new ResourceOwnershipException('order', orderId);
    }

    // Проверяем что заказ не завершен и не отменен
    if (order.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя добавлять услуги в завершенный заказ'
      );
    }

    if (order.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя добавлять услуги в отмененный заказ'
      );
    }

    // Проверяем что услуга существует и принадлежит компании
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

    // Проверяем что услуга еще не добавлена в заказ
    const alreadyExists = await this.orderServicesDataService.existsInOrder(orderId, data.serviceId);
    if (alreadyExists) {
      throw new ValidationDataException(
        'serviceId',
        'Услуга уже добавлена в заказ. Используйте обновление для изменения количества'
      );
    }

    // Валидация бизнес-правил
    this.validateServiceBusinessRules(data);
  }

  /**
   * 🔒 Валидация обновления услуги в заказе
   */
  async validateUpdateService(
    orderId: string, 
    serviceId: string, 
    data: UpdateOrderServiceDto
  ): Promise<OrderService> {
    // Проверяем существование услуги в заказе
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) {
      throw new OrderServiceNotFoundException(serviceId);
    }

    // Проверяем что заказ можно изменять
    if (orderService.order?.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя изменять услуги в завершенном заказе'
      );
    }

    if (orderService.order?.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя изменять услуги в отмененном заказе'
      );
    }

    // Проверяем что услуга не завершена (если пытаемся изменить цену/количество)
    if (orderService.status === OrderServiceStatus.COMPLETED && 
        (data.price !== undefined || data.quantity !== undefined || data.discountPercent !== undefined)) {
      throw new ValidationDataException(
        'serviceStatus',
        'Нельзя изменять цену или количество завершенной услуги'
      );
    }

    // Валидация бизнес-правил для обновления
    this.validateUpdateBusinessRules(data, orderService);

    return orderService;
  }

  /**
   * 🔒 Валидация удаления услуги из заказа
   */
  async validateRemoveService(orderId: string, serviceId: string): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) {
      throw new OrderServiceNotFoundException(serviceId);
    }

    // Проверяем что заказ можно изменять
    if (orderService.order?.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя удалять услуги из завершенного заказа'
      );
    }

    if (orderService.order?.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя удалять услуги из отмененного заказа'
      );
    }

    // Проверяем что услуга не завершена
    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException(
        'serviceStatus',
        'Нельзя удалить завершенную услугу'
      );
    }

    return orderService;
  }

  /**
   * 🔄 Валидация изменения статуса услуги
   */
  async validateStatusChange(
    orderId: string, 
    serviceId: string, 
    newStatus: OrderServiceStatus, 
    user: RequestWithUser['user']
  ): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) {
      throw new OrderServiceNotFoundException(serviceId);
    }

    const currentStatus = orderService.status;

    // Валидация перехода статусов
    this.validateStatusTransition(currentStatus, newStatus);

    // Дополнительные проверки в зависимости от нового статуса
    switch (newStatus) {
      case OrderServiceStatus.IN_PROGRESS:
        // Проверяем что заказ находится в работе
        if (orderService.order?.status === 'new') {
          throw new ValidationDataException(
            'orderStatus',
            'Нельзя начать выполнение услуги пока заказ не взят в работу'
          );
        }

        // Проверяем что есть назначенный механик (или назначаем текущего пользователя)
        if (!orderService.mechanicId && user.role !== 'mechanic') {
          throw new ValidationDataException(
            'mechanicId',
            'Для начала выполнения услуги необходимо назначить механика'
          );
        }
        break;

      case OrderServiceStatus.COMPLETED:
        // Проверяем что услуга была в работе
        if (currentStatus !== OrderServiceStatus.IN_PROGRESS) {
          throw new ValidationDataException(
            'serviceStatus',
            'Услуга должна быть в работе перед завершением'
          );
        }
        break;
    }

    return orderService;
  }

  /**
   * 👤 Валидация назначения механика
   */
  async validateMechanicAssignment(
    orderId: string, 
    serviceId: string, 
    mechanicId: string
  ): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    if (!orderService) {
      throw new OrderServiceNotFoundException(serviceId);
    }

    // Проверяем что услугу можно изменять
    if (orderService.status === OrderServiceStatus.COMPLETED) {
      throw new ValidationDataException(
        'serviceStatus',
        'Нельзя изменить исполнителя завершенной услуги'
      );
    }

    // Проверяем нагрузку механика (не более 5 активных услуг одновременно)
    const activeMechanicServices = await this.orderServicesDataService.countActiveMechanicServices(mechanicId);
    if (activeMechanicServices >= 5) {
      throw new ValidationDataException(
        'mechanicId',
        `Механик уже выполняет максимальное количество услуг (${activeMechanicServices}/5)`
      );
    }

    // TODO: Добавить проверку что mechanicId является действительным механиком компании
    // const mechanic = await this.usersService.findMechanicByIdAndCompany(mechanicId, orderService.order.companyId);

    return orderService;
  }

  /**
   * ▶️ Валидация начала выполнения услуги
   */
  async validateServiceStart(
    orderId: string, 
    serviceId: string, 
    user: RequestWithUser['user']
  ): Promise<OrderService> {
    return this.validateStatusChange(orderId, serviceId, OrderServiceStatus.IN_PROGRESS, user);
  }

  /**
   * ✅ Валидация завершения выполнения услуги
   */
  async validateServiceCompletion(
    orderId: string, 
    serviceId: string, 
    user?: RequestWithUser['user']
  ): Promise<OrderService> {
    if (!user) {
      throw new ValidationDataException(
        'user',
        'Для завершения услуги требуется информация о пользователе'
      );
    }

    return this.validateStatusChange(orderId, serviceId, OrderServiceStatus.COMPLETED, user);
  }

  /**
   * ✅ Проверка существования услуги в заказе
   */
  async validateOrderServiceExists(orderId: string, serviceId: string): Promise<OrderService> {
    const orderService = await this.orderServicesDataService.findByIdAndOrderId(serviceId, orderId);
    
    if (!orderService) {
      throw new OrderServiceNotFoundException(serviceId);
    }

    return orderService;
  }

  /**
   * 📋 Валидация бизнес-правил для добавления услуги
   */
  private validateServiceBusinessRules(data: AddServiceToOrderDto): void {
    // Проверка количества
    if (data.quantity && data.quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество должно быть больше нуля'
      );
    }

    // Проверка цены
    if (data.customPrice && data.customPrice < 0) {
      throw new ValidationDataException(
        'customPrice',
        'Цена не может быть отрицательной'
      );
    }

    // Проверка скидки
    if (data.discountPercent && (data.discountPercent < 0 || data.discountPercent > 100)) {
      throw new ValidationDataException(
        'discountPercent',
        'Процент скидки должен быть от 0 до 100'
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил для обновления услуги
   */
  private validateUpdateBusinessRules(data: UpdateOrderServiceDto, currentService: OrderService): void {
    // Проверка количества
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество должно быть больше нуля'
      );
    }

    // Проверка цены
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationDataException(
        'price',
        'Цена не может быть отрицательной'
      );
    }

    // Проверка скидки
    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
      throw new ValidationDataException(
        'discountPercent',
        'Процент скидки должен быть от 0 до 100'
      );
    }

    // Проверка заметок
    if (data.notes !== undefined && data.notes.length > 1000) {
      throw new ValidationDataException(
        'notes',
        'Заметки не должны превышать 1000 символов'
      );
    }
  }

  /**
   * 🔄 Валидация перехода статусов
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
}
