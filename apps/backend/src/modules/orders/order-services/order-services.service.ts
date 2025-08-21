// path: src/modules/orders/order-services/order-services.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderServicesDataService } from './services/order-services-data.service';
import { OrderServicesBusinessService } from './services/order-services-business.service';
import { OrderServicesValidationService } from './services/order-services-validation.service';
import { OrderServicesMapperService } from './services/order-services-mapper.service';
import { AddServiceToOrderDto } from './dto/request/add-service-to-order.dto';
import { UpdateOrderServiceDto } from './dto/request/update-order-service.dto';
import { OrderServiceResponseDto } from './dto/response/order-service-response.dto';
import { OrderServicesListResponseDto } from './dto/response/order-services-list-response.dto';
import { AddServiceToOrderData } from './types/order-services.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { OrderServiceStatus } from '../../../database/entities/order-service.entity';

@Injectable()
export class OrderServicesService {
  private readonly logger = new Logger(OrderServicesService.name);

  constructor(
    private readonly orderServicesDataService: OrderServicesDataService,
    private readonly orderServicesBusinessService: OrderServicesBusinessService,
    private readonly orderServicesValidationService: OrderServicesValidationService,
    private readonly orderServicesMapperService: OrderServicesMapperService,
  ) {}

  async addServiceToOrder(
    orderId: string,
    addServiceDto: AddServiceToOrderDto,
    user: RequestWithUser['user'],
  ): Promise<OrderServiceResponseDto> {
    this.logger.log(`Adding service ${addServiceDto.serviceId} to order ${orderId} by user ${user.id}`);

    const addServiceData: AddServiceToOrderData = {
      orderId,
      serviceId: addServiceDto.serviceId,
      price: 0,
      quantity: addServiceDto.quantity || 1,
      discountPercent: addServiceDto.discountPercent || 0,
      totalAmount: 0,
      status: OrderServiceStatus.PLANNED,
      mechanicId: addServiceDto.mechanicId || null,
      notes: addServiceDto.notes || null,
      customPrice: addServiceDto.customPrice,
    };

    await this.orderServicesValidationService.validateAddService(orderId, addServiceDto, user);
    const orderService = await this.orderServicesBusinessService.addServiceToOrder(orderId, addServiceData, user);

    this.logger.log(`Service added to order: ${orderService.id}`);
    return this.orderServicesMapperService.mapToResponseDto(orderService);
  }

  async getOrderServices(orderId: string): Promise<OrderServicesListResponseDto> {
    this.logger.log(`Getting services for order ${orderId}`);
    const orderServices = await this.orderServicesDataService.findByOrderId(orderId);
    return {
      orderId,
      services: this.orderServicesMapperService.mapArrayToResponseDto(orderServices),
      totalServices: orderServices.length,
      totalAmount: orderServices.reduce((sum, service) => sum + parseFloat(service.totalAmount.toString()), 0),
    };
  }

  async updateOrderService(
    orderId: string,
    serviceId: string,
    updateDto: UpdateOrderServiceDto,
    user: RequestWithUser['user'],
  ): Promise<OrderServiceResponseDto> {
    this.logger.log(`Updating order service ${serviceId} in order ${orderId} by ${user.id}`);
    await this.orderServicesValidationService.validateUpdateService(orderId, serviceId, updateDto);
    const updatedOrderService = await this.orderServicesBusinessService.updateOrderService(serviceId, updateDto, user);
    this.logger.log(`Order service updated: ${serviceId}`);
    return this.orderServicesMapperService.mapToResponseDto(updatedOrderService);
  }

  async removeServiceFromOrder(orderId: string, serviceId: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Removing service ${serviceId} from order ${orderId} by ${user.id}`);
    await this.orderServicesValidationService.validateRemoveService(orderId, serviceId);
    await this.orderServicesBusinessService.removeServiceFromOrder(serviceId, user);
    this.logger.log(`Service removed from order: ${serviceId}`);
  }

  async updateServiceStatus(
    orderId: string,
    serviceId: string,
    status: OrderServiceStatus,
    user: RequestWithUser['user'],
  ): Promise<OrderServiceResponseDto> {
    this.logger.log(`Updating service ${serviceId} status to ${status} by user ${user.id}`);
    await this.orderServicesValidationService.validateStatusChange(orderId, serviceId, status, user);
    const updatedOrderService = await this.orderServicesBusinessService.updateServiceStatus(serviceId, status, user);
    this.logger.log(`Service status updated: ${serviceId} → ${status}`);
    return this.orderServicesMapperService.mapToResponseDto(updatedOrderService);
  }

  async assignMechanicToService(
    orderId: string,
    serviceId: string,
    mechanicId: string,
    user: RequestWithUser['user'],
  ): Promise<OrderServiceResponseDto> {
    this.logger.log(`Assigning mechanic ${mechanicId} to service ${serviceId} by ${user.id}`);
    await this.orderServicesValidationService.validateMechanicAssignment(orderId, serviceId, mechanicId);
    const updatedOrderService = await this.orderServicesBusinessService.assignMechanicToService(serviceId, mechanicId, user);
    this.logger.log(`Mechanic assigned to service: ${serviceId} → ${mechanicId}`);
    return this.orderServicesMapperService.mapToResponseDto(updatedOrderService);
  }

  async startService(orderId: string, serviceId: string, user: RequestWithUser['user']): Promise<OrderServiceResponseDto> {
    this.logger.log(`Starting service ${serviceId} by user ${user.id}`);
    await this.orderServicesValidationService.validateServiceStart(orderId, serviceId, user);
    const updatedOrderService = await this.orderServicesBusinessService.startService(serviceId, user);
    this.logger.log(`Service started: ${serviceId}`);
    return this.orderServicesMapperService.mapToResponseDto(updatedOrderService);
  }

  async completeService(
    orderId: string,
    serviceId: string,
    notes: string | undefined,
    user: RequestWithUser['user'],
  ): Promise<OrderServiceResponseDto> {
    this.logger.log(`Completing service ${serviceId} by ${user.id}`);
    await this.orderServicesValidationService.validateServiceCompletion(orderId, serviceId, user);
    const updatedOrderService = await this.orderServicesBusinessService.completeService(serviceId, notes, user);
    this.logger.log(`Service completed: ${serviceId}`);
    return this.orderServicesMapperService.mapToResponseDto(updatedOrderService);
  }

  async getOrderServicesInfo(orderId: string): Promise<{
    totalServices: number;
    completedServices: number;
    totalAmount: number;
    inProgressServices: number;
  }> {
    const orderServices = await this.orderServicesDataService.findByOrderId(orderId);
    return {
      totalServices: orderServices.length,
      completedServices: orderServices.filter((s) => s.status === OrderServiceStatus.COMPLETED).length,
      inProgressServices: orderServices.filter((s) => s.status === OrderServiceStatus.IN_PROGRESS).length,
      totalAmount: orderServices.reduce((sum, service) => sum + parseFloat(service.totalAmount.toString()), 0),
    };
  }
}
