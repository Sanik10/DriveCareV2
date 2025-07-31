// src/modules/orders/order-parts/services/order-parts-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { OrderPart } from '../../../../database/entities';
import { OrderPartResponseDto } from '../dto/response/order-part-response.dto';

@Injectable()
export class OrderPartsMapperService {
  
  /**
   * 🎯 Основной маппинг OrderPart Entity → ResponseDto
   */
  mapToResponseDto(orderPart: OrderPart): OrderPartResponseDto {
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
      
      // 🔗 Связанная информация (если загружена)
      part: orderPart.part ? {
        id: orderPart.part.id,
        name: orderPart.part.name,
        partNumber: orderPart.part.partNumber,
        brand: orderPart.part.brand,
        description: orderPart.part.description,
        // category: orderPart.part.category ? {
        //   id: orderPart.part.category.id,
        //   name: orderPart.part.category.name,
        // } : undefined,
      } : undefined,
      
      // 📊 Вычисляемые поля
      subtotal: this.calculateSubtotal(orderPart),
      discountAmount: this.calculateDiscountAmount(orderPart),
      unitPriceWithDiscount: this.calculateUnitPriceWithDiscount(orderPart),
      isOurPart: !orderPart.isCustomerProvided,
      categoryName: orderPart.part?.category?.name || 'Без категории',
      displayStatus: this.getDisplayStatus(orderPart),
      costPrice: orderPart.part ? parseFloat(orderPart.part.costPrice.toString()) : 0,
      margin: this.calculateMargin(orderPart),
      profitAmount: this.calculateProfitAmount(orderPart),
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(orderParts: OrderPart[]): OrderPartResponseDto[] {
    return orderParts.map(orderPart => this.mapToResponseDto(orderPart));
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(orderPart: OrderPart): { 
    id: string; 
    orderId: string;
    partId: string;
    partName: string;
    quantity: number;
    totalAmount: number;
    isCustomerProvided: boolean;
  } {
    return {
      id: orderPart.id,
      orderId: orderPart.orderId,
      partId: orderPart.partId,
      partName: orderPart.part?.name || 'Неизвестная запчасть',
      quantity: orderPart.quantity,
      totalAmount: parseFloat(orderPart.totalAmount.toString()),
      isCustomerProvided: orderPart.isCustomerProvided,
    };
  }

  /**
   * 🎯 Для списков и отчетов
   */
  mapToListItem(orderPart: OrderPart): {
    id: string;
    partName: string;
    partNumber: string;
    brand: string;
    quantity: number;
    totalAmount: number;
    isCustomerProvided: boolean;
    categoryName: string;
    discountPercent: number;
    margin: number;
  } {
    return {
      id: orderPart.id,
      partName: orderPart.part?.name || 'Неизвестная запчасть',
      partNumber: orderPart.part?.partNumber || '',
      brand: orderPart.part?.brand || '',
      quantity: orderPart.quantity,
      totalAmount: parseFloat(orderPart.totalAmount.toString()),
      isCustomerProvided: orderPart.isCustomerProvided,
      categoryName: orderPart.part?.category?.name || 'Без категории',
      discountPercent: parseFloat(orderPart.discountPercent.toString()),
      margin: this.calculateMargin(orderPart),
    };
  }

  /**
   * 🎯 Для финансовых отчетов
   */
  mapToFinancialSummary(orderPart: OrderPart): {
    id: string;
    partId: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discountAmount: number;
    finalAmount: number;
    costPrice: number;
    profitAmount: number;
    marginPercent: number;
    isCustomerProvided: boolean;
  } {
    const unitPrice = parseFloat(orderPart.price.toString());
    const subtotal = this.calculateSubtotal(orderPart);
    const discountAmount = this.calculateDiscountAmount(orderPart);
    const costPrice = orderPart.part ? parseFloat(orderPart.part.costPrice.toString()) : 0;
    
    return {
      id: orderPart.id,
      partId: orderPart.partId,
      partName: orderPart.part?.name || 'Неизвестная запчасть',
      quantity: orderPart.quantity,
      unitPrice,
      subtotal,
      discountAmount,
      finalAmount: parseFloat(orderPart.totalAmount.toString()),
      costPrice,
      profitAmount: this.calculateProfitAmount(orderPart),
      marginPercent: this.calculateMargin(orderPart),
      isCustomerProvided: orderPart.isCustomerProvided,
    };
  }

  /**
   * 🎯 Для inventory отчетов
   */
  mapToInventoryImpact(orderPart: OrderPart): {
    partId: string;
    partName: string;
    quantityUsed: number;
    affectsInventory: boolean;
    category: string;
    unitCost: number;
    totalCost: number;
  } {
    const costPrice = orderPart.part ? parseFloat(orderPart.part.costPrice.toString()) : 0;
    
    return {
      partId: orderPart.partId,
      partName: orderPart.part?.name || 'Неизвестная запчасть',
      quantityUsed: orderPart.quantity,
      affectsInventory: !orderPart.isCustomerProvided,
      category: orderPart.part?.category?.name || 'Без категории',
      unitCost: costPrice,
      totalCost: costPrice * orderPart.quantity,
    };
  }

  /**
   * 🎯 Для audit логирования
   */
  mapToAuditData(orderPart: OrderPart): {
    id: string;
    orderId: string;
    partId: string;
    partName: string;
    quantity: number;
    totalAmount: number;
    isCustomerProvided: boolean;
    categoryName: string;
  } {
    return {
      id: orderPart.id,
      orderId: orderPart.orderId,
      partId: orderPart.partId,
      partName: orderPart.part?.name || 'Неизвестная запчасть',
      quantity: orderPart.quantity,
      totalAmount: parseFloat(orderPart.totalAmount.toString()),
      isCustomerProvided: orderPart.isCustomerProvided,
      categoryName: orderPart.part?.category?.name || 'Без категории',
    };
  }

  /**
   * 🎯 Для категоризации и группировки
   */
  mapToCategoryGroup(orderParts: OrderPart[]): Record<string, {
    categoryName: string;
    parts: Array<{
      id: string;
      partName: string;
      quantity: number;
      totalAmount: number;
    }>;
    totalParts: number;
    totalAmount: number;
  }> {
    const groups: Record<string, any> = {};
    
    orderParts.forEach(orderPart => {
      const categoryName = orderPart.part?.category?.name || 'Без категории';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {
          categoryName,
          parts: [],
          totalParts: 0,
          totalAmount: 0,
        };
      }
      
      groups[categoryName].parts.push({
        id: orderPart.id,
        partName: orderPart.part?.name || 'Неизвестная запчасть',
        quantity: orderPart.quantity,
        totalAmount: parseFloat(orderPart.totalAmount.toString()),
      });
      
      groups[categoryName].totalParts += orderPart.quantity;
      groups[categoryName].totalAmount += parseFloat(orderPart.totalAmount.toString());
    });
    
    return groups;
  }

  /**
   * 💰 Расчет подытога (без скидки)
   */
  private calculateSubtotal(orderPart: OrderPart): number {
    const price = parseFloat(orderPart.price.toString());
    return price * orderPart.quantity;
  }

  /**
   * 💰 Расчет размера скидки
   */
  private calculateDiscountAmount(orderPart: OrderPart): number {
    const subtotal = this.calculateSubtotal(orderPart);
    const discountPercent = parseFloat(orderPart.discountPercent.toString());
    return subtotal * (discountPercent / 100);
  }

  /**
   * 💰 Расчет цены за единицу с учетом скидки
   */
  private calculateUnitPriceWithDiscount(orderPart: OrderPart): number {
    const price = parseFloat(orderPart.price.toString());
    const discountPercent = parseFloat(orderPart.discountPercent.toString());
    return price * (1 - discountPercent / 100);
  }

  /**
   * 📊 Получение статуса для отображения
   */
  private getDisplayStatus(orderPart: OrderPart): string {
    if (orderPart.isCustomerProvided) {
      return 'Клиентская';
    }
    return 'Наша';
  }

  /**
   * 💹 Расчет маржи в процентах
   */
  private calculateMargin(orderPart: OrderPart): number {
    if (orderPart.isCustomerProvided || !orderPart.part) {
      return 0; // Клиентские запчасти не дают маржи
    }

    const sellingPrice = parseFloat(orderPart.totalAmount.toString()) / orderPart.quantity;
    const costPrice = parseFloat(orderPart.part.costPrice.toString());
    
    if (costPrice === 0) return 0;
    
    return ((sellingPrice - costPrice) / costPrice) * 100;
  }

  /**
   * 💰 Расчет суммы прибыли
   */
  private calculateProfitAmount(orderPart: OrderPart): number {
    if (orderPart.isCustomerProvided || !orderPart.part) {
      return parseFloat(orderPart.totalAmount.toString()); // Вся сумма - прибыль (услуга установки)
    }

    const sellingAmount = parseFloat(orderPart.totalAmount.toString());
    const costAmount = parseFloat(orderPart.part.costPrice.toString()) * orderPart.quantity;
    
    return Math.max(0, sellingAmount - costAmount);
  }
}
