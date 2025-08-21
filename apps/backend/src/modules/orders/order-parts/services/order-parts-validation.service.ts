// path: src/modules/orders/order-parts/services/order-parts-validation.service.ts
import { Injectable } from '@nestjs/common';
import { OrderPartsDataService } from './order-parts-data.service';
import { OrderPart } from '../../../../database/entities';
import { AddPartToOrderDto } from '../dto/request/add-part-to-order.dto';
import { UpdateOrderPartDto } from '../dto/request/update-order-part.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import {
  OrderPartNotFoundException,
  ValidationDataException,
  ResourceOwnershipException,
} from '../../../../common/exceptions/domain.exceptions';
import { ORDER_PARTS_CONSTRAINTS } from '../types/order-parts.types';
import { SubscriptionLimitsService } from '../../../subscriptions/services/subscription-limits.service';

@Injectable()
export class OrderPartsValidationService {
  constructor(
    private readonly orderPartsDataService: OrderPartsDataService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
  ) {}

  /**
   * 🔒 Валидация добавления запчасти в заказ
   */
  async validateAddPart(orderId: string, data: AddPartToOrderDto, user: RequestWithUser['user']): Promise<void> {
    // Проверка подписки/лимитов компании (активная подписка обязательна)
    await this.validateCompanyLimits(user.companyId);

    // Проверяем, что заказ принадлежит компании
    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) throw new ResourceOwnershipException('order', orderId);

    // Заказ не должен быть завершен/отменен
    if (order.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя добавлять запчасти в завершенный заказ');
    }
    if (order.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя добавлять запчасти в отмененный заказ');
    }

    // Запчасть должна принадлежать компании
    const part = await this.orderPartsDataService.findPartByIdAndCompany(data.partId, user.companyId);
    if (!part) {
      throw new ValidationDataException('partId', `Запчасть ${data.partId} не найдена или не принадлежит компании`);
    }

    // Запчасть ещё не должна быть в заказе
    const alreadyExists = await this.orderPartsDataService.existsInOrder(orderId, data.partId);
    if (alreadyExists) {
      throw new ValidationDataException('partId', 'Запчасть уже добавлена в заказ. Используйте обновление для изменения количества');
    }

    // Лимит позиций в заказе (констрейнт на уровне приложения)
    const currentParts = await this.orderPartsDataService.findByOrderId(orderId);
    if (currentParts.length >= ORDER_PARTS_CONSTRAINTS.MAX_PARTS_PER_ORDER) {
      throw new ValidationDataException(
        'partsLimit',
        `Превышен лимит запчастей в заказе (${ORDER_PARTS_CONSTRAINTS.MAX_PARTS_PER_ORDER})`,
      );
    }

    // Наличие на складе (если не клиентская запчасть)
    if (!data.isCustomerProvided) {
      await this.validateStockAvailability(data.partId, data.quantity || 1, user.companyId, orderId);
    }

