// src/modules/orders/order-parts/order-parts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderPartsDataService } from './services/order-parts-data.service';
import { OrderPartsBusinessService } from './services/order-parts-business.service';
import { OrderPartsValidationService } from './services/order-parts-validation.service';
import { OrderPartsMapperService } from './services/order-parts-mapper.service';
import { AddPartToOrderDto } from './dto/request/add-part-to-order.dto';
import { UpdateOrderPartDto } from './dto/request/update-order-part.dto';
import { OrderPartResponseDto } from './dto/response/order-part-response.dto';
import { OrderPartsListResponseDto } from './dto/response/order-parts-list-response.dto';
import { AddPartToOrderData } from './types/order-parts.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

@Injectable()
export class OrderPartsService {
  private readonly logger = new Logger(OrderPartsService.name);

  constructor(
    private readonly orderPartsDataService: OrderPartsDataService,
    private readonly orderPartsBusinessService: OrderPartsBusinessService,
    private readonly orderPartsValidationService: OrderPartsValidationService,
    private readonly orderPartsMapperService: OrderPartsMapperService,
  ) {}

  /**
   * 🔒 Добавление запчасти в заказ
   */
  async addPartToOrder(
    orderId: string, 
    addPartDto: AddPartToOrderDto, 
    user: RequestWithUser['user']
  ): Promise<OrderPartResponseDto> {
    this.logger.log(`Adding part ${addPartDto.partId} to order ${orderId} by user ${user.id}`);

    // Преобразование DTO в данные для бизнес-слоя
    const addPartData: AddPartToOrderData = {
      orderId,
      partId: addPartDto.partId,
      price: 0, // Будет рассчитано в BusinessService
      quantity: addPartDto.quantity || 1,
      discountPercent: addPartDto.discountPercent || 0,
      totalAmount: 0, // Будет рассчитано в BusinessService
      isCustomerProvided: addPartDto.isCustomerProvided || false,
      customPrice: addPartDto.customPrice,
    };

    // Валидация данных и проверка прав
    await this.orderPartsValidationService.validateAddPart(orderId, addPartDto, user);

    // Добавление запчасти через бизнес-сервис
    const orderPart = await this.orderPartsBusinessService.addPartToOrder(orderId, addPartData, user);

    this.logger.log(`Part added to order: ${orderPart.id}`);

    return this.orderPartsMapperService.mapToResponseDto(orderPart);
  }

  /**
   * 🔒 Получение списка запчастей заказа
   */
  async getOrderParts(orderId: string): Promise<OrderPartsListResponseDto> {
    this.logger.log(`Getting parts for order ${orderId}`);

    // Получение запчастей заказа
    const orderParts = await this.orderPartsDataService.findByOrderId(orderId);

    return {
      orderId,
      parts: this.orderPartsMapperService.mapArrayToResponseDto(orderParts),
      totalParts: orderParts.length,
      totalAmount: orderParts.reduce((sum, part) => sum + parseFloat(part.totalAmount.toString()), 0),
      customerProvidedCount: orderParts.filter(p => p.isCustomerProvided).length,
      ourPartsCount: orderParts.filter(p => !p.isCustomerProvided).length,
    };
  }

  /**
   * 🔒 Обновление запчасти в заказе
   */
  async updateOrderPart(
    orderId: string, 
    partId: string, 
    updateDto: UpdateOrderPartDto
  ): Promise<OrderPartResponseDto> {
    this.logger.log(`Updating order part ${partId} in order ${orderId}`);

    // Валидация обновления
    await this.orderPartsValidationService.validateUpdatePart(orderId, partId, updateDto);

    // Обновление через бизнес-сервис
    const updatedOrderPart = await this.orderPartsBusinessService.updateOrderPart(partId, updateDto);

    this.logger.log(`Order part updated: ${partId}`);

    return this.orderPartsMapperService.mapToResponseDto(updatedOrderPart);
  }

  /**
   * 🔒 Удаление запчасти из заказа
   */
  async removePartFromOrder(orderId: string, partId: string): Promise<void> {
    this.logger.log(`Removing part ${partId} from order ${orderId}`);

    // Валидация удаления
    await this.orderPartsValidationService.validateRemovePart(orderId, partId);

    // Удаление через бизнес-сервис
    await this.orderPartsBusinessService.removePartFromOrder(partId);

    this.logger.log(`Part removed from order: ${partId}`);
  }

  /**
   * 🔄 Переключение типа запчасти
   */
  async toggleCustomerProvided(
    orderId: string, 
    partId: string, 
    isCustomerProvided: boolean
  ): Promise<OrderPartResponseDto> {
    this.logger.log(`Toggling customer provided for part ${partId}: ${isCustomerProvided}`);

    // Валидация
    await this.orderPartsValidationService.validateToggleCustomerProvided(orderId, partId, isCustomerProvided);

    // Переключение через бизнес-сервис
    const updatedOrderPart = await this.orderPartsBusinessService.toggleCustomerProvided(
      partId, 
      isCustomerProvided
    );

    this.logger.log(`Customer provided toggled for part: ${partId}`);

    return this.orderPartsMapperService.mapToResponseDto(updatedOrderPart);
  }

  /**
   * 📊 Проверка наличия запчасти
   */
  async checkPartAvailability(orderId: string, partId: string): Promise<{
    partId: string;
    available: number;
    reserved: number;
    canAddToOrder: boolean;
    maxQuantity: number;
  }> {
    return this.orderPartsBusinessService.checkPartAvailability(orderId, partId);
  }

  /**
   * 📊 Для других модулей - получение информации о запчастях заказа
   */
  async getOrderPartsInfo(orderId: string): Promise<{
    totalParts: number;
    customerProvidedParts: number;
    ourParts: number;
    totalAmount: number;
    needsInventoryCheck: boolean;
  }> {
    const orderParts = await this.orderPartsDataService.findByOrderId(orderId);

    return {
      totalParts: orderParts.length,
      customerProvidedParts: orderParts.filter(p => p.isCustomerProvided).length,
      ourParts: orderParts.filter(p => !p.isCustomerProvided).length,
      totalAmount: orderParts.reduce((sum, part) => sum + parseFloat(part.totalAmount.toString()), 0),
      needsInventoryCheck: orderParts.some(p => !p.isCustomerProvided),
    };
  }
}
