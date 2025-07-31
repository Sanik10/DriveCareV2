// src/modules/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrdersDataService } from './services/orders-data.service';
import { OrdersBusinessService } from './services/orders-business.service';
import { OrdersValidationService } from './services/orders-validation.service';
import { OrdersMapperService } from './services/orders-mapper.service';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { UpdateOrderDto } from './dto/request/update-order.dto';
import { OrderResponseDto } from './dto/response/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/response/paginated-orders-response.dto';
import { OrderFilter, OrderStatus, CreateOrderData } from './types/orders.types'; // 🔥 ДОБАВЛЕН ИМПОРТ CreateOrderData
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ORDERS_CONSTANTS } from './constants/orders.constants';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersDataService: OrdersDataService,
    private readonly ordersBusinessService: OrdersBusinessService,
    private readonly ordersValidationService: OrdersValidationService,
    private readonly ordersMapperService: OrdersMapperService,
  ) {}

  /**
   * 🔒 Создание заказа для пользователя
   */
  async createForUser(createOrderDto: CreateOrderDto, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for user ${user.id} in company ${user.companyId}`);

    // 🔥 ИСПРАВЛЕНО: Преобразуем DTO в CreateOrderData
    const createOrderData: CreateOrderData = {
      ...createOrderDto,
      companyId: createOrderDto.companyId || user.companyId,
      createdBy: createOrderDto.createdBy || user.id,
    };

    // Валидация данных с проверкой принадлежности
    await this.ordersValidationService.validateCreateDataForUser(createOrderData, user);

    // Создание через бизнес-сервис
    const order = await this.ordersBusinessService.createOrderForCompany(createOrderData, user.companyId);

    this.logger.log(`Order created: ${order.orderNumber} (${order.id})`);

    return this.ordersMapperService.mapToResponseDto(order);
  }

  /**
   * 🔒 Получение всех заказов с фильтрацией по принадлежности
   */
  async findAll(filter: OrderFilter = {}): Promise<PaginatedOrdersResponseDto> {
    this.logger.log(`Finding orders with filters: ${JSON.stringify(filter)}`);

    const [orders, total] = await this.ordersDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    return {
      items: this.ordersMapperService.mapArrayToResponseDto(orders),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 🔒 Получение заказа по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<OrderResponseDto> {
    this.logger.log(`Finding order: ${id}`);

    const order = await this.ordersValidationService.validateOrderExists(id);

    return this.ordersMapperService.mapToResponseDto(order);
  }

  /**
   * 🔒 Обновление заказа
   */
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Updating order: ${id}`);

    // Валидация обновления
    await this.ordersValidationService.validateUpdateData(id, updateOrderDto);

    // Обновление через бизнес-сервис
    const updatedOrder = await this.ordersBusinessService.updateOrder(id, updateOrderDto);

    this.logger.log(`Order updated: ${updatedOrder.orderNumber} (${id})`);

    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  /**
   * 🔄 Изменение статуса заказа с business logic
   */
  async updateStatus(id: string, status: OrderStatus): Promise<OrderResponseDto> {
    this.logger.log(`Updating order status: ${id} → ${status}`);

    // 🔥 ИСПРАВЛЕНО: Сначала получаем заказ, потом валидируем переход
    const order = await this.ordersValidationService.validateOrderExists(id);
    await this.ordersValidationService.validateStatusTransition(order.status as OrderStatus, status);

    // Изменение статуса через бизнес-сервис
    const updatedOrder = await this.ordersBusinessService.changeOrderStatus(id, status);

    this.logger.log(`Order status updated: ${updatedOrder.orderNumber} → ${status}`);

    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  /**
   * 👤 Назначение механика на заказ
   */
  async assignMechanic(orderId: string, mechanicId: string): Promise<OrderResponseDto> {
    this.logger.log(`Assigning mechanic ${mechanicId} to order ${orderId}`);

    // Валидация назначения
    await this.ordersValidationService.validateMechanicAssignment(orderId, mechanicId);

    // Назначение через бизнес-сервис
    const updatedOrder = await this.ordersBusinessService.assignMechanicToOrder(orderId, mechanicId);

    this.logger.log(`Mechanic assigned to order: ${updatedOrder.orderNumber}`);

    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  /**
   * ❌ Отмена заказа (мягкое удаление)
   */
  async cancelOrder(id: string): Promise<void> {
    this.logger.log(`Canceling order: ${id}`);

    // Валидация возможности отмены
    await this.ordersValidationService.validateOrderCancellation(id);

    // Отмена через бизнес-сервис
    await this.ordersBusinessService.cancelOrder(id);

    this.logger.log(`Order canceled: ${id}`);
  }

  /**
   * 💰 Пересчет финансов заказа
   */
  async recalculateOrderTotals(id: string): Promise<OrderResponseDto> {
    this.logger.log(`Recalculating order totals: ${id}`);

    const order = await this.ordersValidationService.validateOrderExists(id);

    // Пересчет через бизнес-сервис
    const updatedOrder = await this.ordersBusinessService.recalculateOrderFinancials(id);

    this.logger.log(`Order totals recalculated: ${updatedOrder.orderNumber}`);

    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  /**
   * 📊 Для других модулей - проверка существования заказа
   */
  async exists(id: string): Promise<boolean> {
    const order = await this.ordersDataService.findById(id);
    return !!order;
  }

  /**
    * 📋 Для других модулей - базовая информация о заказе
    */
  async getOrderInfo(id: string): Promise<{ 
    id: string; 
	orderNumber: string; 
	companyId: string; 
	status: string;  // 🔥 ИСПРАВЛЕНО: string вместо OrderStatus (TypeORM возвращает string)
	customerId: string;
	vehicleId: string;
  } | null> {
	const order = await this.ordersDataService.findById(id);
	return order ? this.ordersMapperService.mapToBasicInfo(order) : null;
  }
}
