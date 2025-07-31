// src/modules/inventory/stock-movements/services/stock-movements-validation.service.ts
import { Injectable } from '@nestjs/common';
import { StockMovementsDataService } from './stock-movements-data.service';
import { StockMovement } from '../../../../database/entities';
import { 
  CreateMovementData, 
  BulkMovementRequest,
  StockImpactAnalysis 
} from '../types/stock-movements.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { 
  ValidationDataException,
  ResourceOwnershipException,
  StockMovementNotFoundException,
  InsufficientStockException
} from '../../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import { STOCK_MOVEMENT_CONSTRAINTS } from '../types/stock-movements.types';

@Injectable()
export class StockMovementsValidationService {
  constructor(
    private readonly stockMovementsDataService: StockMovementsDataService,
  ) {}

  /**
   * 🔒 Валидация существования движения
   */
  async validateMovementExists(id: string): Promise<StockMovement> {
    const movement = await this.stockMovementsDataService.findById(id);
    
    if (!movement) {
      throw new StockMovementNotFoundException(id);
    }

    return movement;
  }

  /**
   * 🔒 Валидация принадлежности движения компании
   */
  async validateMovementOwnership(
    movementId: string, 
    userCompanyId: string
  ): Promise<StockMovement> {
    const movement = await this.stockMovementsDataService.findByIdForCompany(
      movementId, 
      userCompanyId
    );
    
    if (!movement) {
      throw new ResourceOwnershipException('stock_movement', movementId);
    }

    return movement;
  }

