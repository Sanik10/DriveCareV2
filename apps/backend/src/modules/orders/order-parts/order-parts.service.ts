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
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

@Injectable()
export class OrderPartsService {
  private readonly logger = new Logger(OrderPartsService.name);

  constructor(
    private readonly data: OrderPartsDataService,
    private readonly business: OrderPartsBusinessService,
    private readonly validation: OrderPartsValidationService,
    private readonly mapper: OrderPartsMapperService,
  ) {}

  async addPartToOrder(orderId: string, addPartDto: AddPartToOrderDto, user: RequestWithUser['user']): Promise<OrderPartResponseDto> {
    await this.validation.validateAddPart(orderId, addPartDto, user);
    const part = await this.business.addPartToOrder(orderId, addPartDto as any, user);
    return this.mapper.mapToResponseDto(part);
  }

  async getOrderParts(orderId: string): Promise<OrderPartsListResponseDto> {
    const parts = await this.data.findByOrderId(orderId);
    const stats = await this.data.getOrderPartsStats(orderId);
    const categoryStats = await this.data.getPartsByCategory(orderId);

    return {
      orderId,
      parts: this.mapper.mapArrayToResponseDto(parts),
      totalParts: stats.total,
      totalAmount: stats.totalAmount,
      customerProvidedCount: stats.customerProvided,
      ourPartsCount: stats.ourParts,
      categoryStats,
      needsInventoryCheck: stats.needsInventoryCheck,
    };
  }

  async updateOrderPart(orderId: string, partId: string, updateDto: UpdateOrderPartDto): Promise<OrderPartResponseDto> {
    const current = await this.validation.validateUpdatePart(orderId, partId, updateDto);
    const updated = await this.business.updateOrderPart(current.id, updateDto as any);
    return this.mapper.mapToResponseDto(updated);
  }

  async removePartFromOrder(orderId: string, partId: string): Promise<void> {
    const current = await this.validation.validateRemovePart(orderId, partId);
    await this.business.removePartFromOrder(current.id);
  }

  async toggleCustomerProvided(orderId: string, partId: string, isCustomerProvided: boolean): Promise<OrderPartResponseDto> {
    const current = await this.validation.validateToggleCustomerProvided(orderId, partId, isCustomerProvided);
    const updated = await this.business.toggleCustomerProvided(current.id, isCustomerProvided);
    return this.mapper.mapToResponseDto(updated);
  }

  async checkPartAvailability(
    orderId: string,
    partId: string,
    user: RequestWithUser['user'],
  ): Promise<{ partId: string; available: number; reserved: number; canAddToOrder: boolean; maxQuantity: number }> {
    return this.business.checkPartAvailability(orderId, partId, user);
  }
}
