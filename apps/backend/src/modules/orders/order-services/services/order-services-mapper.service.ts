// path: src/modules/orders/order-services/services/order-services-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../database/entities';
import { OrderServiceResponseDto } from '../dto/response/order-service-response.dto';

@Injectable()
export class OrderServicesMapperService {
  /**
   * 🎯 Основной маппинг OrderService Entity → ResponseDto
   */
  mapToResponseDto(orderService: OrderService): OrderServiceResponseDto {
    return {
      id: orderService.id,
      orderId: orderService.orderId,
      serviceId: orderService.serviceId,
      price: parseFloat(orderService.price.toString()),
      quantity: orderService.quantity,
      discountPercent: parseFloat(orderService.discountPercent.toString()),
      totalAmount: parseFloat(orderService.totalAmount.toString()),
      status: orderService.status,
      mechanicId: orderService.mechanicId || undefined,
      startTime: orderService.startTime,
      endTime: orderService.endTime,
      notes: orderService.notes || undefined,
      createdAt: orderService.createdAt,
      updatedAt: orderService.updatedAt,

      // 🔗 Связанная информация (если загружена)
      service: orderService.service
        ? {
            id: orderService.service.id,
            name: orderService.service.name,
            description: orderService.service.description,
            basePrice: parseFloat(orderService.service.price.toString()),
            durationMinutes: orderService.service.durationMinutes,
          }
        : undefined,

      mechanic: orderService.mechanic
        ? {
            id: orderService.mechanic.id,
            firstName: orderService.mechanic.firstName,
            lastName: orderService.mechanic.lastName,
            specialization: orderService.mechanic.specialization || undefined,
          }
        : undefined,

      // 📊 Вычисляемые поля
      displayStatus: this.getDisplayStatus(orderService.status),
      isInProgress: orderService.status === 'in_progress',
      isCompleted: orderService.status === 'completed',
      duration: this.calculateDuration(orderService),
      priceWithDiscount: this.calculatePriceWithDiscount(orderService),
      discountAmount: this.calculateDiscountAmount(orderService),
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(orderServices: OrderService[]): OrderServiceResponseDto[] {
    return orderServices.map((orderService) => this.mapToResponseDto(orderService));
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(orderService: OrderService): {
    id: string;
    orderId: string;
    serviceId: string;
    serviceName: string;
    status: string;
    totalAmount: number;
  } {
    return {
      id: orderService.id,
      orderId: orderService.orderId,
      serviceId: orderService.serviceId,
      serviceName: orderService.service?.name || 'Неизвестная услуга',
      status: orderService.status,
      totalAmount: parseFloat(orderService.totalAmount.toString()),
    };
  }

  /**
   * 📊 Получение читаемого статуса
   */
  private getDisplayStatus(status: string): string {
    const statusMap: Record<string, string> = {
      planned: 'Запланирована',
      in_progress: 'Выполняется',
      completed: 'Завершена',
    };
    return statusMap[status] || status;
  }

  /**
   * ⏱️ Расчет длительности выполнения (в минутах)
   */
  private calculateDuration(orderService: OrderService): number | null {
    if (!orderService.startTime) return null;
    const endTime = orderService.endTime || new Date();
    const duration = endTime.getTime() - orderService.startTime.getTime();
    return Math.round(duration / (1000 * 60));
  }

  /**
   * 💰 Цена за единицу с учетом скидки
   */
  private calculatePriceWithDiscount(orderService: OrderService): number {
    const basePrice = parseFloat(orderService.price.toString());
    const discountPercent = parseFloat(orderService.discountPercent.toString());
    return Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
  }

  /**
   * 💰 Размер скидки в валюте (за всю позицию)
   */
  private calculateDiscountAmount(orderService: OrderService): number {
    const baseAmount = parseFloat(orderService.price.toString()) * orderService.quantity;
    const discountPercent = parseFloat(orderService.discountPercent.toString());
    return Math.round(baseAmount * (discountPercent / 100) * 100) / 100;
  }
}
