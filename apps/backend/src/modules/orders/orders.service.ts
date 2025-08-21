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
import { OrderFilter, OrderStatus, CreateOrderData } from './types/orders.types';
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

  async createForUser(createOrderDto: CreateOrderDto, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for user ${user.id} in company ${user.companyId}`);
    const createOrderData: CreateOrderData = {
      ...createOrderDto,
      companyId: createOrderDto.companyId || user.companyId,
      createdBy: createOrderDto.createdBy || user.id,
    };
    await this.ordersValidationService.validateCreateDataForUser(createOrderData, user);
    const order = await this.ordersBusinessService.createOrderForCompany(createOrderData, user.companyId);
    this.logger.log(`Order created: ${order.orderNumber} (${order.id})`);
    return this.ordersMapperService.mapToResponseDto(order);
  }

  async findAll(filter: OrderFilter = {}): Promise<PaginatedOrdersResponseDto> {
    const safeFilter = {
      ...filter,
      search: filter.search ? '[masked]' : undefined,
      customerId: filter.customerId ? '[id]' : undefined,
      vehicleId: filter.vehicleId ? '[id]' : undefined,
      assignedTo: filter.assignedTo ? '[id]' : undefined,
    };
    this.logger.log(`Finding orders with filters: ${JSON.stringify(safeFilter)}`);

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

  async findOne(id: string): Promise<OrderResponseDto> {
    this.logger.log(`Finding order: ${id}`);
    const order = await this.ordersValidationService.validateOrderExists(id);
    return this.ordersMapperService.mapToResponseDto(order);
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Updating order: ${id}`);
    await this.ordersValidationService.validateUpdateData(id, updateOrderDto);
    const updatedOrder = await this.ordersBusinessService.updateOrder(id, { ...updateOrderDto, updatedBy: user.id }, user.id);
    this.logger.log(`Order updated: ${updatedOrder.orderNumber} (${id})`);
    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  async updateStatus(id: string, status: OrderStatus, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Updating order status: ${id} → ${status}`);
    const order = await this.ordersValidationService.validateOrderExists(id);
    await this.ordersValidationService.validateStatusTransition(order.status as OrderStatus, status);
    const updatedOrder = await this.ordersBusinessService.changeOrderStatus(id, status, user.id);
    this.logger.log(`Order status updated: ${updatedOrder.orderNumber} → ${status}`);
    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  async assignMechanic(orderId: string, mechanicId: string, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Assigning mechanic ${mechanicId} to order ${orderId}`);
    await this.ordersValidationService.validateMechanicAssignment(orderId, mechanicId);
    const updatedOrder = await this.ordersBusinessService.assignMechanicToOrder(orderId, mechanicId, user.id);
    this.logger.log(`Mechanic assigned to order: ${updatedOrder.orderNumber}`);
    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  async cancelOrder(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Canceling order: ${id}`);
    await this.ordersValidationService.validateOrderCancellation(id);
    await this.ordersBusinessService.cancelOrder(id, user.id);
    this.logger.log(`Order canceled: ${id}`);
  }

  async recalculateOrderTotals(id: string, user: RequestWithUser['user']): Promise<OrderResponseDto> {
    this.logger.log(`Recalculating order totals: ${id}`);
    await this.ordersValidationService.validateOrderExists(id);
    const updatedOrder = await this.ordersBusinessService.recalculateOrderFinancials(id, user.id);
    this.logger.log(`Order totals recalculated: ${updatedOrder.orderNumber}`);
    return this.ordersMapperService.mapToResponseDto(updatedOrder);
  }

  async exists(id: string): Promise<boolean> {
    const order = await this.ordersDataService.findById(id);
    return !!order;
  }

  async getOrderInfo(id: string): Promise<{
    id: string;
    orderNumber: string;
    companyId: string;
    status: string;
    customerId: string;
    vehicleId: string;
  } | null> {
    const order = await this.ordersDataService.findById(id);
    return order ? this.ordersMapperService.mapToBasicInfo(order) : null;
  }
}
