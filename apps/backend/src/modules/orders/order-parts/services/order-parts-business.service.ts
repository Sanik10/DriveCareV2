// src/modules/orders/order-parts/services/order-parts-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderPartsDataService } from './order-parts-data.service';
import { OrderPart } from '../../../../database/entities';
import { AddPartToOrderData, UpdateOrderPartData } from '../types/order-parts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { 
  ValidationDataException,
  OrderPartNotFoundException
} from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class OrderPartsBusinessService {
  private readonly logger = new Logger(OrderPartsBusinessService.name);

  constructor(
    private readonly orderPartsDataService: OrderPartsDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📋 Добавление запчасти в заказ с автоматическим расчетом стоимости
   */
  async addPartToOrder(
    orderId: string, 
    data: AddPartToOrderData, 
    user: RequestWithUser['user']
  ): Promise<OrderPart> {
    this.logger.log(`Adding part ${data.partId} to order ${orderId}`);

    // Получаем информацию о запчасти для расчета стоимости
    const part = await this.orderPartsDataService.findPartByIdAndCompany(
      data.partId, 
      user.companyId
    );

    if (!part) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${data.partId} не найдена или не принадлежит компании`
      );
    }

    // 🔥 Расчет стоимости с учетом типа запчасти
    let basePrice: number;
    let totalAmount: number;

    if (data.isCustomerProvided) {
      // Запчасть клиента - цена 0 или кастомная цена за услугу установки
      basePrice = data.customPrice || 0;
      totalAmount = basePrice * data.quantity;
    } else {
      // Наша запчасть - используем selling price или кастомную цену
      basePrice = data.customPrice || parseFloat(part.sellingPrice.toString());
      const quantity = data.quantity || 1;
      const discountPercent = data.discountPercent || 0;
      
      const subtotal = basePrice * quantity;
      const discountAmount = subtotal * (discountPercent / 100);
      totalAmount = subtotal - discountAmount;

      // 🔒 Резервируем запчасти на складе (если не клиентские)
      await this.reservePartFromInventory(data.partId, quantity, user.companyId);
    }

    // Создание записи запчасти в заказе
    const orderPartData: AddPartToOrderData = {
      orderId,
      partId: data.partId,
      price: basePrice,
      quantity: data.quantity || 1,
      discountPercent: data.discountPercent || 0,
      totalAmount,
      isCustomerProvided: data.isCustomerProvided,
    };

    const orderPart = await this.orderPartsDataService.create(orderPartData);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.ORDER_PART_ADDED, {
      entityType: 'OrderPart',
      entityId: orderPart.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        orderId,
        partId: data.partId,
        partName: part.name,
        quantity: data.quantity || 1,
        totalAmount,
        basePrice,
        discountPercent: data.discountPercent || 0,
        isCustomerProvided: data.isCustomerProvided,
        inventoryReserved: !data.isCustomerProvided,
      },
    });

    this.logger.log(`Part added to order: ${orderPart.id}`);
    return orderPart;
  }

  /**
   * 📝 Обновление запчасти в заказе с пересчетом стоимости
   */
  async updateOrderPart(id: string, data: UpdateOrderPartData): Promise<OrderPart> {
    this.logger.log(`Updating order part: ${id}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) {
      throw new OrderPartNotFoundException(id);
    }

    const oldQuantity = orderPart.quantity;
    const newQuantity = data.quantity ?? oldQuantity;
    const quantityDifference = newQuantity - oldQuantity;

    // Пересчет стоимости при изменении количества, цены или скидки
    let updateData = { ...data };

    if (data.quantity !== undefined || data.price !== undefined || data.discountPercent !== undefined) {
      const quantity = data.quantity ?? orderPart.quantity;
      const price = data.price ?? parseFloat(orderPart.price.toString());
      const discountPercent = data.discountPercent ?? parseFloat(orderPart.discountPercent.toString());

      if (orderPart.isCustomerProvided) {
        // Клиентская запчасть - простой расчет
        updateData.totalAmount = price * quantity;
      } else {
        // Наша запчасть - с учетом скидки
        const subtotal = price * quantity;
        const discountAmount = subtotal * (discountPercent / 100);
        updateData.totalAmount = subtotal - discountAmount;
      }
    }

    // 🔒 Обновляем резерв на складе если изменилось количество
    if (quantityDifference !== 0 && !orderPart.isCustomerProvided) {
      await this.updateInventoryReservation(
        orderPart.partId,
        quantityDifference,
        orderPart.order?.companyId!
      );
    }

    const updatedOrderPart = await this.orderPartsDataService.update(id, updateData);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.ORDER_PART_UPDATED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        changes: this.detectChanges(orderPart, updateData),
        quantityChanged: quantityDifference !== 0,
        inventoryAdjusted: quantityDifference !== 0 && !orderPart.isCustomerProvided,
      },
    });

    this.logger.log(`Order part updated: ${id}`);
    return updatedOrderPart;
  }

  /**
   * 🔄 Переключение типа запчасти (клиентская/наша)
   */
  async toggleCustomerProvided(id: string, isCustomerProvided: boolean): Promise<OrderPart> {
    this.logger.log(`Toggling customer provided for part ${id}: ${isCustomerProvided}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) {
      throw new OrderPartNotFoundException(id);
    }

    const oldValue = orderPart.isCustomerProvided;
    
    if (oldValue === isCustomerProvided) {
      // Значение не изменилось
      return orderPart;
    }

    // 🔒 Управление резервом в зависимости от переключения
    if (isCustomerProvided && !oldValue) {
      // Переключаем НА клиентскую - освобождаем резерв
      await this.releaseInventoryReservation(
        orderPart.partId,
        orderPart.quantity,
        orderPart.order?.companyId!
      );
    } else if (!isCustomerProvided && oldValue) {
      // Переключаем С клиентской на нашу - резервируем
      await this.reservePartFromInventory(
        orderPart.partId,
        orderPart.quantity,
        orderPart.order?.companyId!
      );
    }

    // Пересчитываем стоимость в зависимости от типа
    let newPrice = parseFloat(orderPart.price.toString());
    let newTotalAmount: number;

    if (isCustomerProvided) {
      // Клиентская запчасть - обычно цена = 0 или цена за установку
      newPrice = 0;
      newTotalAmount = 0;
    } else {
      // Наша запчасть - восстанавливаем базовую цену из каталога
      const part = await this.orderPartsDataService.findPartByIdAndCompany(
        orderPart.partId,
        orderPart.order?.companyId!
      );
      newPrice = part ? parseFloat(part.sellingPrice.toString()) : newPrice;
      
      const subtotal = newPrice * orderPart.quantity;
      const discountAmount = subtotal * (parseFloat(orderPart.discountPercent.toString()) / 100);
      newTotalAmount = subtotal - discountAmount;
    }

    const updatedOrderPart = await this.orderPartsDataService.update(id, {
      isCustomerProvided,
      price: newPrice,
      totalAmount: newTotalAmount,
    });

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.ORDER_PART_UPDATED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        action: 'toggle_customer_provided',
        oldValue,
        newValue: isCustomerProvided,
        priceRecalculated: true,
        inventoryAdjusted: true,
      },
    });

    this.logger.log(`Customer provided toggled for part: ${id} → ${isCustomerProvided}`);
    return updatedOrderPart;
  }

  /**
   * ❌ Удаление запчасти из заказа
   */
  async removePartFromOrder(id: string): Promise<void> {
    this.logger.log(`Removing part from order: ${id}`);

    const orderPart = await this.orderPartsDataService.findById(id);
    if (!orderPart) {
      throw new OrderPartNotFoundException(id);
    }

    // 🔒 Освобождаем резерв если это наша запчасть
    if (!orderPart.isCustomerProvided) {
      await this.releaseInventoryReservation(
        orderPart.partId,
        orderPart.quantity,
        orderPart.order?.companyId!
      );
    }

    await this.orderPartsDataService.remove(id);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.ORDER_PART_REMOVED, {
      entityType: 'OrderPart',
      entityId: id,
      companyId: orderPart.order?.companyId,
      metadata: {
        orderId: orderPart.orderId,
        partId: orderPart.partId,
        partName: orderPart.part?.name,
        quantity: orderPart.quantity,
        isCustomerProvided: orderPart.isCustomerProvided,
        inventoryReleased: !orderPart.isCustomerProvided,
      },
    });

    this.logger.log(`Part removed from order: ${id}`);
  }

  /**
   * 📊 Проверка наличия запчасти на складе
   */
  async checkPartAvailability(orderId: string, partId: string): Promise<{
    partId: string;
    available: number;
    reserved: number;
    canAddToOrder: boolean;
    maxQuantity: number;
  }> {
    // Получаем заказ для определения компании
    const order = await this.orderPartsDataService.findById(orderId);
    if (!order?.order?.companyId) {
      throw new ValidationDataException('orderId', 'Заказ не найден');
    }

    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(
      partId,
      order.order.companyId
    );

    const available = inventory?.quantity || 0;
    const alreadyInOrder = await this.orderPartsDataService.getPartQuantityInOrder(orderId, partId);

    return {
      partId,
      available,
      reserved: 0, // TODO: Реализовать tracking резерва
      canAddToOrder: available > alreadyInOrder,
      maxQuantity: Math.max(0, available - alreadyInOrder),
    };
  }

  /**
   * 🔒 Резервирование запчасти на складе
   */
  private async reservePartFromInventory(
    partId: string, 
    quantity: number, 
    companyId: string
  ): Promise<void> {
    this.logger.log(`Reserving ${quantity} units of part ${partId} for company ${companyId}`);

    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${partId} не найдена на складе`
      );
    }

    if (inventory.quantity < quantity) {
      throw new ValidationDataException(
        'quantity',
        `Недостаточно запчастей на складе. Доступно: ${inventory.quantity}, требуется: ${quantity}`
      );
    }

    // Уменьшаем количество в инвентаре
    await this.orderPartsDataService.updateInventoryQuantity(partId, companyId, -quantity);
  }

  /**
   * 🔒 Освобождение резерва запчасти
   */
  private async releaseInventoryReservation(
    partId: string, 
    quantity: number, 
    companyId: string
  ): Promise<void> {
    this.logger.log(`Releasing ${quantity} units of part ${partId} for company ${companyId}`);

    // Увеличиваем количество в инвентаре
    await this.orderPartsDataService.updateInventoryQuantity(partId, companyId, quantity);
  }

  /**
   * 🔒 Обновление резерва (при изменении количества)
   */
  private async updateInventoryReservation(
    partId: string, 
    quantityChange: number, 
    companyId: string
  ): Promise<void> {
    if (quantityChange > 0) {
      // Увеличиваем количество - нужно зарезервировать больше
      await this.reservePartFromInventory(partId, quantityChange, companyId);
    } else if (quantityChange < 0) {
      // Уменьшаем количество - освобождаем резерв
      await this.releaseInventoryReservation(partId, Math.abs(quantityChange), companyId);
    }
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: OrderPart, updates: UpdateOrderPartData): Record<string, any> {
    const changes: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== original[key]) {
        changes[key] = {
          from: original[key],
          to: updates[key],
        };
      }
    });

    return changes;
  }
}