    // Бизнес-правила
    this.validatePartBusinessRules(data);
  }

  /**
   * 🔒 Валидация обновления запчасти в заказе
   */
  async validateUpdatePart(orderId: string, partId: string, data: UpdateOrderPartDto): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) throw new OrderPartNotFoundException(partId);

    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя изменять запчасти в завершенном заказе');
    }
    if (orderPart.order?.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя изменять запчасти в отмененном заказе');
    }

    if (data.quantity !== undefined && data.quantity > orderPart.quantity && !orderPart.isCustomerProvided) {
      const additionalQuantity = data.quantity - orderPart.quantity;
      await this.validateStockAvailability(orderPart.partId, additionalQuantity, orderPart.order?.companyId!, orderId);
    }

    this.validateUpdateBusinessRules(data, orderPart);
    return orderPart;
  }

  /**
   * 🔒 Валидация удаления запчасти из заказа
   */
  async validateRemovePart(orderId: string, partId: string): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) throw new OrderPartNotFoundException(partId);

    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя удалять запчасти из завершенного заказа');
    }
    if (orderPart.order?.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя удалять запчасти из отмененного заказа');
    }

    return orderPart;
  }

  /**
   * 🔒 Валидация переключения типа запчасти
   */
  async validateToggleCustomerProvided(orderId: string, partId: string, isCustomerProvided: boolean): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) throw new OrderPartNotFoundException(partId);

    if (orderPart.order?.status === 'completed') {
      throw new ValidationDataException('orderStatus', 'Нельзя изменять тип запчасти в завершенном заказе');
    }

    // Если переключаем с клиентской на нашу — проверяем склад
    if (!isCustomerProvided && orderPart.isCustomerProvided) {
      await this.validateStockAvailability(orderPart.partId, orderPart.quantity, orderPart.order?.companyId!, orderId);
    }

    return orderPart;
  }

  async validateOrderPartExists(orderId: string, partId: string): Promise<OrderPart> {
    const orderPart = await this.orderPartsDataService.findByIdAndOrderId(partId, orderId);
    if (!orderPart) throw new OrderPartNotFoundException(partId);
    return orderPart;
  }

  /**
   * 📦 Проверка наличия на складе
   */
  private async validateStockAvailability(
    partId: string,
    requiredQuantity: number,
    companyId: string,
    excludeOrderId?: string,
  ): Promise<void> {
    const inventory = await this.orderPartsDataService.findInventoryByPartAndCompany(partId, companyId);
    if (!inventory) {
      throw new ValidationDataException('partId', `Запчасть ${partId} не найдена на складе`);
    }

    const alreadyInOrder = excludeOrderId ? await this.orderPartsDataService.getPartQuantityInOrder(excludeOrderId, partId) : 0;
    const availableQuantity = inventory.quantity + alreadyInOrder;

    if (availableQuantity < requiredQuantity) {
      throw new ValidationDataException(
        'quantity',
        `Недостаточно запчастей на складе. Доступно: ${availableQuantity}, требуется: ${requiredQuantity}`,
      );
    }

    if (inventory.quantity - requiredQuantity <= inventory.minQuantity) {
      console.warn(`Low stock warning: Part ${partId} will be below minimum quantity after this operation`);
    }
  }

  private validatePartBusinessRules(data: AddPartToOrderDto): void {
    if (data.quantity && data.quantity <= 0) {
      throw new ValidationDataException('quantity', 'Количество должно быть больше нуля');
    }
    if (data.quantity && data.quantity > ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART) {
      throw new ValidationDataException('quantity', `Количество не может превышать ${ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART}`);
    }
    if (data.customPrice && data.customPrice < 0) {
      throw new ValidationDataException('customPrice', 'Цена не может быть отрицательной');
    }
    if (data.discountPercent && (data.discountPercent < 0 || data.discountPercent > ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT)) {
      throw new ValidationDataException('discountPercent', `Процент скидки должен быть от 0 до ${ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT}`);
    }
    if (data.isCustomerProvided && data.customPrice && data.customPrice > 1000) {
      throw new ValidationDataException('customPrice', 'Клиентская запчасть не должна иметь высокую цену (только за установку)');
    }
  }

  private validateUpdateBusinessRules(data: UpdateOrderPartDto, currentPart: OrderPart): void {
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new ValidationDataException('quantity', 'Количество должно быть больше нуля');
    }
    if (data.quantity !== undefined && data.quantity > ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART) {
      throw new ValidationDataException('quantity', `Количество не может превышать ${ORDER_PARTS_CONSTRAINTS.MAX_QUANTITY_PER_PART}`);
    }
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationDataException('price', 'Цена не может быть отрицательной');
    }
    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT)) {
      throw new ValidationDataException('discountPercent', `Процент скидки должен быть от 0 до ${ORDER_PARTS_CONSTRAINTS.MAX_DISCOUNT_PERCENT}`);
    }
    if (data.isCustomerProvided !== undefined && data.isCustomerProvided !== currentPart.isCustomerProvided) {
      if (data.isCustomerProvided && data.price && data.price > 1000) {
        throw new ValidationDataException('price', 'При переключении на клиентскую запчасть цена не должна быть высокой');
      }
    }
  }

  /**
   * 🔒 Валидация прав доступа к заказу для bulk операций
   */
  async validateBulkOperation(orderId: string, user: RequestWithUser['user']): Promise<void> {
    const order = await this.orderPartsDataService.findOrderByIdAndCompany(orderId, user.companyId);
    if (!order) throw new ResourceOwnershipException('order', orderId);

    if (order.status === 'completed' || order.status === 'canceled') {
      throw new ValidationDataException('orderStatus', 'Нельзя выполнять bulk операции с завершенными или отмененными заказами');
    }

    // Дополнительно проверим подписку
    await this.validateCompanyLimits(user.companyId);
  }

  /**
   * 📊 Валидация лимитов компании через SubscriptionLimitsService
   */
  async validateCompanyLimits(companyId: string, additionalParts: number = 1): Promise<void> {
    try {
      const info = await this.subscriptionLimitsService.getCompanyLimitsInfo(companyId);

      // Требуем активную подписку для операций с заказами/складом
      if (!info.hasActiveSubscription) {
        throw new ValidationDataException('subscription', 'У компании нет активной подписки для работы с заказами и складом');
      }

      // Отдельного лимита "частей на заказ" в тарифе нет — действуют внутренние ограничения приложения (ORDER_PARTS_CONSTRAINTS)
      // При необходимости можно расширить тарифы и добавить maxOrderParts — поддержка готова на уровне сервиса.
    } catch (error) {
      // Fail-safe: не ломаем поток при технической ошибке проверки, но логируем
      console.warn(`⚠️ Ошибка проверки лимитов подписки для компании ${companyId}:`, error);
    }
  }
}
