// src/modules/orders/services/orders-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Order, OrderService, OrderPart } from '../../../database/entities';
import { OrderResponseDto } from '../dto/response/order-response.dto';
import { OrderServiceResponseDto } from '../dto/response/order-service-response.dto';
import { OrderPartResponseDto } from '../dto/response/order-part-response.dto';

@Injectable()
export class OrdersMapperService {
  private maskEmail(email?: string): string | undefined {
    if (!email) return undefined;
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
    return `${maskedLocal}@${domain}`;
    }

  private maskPhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
  }

  mapToResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      companyId: order.companyId,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      orderNumber: order.orderNumber,
      status: order.status,
      createdBy: order.createdBy,
      assignedTo: order.assignedTo,
      description: order.description,
      customerComplaints: order.customerComplaints,
      diagnosticResults: order.diagnosticResults,
      totalAmount: parseFloat(order.totalAmount.toString()),
      discountAmount: parseFloat(order.discountAmount.toString()),
      taxAmount: parseFloat(order.taxAmount.toString()),
      finalAmount: parseFloat(order.finalAmount.toString()),
      mileage: order.mileage,
      estimatedCompletionTime: order.estimatedCompletionTime,
      actualCompletionTime: order.actualCompletionTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      customer: order.customer
        ? {
            id: order.customer.id,
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            companyName: order.customer.companyName,
            email: this.maskEmail(order.customer.email),
            phone: this.maskPhone(order.customer.phone),
            type: order.customer.type,
          }
        : undefined,

      vehicle: order.vehicle
        ? {
            id: order.vehicle.id,
            vin: order.vehicle.vin,
            licensePlate: order.vehicle.licensePlate,
            year: order.vehicle.year,
            color: order.vehicle.color,
            mileage: order.vehicle.mileage,
            model: order.vehicle.model
              ? {
                  id: order.vehicle.model.id,
                  name: order.vehicle.model.name,
                  brand: order.vehicle.model.brand
                    ? {
                        id: order.vehicle.model.brand.id,
                        name: order.vehicle.model.brand.name,
                      }
                    : undefined,
                }
              : undefined,
          }
        : undefined,

      createdByUser: order.createdByUser
        ? {
            id: order.createdByUser.id,
            firstName: order.createdByUser.firstName,
            lastName: order.createdByUser.lastName,
            email: this.maskEmail((order.createdByUser as any).email),
          }
        : undefined,

      assignedToUser: order.assignedToUser
        ? {
            id: order.assignedToUser.id,
            firstName: order.assignedToUser.firstName,
            lastName: order.assignedToUser.lastName,
            specialization: (order.assignedToUser as any).specialization,
          }
        : undefined,

      orderServices: order.orderServices?.map((os) => this.mapOrderServiceToDto(os)) || [],
      orderParts: order.orderParts?.map((op) => this.mapOrderPartToDto(op)) || [],

      displayStatus: this.getDisplayStatus(order.status),
      isOverdue: this.checkIfOverdue(order),
      progressPercentage: this.calculateProgress(order),
      estimatedDuration: this.calculateEstimatedDuration(order),
    };
  }

  mapArrayToResponseDto(orders: Order[]): OrderResponseDto[] {
    return orders.map((order) => this.mapToResponseDto(order));
  }

  mapToBasicInfo(order: Order): {
    id: string;
    orderNumber: string;
    companyId: string;
    status: string;
    customerId: string;
    vehicleId: string;
  } {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      status: order.status,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
    };
  }

  mapToSelectOption(order: Order): {
    value: string;
    label: string;
    status: string;
    disabled: boolean;
  } {
    return {
      value: order.id,
      label: `${order.orderNumber} - ${this.getDisplayStatus(order.status)}`,
      status: order.status,
      disabled: order.status === 'canceled',
    };
  }

  mapToListItem(order: Order): {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    vehicleInfo: string;
    totalAmount: number;
    createdAt: Date;
    isOverdue: boolean;
  } {
    const customerName = order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim() || order.customer.companyName
      : 'Неизвестный клиент';

    const vehicleInfo = order.vehicle
      ? `${order.vehicle.model?.brand?.name || ''} ${order.vehicle.model?.name || ''} ${order.vehicle.licensePlate || ''}`.trim()
      : 'Неизвестный автомобиль';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName,
      vehicleInfo,
      totalAmount: parseFloat(order.finalAmount.toString()),
      createdAt: order.createdAt,
      isOverdue: this.checkIfOverdue(order),
    };
  }

  private mapOrderServiceToDto(orderService: OrderService): OrderServiceResponseDto {
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

      service: orderService.service
        ? {
            id: orderService.service.id,
            name: orderService.service.name,
            description: orderService.service.description,
            price: parseFloat(orderService.service.price.toString()),
            durationMinutes: orderService.service.durationMinutes,
          }
        : undefined,
    };
  }

  private mapOrderPartToDto(orderPart: OrderPart): OrderPartResponseDto {
    return {
      id: orderPart.id,
      orderId: orderPart.orderId,
      partId: orderPart.partId,
      price: parseFloat(orderPart.price.toString()),
      quantity: orderPart.quantity,
      discountPercent: parseFloat(orderPart.discountPercent.toString()),
      totalAmount: parseFloat(orderPart.totalAmount.toString()),
      isCustomerProvided: orderPart.isCustomerProvided,
      createdAt: orderPart.createdAt,
      updatedAt: orderPart.updatedAt,

      part: orderPart.part
        ? {
            id: orderPart.part.id,
            name: orderPart.part.name,
            partNumber: orderPart.part.partNumber,
            brand: orderPart.part.brand,
            description: orderPart.part.description,
          }
        : undefined,
    };
  }

  private getDisplayStatus(status: string): string {
    const statusMap: Record<string, string> = {
      new: 'Новый',
      in_progress: 'В работе',
      awaiting_parts: 'Ожидание запчастей',
      completed: 'Завершен',
      canceled: 'Отменен',
    };
    return statusMap[status] || status;
  }

  private checkIfOverdue(order: Order): boolean {
    if (!order.estimatedCompletionTime || order.status === 'completed' || order.status === 'canceled') return false;
    return new Date() > new Date(order.estimatedCompletionTime);
  }

  private calculateProgress(order: Order): number {
    const statusProgress: Record<string, number> = {
      new: 0,
      in_progress: 50,
      awaiting_parts: 75,
      completed: 100,
      canceled: 0,
    };
    return statusProgress[order.status] || 0;
  }

  private calculateEstimatedDuration(order: Order): number | null {
    if (!order.estimatedCompletionTime) return null;
    const start = new Date(order.createdAt);
    const estimated = new Date(order.estimatedCompletionTime);
    return Math.ceil((estimated.getTime() - start.getTime()) / (1000 * 60 * 60));
  }
}
