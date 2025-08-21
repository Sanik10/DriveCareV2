// src/modules/orders/interfaces/orders.interface.ts
import { Order } from '../../../database/entities';
import { OrderFilter, CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';

export interface IOrdersDataService {
  create(data: CreateOrderData): Promise<Order>;
  findWithFilters(filter: OrderFilter): Promise<[Order[], number]>;
  findById(id: string): Promise<Order | null>;
  findByIdForCompany(id: string, companyId: string): Promise<Order | null>;
  update(id: string, data: UpdateOrderData): Promise<Order>;
  generateOrderNumber(companyId: string): Promise<string>;
}

export interface IOrdersBusinessService {
  createOrderForCompany(data: CreateOrderData, companyId: string): Promise<Order>;
  updateOrder(id: string, data: UpdateOrderData, actorUserId: string): Promise<Order>;
  changeOrderStatus(id: string, newStatus: OrderStatus, actorUserId: string): Promise<Order>;
  assignMechanicToOrder(orderId: string, mechanicId: string, actorUserId: string): Promise<Order>;
  cancelOrder(id: string, actorUserId: string): Promise<void>;
  recalculateOrderFinancials(id: string, actorUserId: string): Promise<Order>;
}

export interface IOrdersValidationService {
  validateCreateDataForUser(data: CreateOrderData, user: any): Promise<void>;
  validateOrderExists(id: string): Promise<Order>;
  validateOrderOwnership(orderId: string, userCompanyId: string): Promise<Order>;
  validateUpdateData(id: string, data: UpdateOrderData): Promise<void>;
  validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): Promise<void>;
  validateMechanicAssignment(orderId: string, mechanicId: string): Promise<void>;
  validateOrderCancellation(id: string): Promise<void>;
}

export interface IOrdersMapperService {
  mapToResponseDto(order: Order): any;
  mapArrayToResponseDto(orders: Order[]): any[];
  mapToBasicInfo(order: Order): {
    id: string;
    orderNumber: string;
    companyId: string;
    status: string;
    customerId: string;
    vehicleId: string;
  };
}