  /**
   * ✅ Валидация создания движения
   */
  async validateCreateMovement(data: CreateMovementData): Promise<void> {
    // 🔒 Проверяем существование компании
    const companyExists = await this.stockMovementsDataService.validateCompanyExists(data.companyId);
    if (!companyExists) {
      throw new ValidationDataException(
        'companyId',
        `Компания ${data.companyId} не найдена`
      );
    }

    // 🔒 Проверяем существование и принадлежность запчасти
    const part = await this.stockMovementsDataService.validatePartExists(
      data.partId, 
      data.companyId
    );
    
    if (!part) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${data.partId} не найдена или не принадлежит компании`
      );
    }

    // ✅ Валидация количества
    this.validateQuantity(data.quantity, data.type);

    // ✅ Валидация цен
    this.validatePricing(data.price, data.totalAmount, data.quantity);

    // 🔒 Валидация поставщика (если указан)
    if (data.supplierId) {
      await this.validateSupplier(data.supplierId, data.companyId);
    }

    // ✅ Валидация пользователя
    await this.validateUser(data.userId);

    // ✅ Валидация документа
    this.validateDocumentNumber(data.documentNumber);

    // ✅ Валидация заметок
    this.validateNotes(data.notes);

    // ✅ Валидация даты
    this.validateMovementDate(data.movementDate);

    // 🔒 Проверка на отрицательный остаток (если запрещен)
    if (data.type === 'issue' || (data.type === 'adjustment' && data.quantity < 0)) {
      await this.validateSufficientStock(data.partId, data.quantity, data.companyId);
    }

    // ✅ Валидация бизнес-правил по типу движения
    this.validateMovementTypeRules(data);
  }

  /**
   * ✅ Валидация bulk операции
   */
  async validateBulkMovements(
    request: BulkMovementRequest,
    user: RequestWithUser['user']
  ): Promise<void> {
    // ✅ Проверка количества операций
    if (request.movements.length === 0) {
      throw new ValidationDataException(
        'movements',
        'Список движений не может быть пустым'
      );
    }

    if (request.movements.length > STOCK_MOVEMENT_CONSTRAINTS.MAX_BULK_OPERATIONS) {
      throw new ValidationDataException(
        'movements',
        `Bulk операция не может содержать более ${STOCK_MOVEMENT_CONSTRAINTS.MAX_BULK_OPERATIONS} движений`
      );
    }

    // 🔒 Проверяем все partId на принадлежность компании
    const partIds = request.movements.map(m => m.partId);
    const uniquePartIds = [...new Set(partIds)];

    for (const partId of uniquePartIds) {
      const part = await this.stockMovementsDataService.validatePartExists(
        partId, 
        user.companyId
      );
      
      if (!part) {
        throw new ValidationDataException(
          'partId',
          `Запчасть ${partId} не найдена или не принадлежит компании`
        );
      }
    }

    // 🔒 Валидация поставщика (если указан)
    if (request.supplierId) {
      await this.validateSupplier(request.supplierId, user.companyId);
    }

    // ✅ Валидация каждого движения
    for (let i = 0; i < request.movements.length; i++) {
      const movement = request.movements[i];
      
      try {
        // Создаем полные данные для валидации
        const movementData: CreateMovementData = {
          ...movement,
          companyId: user.companyId,
          userId: user.id,
          supplierId: request.supplierId,
          orderId: request.orderId,
          documentNumber: request.documentNumber,
        };

        await this.validateCreateMovement(movementData);
      } catch (error) {
        throw new ValidationDataException(
          `movements[${i}]`,
          `Ошибка в движении ${i + 1}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        );
      }
    }
  }

  /**
   * ✅ Валидация сканирования штрих-кода
   */
  async validateBarcodeMovement(
    barcode: string,
    quantity: number,
    type: 'receipt' | 'issue',
    user: RequestWithUser['user']
  ): Promise<void> {
    // ✅ Валидация штрих-кода
    if (!barcode || barcode.trim().length === 0) {
      throw new ValidationDataException(
        'barcode',
        'Штрих-код не может быть пустым'
      );
    }

    if (barcode.length > 50) {
      throw new ValidationDataException(
        'barcode',
        'Штрих-код не может превышать 50 символов'
      );
    }

    // ✅ Валидация количества
    if (quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество должно быть больше нуля'
      );
    }

    if (quantity > STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY}`
      );
    }

    // ✅ Валидация типа
    if (!['receipt', 'issue'].includes(type)) {
      throw new ValidationDataException(
        'type',
        'Тип должен быть receipt или issue'
      );
    }

    // TODO: Проверить существование запчасти с таким штрих-кодом
    // Пока пропускаем, т.к. нужна интеграция с parts модулем
  }

  /**
   * 🔒 Валидация отмены движения
   */
  async validateReverseMovement(
    movementId: string,
    user: RequestWithUser['user'],
    reason: string
  ): Promise<StockMovement> {
    // 🔒 Проверяем принадлежность движения
    const movement = await this.validateMovementOwnership(movementId, user.companyId);

    // ✅ Проверяем что движение не отменено
    if (movement.reversedByMovementId) {
      throw new ValidationDataException(
        'movement',
        'Это движение уже отменено'
      );
    }

    // ✅ Проверяем что движение можно отменить (временные ограничения)
    const movementAge = Date.now() - movement.createdAt.getTime();
    const maxAgeHours = 24; // Можно отменить только в течение 24 часов
    
    if (movementAge > maxAgeHours * 60 * 60 * 1000) {
      throw new ValidationDataException(
        'movement',
        `Движение можно отменить только в течение ${maxAgeHours} часов после создания`
      );
    }

    // ✅ Валидация причины отмены
    if (!reason || reason.trim().length === 0) {
      throw new ValidationDataException(
        'reason',
        'Причина отмены обязательна'
      );
    }

    if (reason.length > 500) {
      throw new ValidationDataException(
        'reason',
        'Причина отмены не может превышать 500 символов'
      );
    }

    // 🔒 Проверяем что отмена не приведет к отрицательному остатку
    if (movement.quantity > 0) { // Если это был приход, отмена уменьшит остаток
      const currentStock = await this.stockMovementsDataService.getCurrentStock(
        movement.partId, 
        user.companyId
      );
      
      if (!INVENTORY_CONSTANTS.BUSINESS_RULES.ALLOW_NEGATIVE_STOCK && 
          currentStock < movement.quantity) {
        throw new InsufficientStockException(
          movement.partId,
          movement.quantity,
          currentStock
        );
      }
    }

    return movement;
  }

  /**
   * 🔒 Валидация прав доступа к операции
   */
  async validateOperationPermissions(
    operation: string,
    userRole: string,
    movementId?: string,
    userCompanyId?: string
  ): Promise<void> {
    const permissions = INVENTORY_CONSTANTS.ROLES;

    switch (operation) {
      case 'view':
        if (!permissions.CAN_VIEW.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для просмотра движений склада'
          );
        }
        break;

      case 'create':
        if (!permissions.CAN_UPDATE_QUANTITIES.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для создания движений'
          );
        }
        break;

      case 'update':
        if (!permissions.CAN_UPDATE_QUANTITIES.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для изменения движений'
          );
        }
        break;

      case 'reverse':
        if (!permissions.CAN_CREATE_ADJUSTMENTS.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для отмены движений'
          );
        }
        break;

      case 'view_costs':
        if (!permissions.CAN_VIEW_COSTS.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для просмотра стоимости'
          );
        }
        break;

      default:
        throw new ValidationDataException(
          'operation',
          `Неизвестная операция: ${operation}`
        );
    }

    // Дополнительная проверка ownership для конкретного движения
    if (movementId && userCompanyId) {
      await this.validateMovementOwnership(movementId, userCompanyId);
    }
  }

  /**
   * ✅ Валидация количества
   */
  private validateQuantity(quantity: number, type: string): void {
    if (quantity === 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество не может быть равно нулю'
      );
    }

    if (Math.abs(quantity) > STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY}`
      );
    }

    // Проверяем логику знака количества
    if (type === 'receipt' && quantity < 0) {
      throw new ValidationDataException(
        'quantity',
        'Для прихода количество должно быть положительным'
      );
    }

    if (type === 'issue' && quantity > 0) {
      throw new ValidationDataException(
        'quantity',
        'Для расхода количество должно быть отрицательным'
      );
    }
  }

  /**
   * ✅ Валидация цен
   */
  private validatePricing(
    price?: number, 
    totalAmount?: number, 
    quantity?: number
  ): void {
    if (price !== undefined) {
      if (price < 0) {
        throw new ValidationDataException(
          'price',
          'Цена не может быть отрицательной'
        );
      }

      if (price > 10000000) { // 10 млн максимум
        throw new ValidationDataException(
          'price',
          'Цена не может превышать 10,000,000'
        );
      }
    }

    if (totalAmount !== undefined) {
      if (totalAmount < 0) {
        throw new ValidationDataException(
          'totalAmount',
          'Общая сумма не может быть отрицательной'
        );
      }

      if (totalAmount > 100000000) { // 100 млн максимум
        throw new ValidationDataException(
          'totalAmount',
          'Общая сумма не может превышать 100,000,000'
        );
      }

      // Проверяем консистентность цены и общей суммы
      if (price && quantity && Math.abs(quantity) > 0) {
        const calculatedTotal = price * Math.abs(quantity);
        const tolerance = 0.01; // 1 копейка погрешность
        
        if (Math.abs(calculatedTotal - totalAmount) > tolerance) {
          throw new ValidationDataException(
            'totalAmount',
            `Общая сумма не соответствует расчету: ${price} × ${Math.abs(quantity)} = ${calculatedTotal}`
          );
        }
      }
    }
  }

  /**
   * 🔒 Валидация поставщика
   */
  private async validateSupplier(supplierId: string, companyId: string): Promise<void> {
    const supplier = await this.stockMovementsDataService.findSupplierForCompany(
      supplierId, 
      companyId
    );
    
    if (!supplier) {
      throw new ValidationDataException(
        'supplierId',
        `Поставщик ${supplierId} не найден или не принадлежит компании`
      );
    }

    if (!supplier.isActive) {
      throw new ValidationDataException(
        'supplierId',
        'Поставщик неактивен'
      );
    }
  }

  /**
   * ✅ Валидация пользователя
   */
  private async validateUser(userId: string): Promise<void> {
    const user = await this.stockMovementsDataService.findUserById(userId);
    
    if (!user) {
      throw new ValidationDataException(
        'userId',
        `Пользователь ${userId} не найден`
      );
    }
  }

  /**
   * ✅ Валидация номера документа
   */
  private validateDocumentNumber(documentNumber?: string): void {
    if (documentNumber) {
      if (documentNumber.length > STOCK_MOVEMENT_CONSTRAINTS.MAX_DOCUMENT_NUMBER_LENGTH) {
        throw new ValidationDataException(
          'documentNumber',
          `Номер документа не может превышать ${STOCK_MOVEMENT_CONSTRAINTS.MAX_DOCUMENT_NUMBER_LENGTH} символов`
        );
      }

      // Проверяем на недопустимые символы
      const validPattern = /^[a-zA-Z0-9\-_\.\/\s]+$/;
      if (!validPattern.test(documentNumber)) {
        throw new ValidationDataException(
          'documentNumber',
          'Номер документа может содержать только буквы, цифры, дефисы, подчеркивания, точки и пробелы'
        );
      }
    }
  }

  /**
   * ✅ Валидация заметок
   */
  private validateNotes(notes?: string): void {
    if (notes) {
      if (notes.length > STOCK_MOVEMENT_CONSTRAINTS.MAX_NOTES_LENGTH) {
        throw new ValidationDataException(
          'notes',
          `Заметки не могут превышать ${STOCK_MOVEMENT_CONSTRAINTS.MAX_NOTES_LENGTH} символов`
        );
      }

      // Проверяем на потенциально опасный контент
      if (notes.includes('<script>') || notes.includes('javascript:')) {
        throw new ValidationDataException(
          'notes',
          'Заметки содержат недопустимые символы'
        );
      }
    }
  }

  /**
   * ✅ Валидация даты движения
   */
  private validateMovementDate(movementDate?: Date): void {
    if (movementDate) {
      const now = new Date();
      
      // Не в будущем
      if (movementDate > now) {
        throw new ValidationDataException(
          'movementDate',
          'Дата движения не может быть в будущем'
        );
      }

      // Не слишком в прошлом (более 1 года)
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      if (movementDate < oneYearAgo) {
        throw new ValidationDataException(
          'movementDate',
          'Дата движения не может быть более года назад'
        );
      }
    }
  }

  /**
   * 🔒 Проверка достаточности остатка
   */
  private async validateSufficientStock(
    partId: string,
    quantity: number,
    companyId: string
  ): Promise<void> {
    if (!INVENTORY_CONSTANTS.BUSINESS_RULES.ALLOW_NEGATIVE_STOCK) {
      const currentStock = await this.stockMovementsDataService.getCurrentStock(partId, companyId);
      const requiredQuantity = Math.abs(quantity);
      
      if (currentStock < requiredQuantity) {
        throw new InsufficientStockException(
          partId,
          requiredQuantity,
          currentStock
        );
      }
    }
  }

  /**
   * ✅ Валидация бизнес-правил по типу движения
   */
  private validateMovementTypeRules(data: CreateMovementData): void {
    // Проверяем что поставщик указан только для прихода
    if (data.supplierId && data.type !== 'receipt') {
      throw new ValidationDataException(
        'supplierId',
        'Поставщик может быть указан только для прихода товара'
      );
    }

    // Проверяем что заказ указан только для расхода
    if (data.orderId && data.type !== 'issue') {
      throw new ValidationDataException(
        'orderId',
        'Заказ может быть указан только для расхода товара'
      );
    }

    // Проверяем что цена указана для прихода
    if (data.type === 'receipt' && data.reason === 'purchase' && !data.price) {
      throw new ValidationDataException(
        'price',
        'Для прихода от поставщика необходимо указать цену'
      );
    }
  }
}
