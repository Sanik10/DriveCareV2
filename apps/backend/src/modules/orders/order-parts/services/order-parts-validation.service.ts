// src/modules/orders/order-parts/services/order-parts-validation.service.ts
import { Injectable } from '@nestjs/common';
import { OrderPartsDataService } from './order-parts-data.service';
import { OrderPart } from '../../../../database/entities';
import { AddPartToOrderDto } from '../dto/request/add-part-to-order.dto';
import { UpdateOrderPartDto } from '../dto/request/update-order-part.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { 
  OrderPartNotFoundException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../../common/exceptions/domain.exceptions';
import { ORDER_PARTS_CONSTRAINTS } from '../types/order-parts.types';

@Injectable()
export class OrderPartsValidationService {
  constructor(
    private readonly orderPartsDataService: OrderPartsDataService,
  ) {}

  /**
   * 🔒 Валидация добавления запчасти в заказ
   */
  async validateAddPart(
    orderId: string, 
    data: AddPartToOrderDto, 
    user: RequestWithUser['user']
  ): Promise<void> {
    // 🔒 Проверяем что заказ существует и принадлежит компании пользователя
    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) {
      throw new ResourceOwnershipException('order', orderId);
    }

    // 🔒 Проверяем что заказ не завершен и не отменен
    if (order.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя добавлять запчасти в завершенный заказ'
      );
    }

    if (order.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя добавлять запчасти в отмененный заказ'
      );
    }

    // 🔒 Проверяем что запчасть существует и принадлежит компании
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

    // 🔒 Проверяем что запчасть еще не добавлена в заказ
    const alreadyExists = await this.orderPartsDataService.existsInOrder(orderId, data.partId);
    if (alreadyExists) {
      throw new ValidationDataException(
        'partId',
        'Запчасть уже добавлена в заказ. Используйте обновление для изменения количества'
      );
    }

    // 🔒 Проверяем лимит количества запчастей в заказе
    const currentParts = await this.orderPartsDataService.findByOrderId(orderId);
    if (currentParts.length >= ORDER_PARTS_CONSTRAINTS.MAX_PARTS_PER_ORDER) {
      throw new ValidationDataException(
        'partsLimit',
        `Превышен лимит запчастей в заказе (${ORDER_PARTS_CONSTRAINTS.MAX_PARTS_PER_ORDER})`
      );
    }

    // 🔒 Проверяем наличие на складе (если не клиентская запчасть)
    if (!data.isCustomerProvided) {
      await this.validateStockAvailability(data.partId, data.quantity || 1, user.companyId, orderId);
    }

    // ✅ Валидация бизнес-правил
    this.validatePartBusinessRules(data);
  }

  /**
   * 🔒 Валидация обновления запчасти в заказе
   */
  async validateUpdatePart(
    orderId: string, 
    partId: string, 
    data: UpdateOrderPartDto
  ): Promise<OrderPart> {
    // 🔒 Проверяем существование запчасти в заказе
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) {
      throw new OrderPartNotFoundException(partId);
    }

    // 🔒 Проверяем что заказ можно изменять
    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя изменять запчасти в завершенном заказе'
      );
    }

    if (orderPart.order?.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя изменять запчасти в отмененном заказе'
      );
    }

    // 🔒 Проверяем наличие на складе при увеличении количества
    if (data.quantity !== undefined && data.quantity > orderPart.quantity && !orderPart.isCustomerProvided) {
      const additionalQuantity = data.quantity - orderPart.quantity;
      await this.validateStockAvailability(
        orderPart.partId, 
        additionalQuantity, 
        orderPart.order?.companyId!, 
        orderId
      );
    }

    // ✅ Валидация бизнес-правил для обновления
    this.validateUpdateBusinessRules(data, orderPart);

    return orderPart;
  }

  /**
   * 🔒 Валидация удаления запчасти из заказа
   */
  async validateRemovePart(orderId: string, partId: string): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) {
      throw new OrderPartNotFoundException(partId);
    }

    // 🔒 Проверяем что заказ можно изменять
    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя удалять запчасти из завершенного заказа'
      );
    }

    if (orderPart.order?.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя удалять запчасти из отмененного заказа'
      );
    }

    return orderPart;
  }

  /**
   * 🔒 Валидация переключения типа запчасти
   */
  async validateToggleCustomerProvided(
    orderId: string, 
    partId: string, 
    isCustomerProvided: boolean
  ): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) {
      throw new OrderPartNotFoundException(partId);
    }

    // 🔒 Проверяем что заказ можно изменять
    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя изменять тип запчасти в завершенном заказе'
      );
    }

    // 🔒 Проверяем наличие на складе при переключении С клиентской НА нашу
    if (!isCustomerProvided && orderPart.isCustomerProvided) {
      await this.validateStockAvailability(
        orderPart.partId, 
        orderPart.quantity, 
        orderPart.order?.companyId!, 
        orderId
      );
    }

    return orderPart;
  }

  /**
   * ✅ Проверка существования запчасти в заказе
   */
  async validateOrderPartExists(orderId: string, partId: string): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    
    if (!orderPart) {
      throw new OrderPartNotFoundException(partId);
    }

    return orderPart;
  }

  /**
   * 📦 Валидация наличия на складе
   */
  private async validateStockAvailability(
    partId: string, 
    requiredQuantity: number, 
    companyId: string,
    excludeOrderId?: string
  ): Promise<void> {
    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${partId} не найдена на складе`
      );
    }

    // Учитываем уже зарезервированное количество в текущем заказе
    const alreadyInOrder = excludeOrderId 
      ? await this.orderPartsDataService.getPartQuantityInOrder(excludeOrderId, partId)
      : 0;

    const availableQuantity = inventory.quantity + alreadyInOrder;

    if (availableQuantity < requiredQuantity) {
      throw new ValidationDataException(
        'quantity',
        `Недостаточно запчастей на складе. ` +
        `Доступно: ${availableQuantity}, требуется: ${requiredQuantity}`
      );
    }

    // 🚨 Предупреждение о низком остатке
    if (inventory.quantity - requiredQuantity <= inventory.minQuantity) {
      // Это не критическая ошибка, но можно логировать warning
      console.warn(
        `Low stock warning: Part ${partId} will be below minimum quantity after this operation`
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил для добавления запчасти
   */
  private validatePartBusinessRules(data: AddPartToOrderDto): void {
    // ✅ Проверка количества
    if (data.quantity && data.quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество должно быть больше нуля'
      );
    }

    if (data.quantity && data.quantity > ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART}`
      );
    }

    // ✅ Проверка цены
    if (data.customPrice && data.customPrice < 0) {
      throw new ValidationDataException(
        'customPrice',
        'Цена не может быть отрицательной'
      );
    }

    // ✅ Проверка скидки
    if (data.discountPercent && (data.discountPercent < 0 || data.discountPercent > ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT)) {
      throw new ValidationDataException(
        'discountPercent',
        `Процент скидки должен быть от 0 до ${ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT}`
      );
    }

    // ✅ Логическая проверка: клиентская запчасть не должна иметь высокую цену
    if (data.isCustomerProvided && data.customPrice && data.customPrice > 1000) {
      throw new ValidationDataException(
        'customPrice',
        'Клиентская запчасть не должна иметь высокую цену (только за установку)'
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил для обновления запчасти
   */
  private validateUpdateBusinessRules(data: UpdateOrderPartDto, currentPart: OrderPart): void {
    // ✅ Проверка количества
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество должно быть больше нуля'
      );
    }

    if (data.quantity !== undefined && data.quantity > ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART}`
      );
    }

    // ✅ Проверка цены
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationDataException(
        'price',
        'Цена не может быть отрицательной'
      );
    }

    // ✅ Проверка скидки
    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT)) {
      throw new ValidationDataException(
        'discountPercent',
        `Процент скидки должен быть от 0 до ${ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT}`
      );
    }

    // ✅ Логическая проверка изменения типа
    if (data.isCustomerProvided !== undefined && data.isCustomerProvided !== currentPart.isCustomerProvided) {
      if (data.isCustomerProvided && data.price && data.price > 1000) {
        throw new ValidationDataException(
          'price',
          'При переключении на клиентскую запчасть цена не должна быть высокой'
        );
      }
    }
  }

  /**
   * 🔒 Валидация прав доступа к заказу для bulk операций
   */
  async validateBulkOperation(orderId: string, user: RequestWithUser['user']): Promise<void> {
    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    
    if (!order) {
      throw new ResourceOwnershipException('order', orderId);
    }

    if (order.status === 'completed' || order.status === 'canceled') {
      throw new ValidationDataException(
        'orderStatus',
        'Нельзя выполнять bulk операции с завершенными или отмененными заказами'
      );
    }
  }

  /**
   * 📊 Валидация лимитов компании (интеграция с SubscriptionLimitsService)
   */
  async validateCompanyLimits(companyId: string, additionalParts: number = 1): Promise<void> {
    // TODO: Интеграция с SubscriptionLimitsService
    // const subscription = await this.subscriptionLimitsService.checkLimits(companyId, 'parts');
    // if (!subscription.canCreate) {
    //   throw new CompanyLimitExceededException('parts', subscription.current, subscription.limit);
    // }
  }
}
