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
      mechanicId: orderService.mechanicId,
      startTime: orderService.startTime,
      endTime: orderService.endTime,
      notes: orderService.notes,
      createdAt: orderService.createdAt,
      updatedAt: orderService.updatedAt,
      
      // 🔗 Связанная информация (если загружена)
      service: orderService.service ? {
        id: orderService.service.id,
        name: orderService.service.name,
        description: orderService.service.description,
        basePrice: parseFloat(orderService.service.price.toString()),
        durationMinutes: orderService.service.durationMinutes,
        // category: orderService.service.category ? {
        //   id: orderService.service.category.id,
        //   name: orderService.service.category.name,
        // } : undefined,
      } : undefined,
      
      mechanic: orderService.mechanic ? {
        id: orderService.mechanic.id,
        firstName: orderService.mechanic.firstName,
        lastName: orderService.mechanic.lastName,
        specialization: orderService.mechanic.specialization,
      } : undefined,
      
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
    return orderServices.map(orderService => this.mapToResponseDto(orderService));
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
   * 🎯 Для списков и отчетов
   */
  mapToListItem(orderService: OrderService): {
    id: string;
    serviceName: string;
    status: string;
    displayStatus: string;
    quantity: number;
    totalAmount: number;
    mechanicName: string;
    duration: number | null;
    isOverdue: boolean;
  } {
    const mechanicName = orderService.mechanic 
      ? `${orderService.mechanic.firstName} ${orderService.mechanic.lastName}`.trim()
      : 'Не назначен';

    return {
      id: orderService.id,
      serviceName: orderService.service?.name || 'Неизвестная услуга',
      status: orderService.status,
      displayStatus: this.getDisplayStatus(orderService.status),
      quantity: orderService.quantity,
      totalAmount: parseFloat(orderService.totalAmount.toString()),
      mechanicName,
      duration: this.calculateDuration(orderService),
      isOverdue: this.checkIfOverdue(orderService),
    };
  }

  /**
   * 🎯 Для финансовых отчетов
   */
  mapToFinancialSummary(orderService: OrderService): {
    id: string;
    serviceId: string;
    serviceName: string;
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    discountPercent: number;
  } {
    const baseAmount = parseFloat(orderService.price.toString()) * orderService.quantity;
    const discountAmount = this.calculateDiscountAmount(orderService);
    
    return {
      id: orderService.id,
      serviceId: orderService.serviceId,
      serviceName: orderService.service?.name || 'Неизвестная услуга',
      baseAmount,
      discountAmount,
      finalAmount: parseFloat(orderService.totalAmount.toString()),
      discountPercent: parseFloat(orderService.discountPercent.toString()),
    };
  }

  /**
   * 🎯 Для audit логирования
   */
  mapToAuditData(orderService: OrderService): {
    id: string;
    orderId: string;
    serviceId: string;
    serviceName: string;
    status: string;
    totalAmount: number;
    mechanicId: string | null;
  } {
    return {
      id: orderService.id,
      orderId: orderService.orderId,
      serviceId: orderService.serviceId,
      serviceName: orderService.service?.name || 'Неизвестная услуга',
      status: orderService.status,
      totalAmount: parseFloat(orderService.totalAmount.toString()),
      mechanicId: orderService.mechanicId,
    };
  }

  /**
   * 📊 Получение читаемого статуса
   */
  private getDisplayStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'planned': 'Запланирована',
      'in_progress': 'Выполняется',
      'completed': 'Завершена',
    };
    
    return statusMap[status] || status;
  }

  /**
   * ⏱️ Расчет длительности выполнения
   */
  private calculateDuration(orderService: OrderService): number | null {
    if (!orderService.startTime) return null;
    
    const endTime = orderService.endTime || new Date();
    const duration = endTime.getTime() - orderService.startTime.getTime();
    
    return Math.round(duration / (1000 * 60)); // в минутах
  }

  /**
   * 💰 Расчет цены с учетом скидки
   */
  private calculatePriceWithDiscount(orderService: OrderService): number {
    const basePrice = parseFloat(orderService.price.toString());
    const discountPercent = parseFloat(orderService.discountPercent.toString());
    
    return basePrice * (1 - discountPercent / 100);
  }

  /**
   * 💰 Расчет размера скидки
   */
  private calculateDiscountAmount(orderService: OrderService): number {
    const baseAmount = parseFloat(orderService.price.toString()) * orderService.quantity;
    const discountPercent = parseFloat(orderService.discountPercent.toString());
    
    return baseAmount * (discountPercent / 100);
  }

  /**
   * ⏰ Проверка просрочки (если услуга в работе дольше планируемого времени)
   */
  private checkIfOverdue(orderService: OrderService): boolean {
    if (orderService.status !== 'in_progress' || !orderService.startTime) {
      return false;
    }

    const expectedDuration = orderService.service?.durationMinutes || 60; // по умолчанию 1 час
    const actualDuration = this.calculateDuration(orderService) || 0;
    
    return actualDuration > expectedDuration * 1.5; // считаем просроченным если превышено в 1.5 раза
  }
}
