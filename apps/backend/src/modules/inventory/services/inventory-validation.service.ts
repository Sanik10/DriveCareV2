// src/modules/inventory/services/inventory-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InventoryDataService } from './inventory-data.service';
import { Inventory } from '../../../database/entities';
import { UpdateInventoryDto } from '../dto/request/update-inventory.dto';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { 
  InventoryNotFoundException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@Injectable()
export class InventoryValidationService {
  constructor(
    private readonly inventoryDataService: InventoryDataService,
  ) {}

  /**
   * 🔒 Валидация существования позиции склада
   */
  async validateInventoryExists(id: string): Promise<Inventory> {
    const inventory = await this.inventoryDataService.findById(id);
    
    if (!inventory) {
      throw new InventoryNotFoundException(id);
    }

    return inventory;
  }

  /**
   * 🔒 Валидация обновления позиции склада
   */
  async validateUpdateData(id: string, data: UpdateInventoryDto): Promise<Inventory> {
    // Проверяем существование позиции
    const inventory = await this.validateInventoryExists(id);

    // Валидация бизнес-правил
    this.validateInventoryBusinessRules(data, inventory);

    return inventory;
  }

  /**
   * 🔒 Валидация резервирования запчастей
   */
  async validateReservation(
    reservationData: {
      partId: string;
      quantity: number;
      orderId?: string;
      expiresAt?: Date;
    },
    user: RequestWithUser['user']
  ): Promise<void> {
    // 🔒 Проверяем что запчасть принадлежит компании пользователя
    const part = await this.inventoryDataService.findPartByIdAndCompany(
      reservationData.partId, 
      user.companyId
    );

    if (!part) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${reservationData.partId} не найдена или не принадлежит компании`
      );
    }

    // 🔒 Проверяем существование позиции на складе
    const inventory = await this.inventoryDataService.findByPartAndCompany(
      reservationData.partId,
      user.companyId
    );

    if (!inventory) {
      throw new ValidationDataException(
        'partId',
        `Позиция на складе для запчасти ${reservationData.partId} не найдена`
      );
    }

    // ✅ Валидация количества
    if (reservationData.quantity <= 0) {
      throw new ValidationDataException(
        'quantity',
        'Количество для резервирования должно быть больше нуля'
      );
    }

    if (reservationData.quantity > INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX}`
      );
    }

    // 🔒 Проверяем доступность для резервирования
    const availability = await this.inventoryDataService.checkReservationAvailability(
      reservationData.partId,
      reservationData.quantity,
      user.companyId
    );

    if (!availability.canReserve) {
      throw new ValidationDataException(
        'quantity',
        `Недостаточно запчастей для резервирования. ` +
        `Доступно: ${availability.available}, требуется: ${reservationData.quantity}`
      );
    }

    // ✅ Валидация даты истечения резерва
    if (reservationData.expiresAt) {
      const now = new Date();
      const maxExpiryDate = new Date(now.getTime() + INVENTORY_CONSTANTS.DEFAULTS.RESERVATION_EXPIRY_HOURS * 60 * 60 * 1000);

      if (reservationData.expiresAt <= now) {
        throw new ValidationDataException(
          'expiresAt',
          'Дата истечения резерва не может быть в прошлом'
        );
      }

      if (reservationData.expiresAt > maxExpiryDate) {
        throw new ValidationDataException(
          'expiresAt',
          `Дата истечения резерва не может быть более чем через ${INVENTORY_CONSTANTS.DEFAULTS.RESERVATION_EXPIRY_HOURS} часов`
        );
      }
    }
  }

  /**
   * 🔒 Валидация прав доступа к позиции склада
   */
  async validateInventoryOwnership(
    inventoryId: string, 
    userCompanyId: string
  ): Promise<Inventory> {
    const inventory = await this.inventoryDataService.findById(inventoryId);
    
    if (!inventory) {
      throw new InventoryNotFoundException(inventoryId);
    }

    if (inventory.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('inventory', inventoryId);
    }

    return inventory;
  }

  /**
   * 🔒 Валидация bulk операций
   */
  async validateBulkOperation(
    partIds: string[], 
    user: RequestWithUser['user']
  ): Promise<void> {
    if (partIds.length === 0) {
      throw new ValidationDataException(
        'partIds',
        'Список запчастей не может быть пустым'
      );
    }

    if (partIds.length > 100) {
      throw new ValidationDataException(
        'partIds',
        'Bulk операция не может содержать более 100 позиций'
      );
    }

    // 🔒 Проверяем что все запчасти принадлежат компании
    const parts = await this.inventoryDataService.findMultipleByCompany(partIds, user.companyId);
    
    if (parts.length !== partIds.length) {
      const foundPartIds = parts.map(p => p.partId);
      const missingPartIds = partIds.filter(id => !foundPartIds.includes(id));
      
      throw new ValidationDataException(
        'partIds',
        `Следующие запчасти не найдены или не принадлежат компании: ${missingPartIds.join(', ')}`
      );
    }
  }

  /**
   * ✅ Валидация создания новой позиции склада
   */
  async validateCreateInventory(
    partId: string, 
    companyId: string,
    initialQuantity: number = 0
  ): Promise<void> {
    // 🔒 Проверяем что запчасть принадлежит компании
    const part = await this.inventoryDataService.findPartByIdAndCompany(partId, companyId);
    
    if (!part) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${partId} не найдена или не принадлежит компании`
      );
    }

    // 🔒 Проверяем что позиция еще не существует
    const existingInventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    
    if (existingInventory) {
      throw new ValidationDataException(
        'partId',
        `Позиция склада для запчасти ${partId} уже существует`
      );
    }

    // ✅ Валидация начального количества
    if (initialQuantity < 0) {
      throw new ValidationDataException(
        'quantity',
        'Начальное количество не может быть отрицательным'
      );
    }

    if (initialQuantity > INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX}`
      );
    }
  }

  /**
   * 🔒 Валидация обновления количества (для движений)
   */
  async validateQuantityUpdate(
    inventoryId: string,
    newQuantity: number,
    reason: string,
    userCompanyId: string
  ): Promise<Inventory> {
    // Проверяем права доступа
    const inventory = await this.validateInventoryOwnership(inventoryId, userCompanyId);

    // ✅ Валидация нового количества
    if (newQuantity < 0 && !INVENTORY_CONSTANTS.BUSINESS_RULES.ALLOW_NEGATIVE_STOCK) {
      throw new ValidationDataException(
        'quantity',
        'Отрицательный остаток на складе не разрешен'
      );
    }

    if (newQuantity > INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX) {
      throw new ValidationDataException(
        'quantity',
        `Количество не может превышать ${INVENTORY_CONSTANTS.VALIDATION.QUANTITY.MAX}`
      );
    }

    // ✅ Валидация причины изменения
    if (!reason || reason.trim().length === 0) {
      throw new ValidationDataException(
        'reason',
        'Причина изменения количества обязательна'
      );
    }

    return inventory;
  }

  /**
   * 🔒 Валидация удаления позиции склада
   */
  async validateDeleteInventory(
    inventoryId: string,
    userCompanyId: string
  ): Promise<Inventory> {
    const inventory = await this.validateInventoryOwnership(inventoryId, userCompanyId);

    // ✅ Проверяем что количество = 0
    if (inventory.quantity > 0) {
      throw new ValidationDataException(
        'quantity',
        'Нельзя удалить позицию склада с ненулевым остатком'
      );
    }

    // TODO: Проверить что нет активных резервирований
    // TODO: Проверить что нет активных заказов с этой запчастью

    return inventory;
  }

  /**
   * 📊 Валидация параметров отчета
   */
  async validateReportParams(params: {
    companyId: string;
    dateFrom?: Date;
    dateTo?: Date;
    categoryId?: string;
  }): Promise<void> {
    // 🔒 Проверяем существование компании
    const companyExists = await this.inventoryDataService.validateCompanyExists(params.companyId);
    
    if (!companyExists) {
      throw new ValidationDataException(
        'companyId',
        `Компания ${params.companyId} не найдена`
      );
    }

    // ✅ Валидация дат
    if (params.dateFrom && params.dateTo) {
      if (params.dateFrom >= params.dateTo) {
        throw new ValidationDataException(
          'dateRange',
          'Дата начала должна быть раньше даты окончания'
        );
      }

      // Ограничиваем период отчета
      const maxPeriodDays = 365;
      const periodMs = params.dateTo.getTime() - params.dateFrom.getTime();
      const periodDays = periodMs / (1000 * 60 * 60 * 24);

      if (periodDays > maxPeriodDays) {
        throw new ValidationDataException(
          'dateRange',
          `Период отчета не может превышать ${maxPeriodDays} дней`
        );
      }
    }

    // ✅ Валидация категории (если указана)
    if (params.categoryId) {
      // TODO: Проверить существование категории
    }
  }

  /**
   * 📋 Валидация бизнес-правил для инвентаря
   */
  private validateInventoryBusinessRules(data: UpdateInventoryDto, currentInventory: Inventory): void {
    // ✅ Валидация минимального количества
    if (data.minQuantity !== undefined) {
      if (data.minQuantity < INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MIN) {
        throw new ValidationDataException(
          'minQuantity',
          `Минимальное количество не может быть меньше ${INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MIN}`
        );
      }

      if (data.minQuantity > INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MAX) {
        throw new ValidationDataException(
          'minQuantity',
          `Минимальное количество не может превышать ${INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MAX}`
        );
      }

      // Логическая проверка: минимальное количество не должно быть больше текущего в разы
      if (data.minQuantity > currentInventory.quantity * 10) {
        throw new ValidationDataException(
          'minQuantity',
          'Минимальное количество не должно превышать текущий остаток в 10 раз'
        );
      }
    }

    // ✅ Валидация местоположения
    if (data.location !== undefined) {
      if (data.location && !INVENTORY_CONSTANTS.VALIDATION.LOCATION.PATTERN.test(data.location)) {
        throw new ValidationDataException(
          'location',
          'Местоположение должно содержать только буквы, цифры и дефисы (например: A1-B2, SHELF-1)'
        );
      }
    }

    // ✅ Валидация даты последнего пополнения
    if (data.lastRestockDate !== undefined) {
      const restockDate = new Date(data.lastRestockDate);
      const now = new Date();
      
      if (restockDate > now) {
        throw new ValidationDataException(
          'lastRestockDate',
          'Дата последнего пополнения не может быть в будущем'
        );
      }

      // Проверяем что дата не слишком старая (более 10 лет назад)
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      if (restockDate < tenYearsAgo) {
        throw new ValidationDataException(
          'lastRestockDate',
          'Дата последнего пополнения не может быть более 10 лет назад'
        );
      }
    }

    // ✅ Валидация заметок
    if (data.notes !== undefined && data.notes) {
      if (data.notes.length > INVENTORY_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
        throw new ValidationDataException(
          'notes',
          `Заметки не должны превышать ${INVENTORY_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
        );
      }

      // Проверяем на запрещенные символы или спам
      if (data.notes.includes('<script>') || data.notes.includes('javascript:')) {
        throw new ValidationDataException(
          'notes',
          'Заметки содержат недопустимые символы'
        );
      }
    }
  }

  /**
   * 🔒 Валидация прав доступа к операции
   */
  async validateOperationPermissions(
    operation: string,
    userRole: string,
    inventoryId?: string,
    userCompanyId?: string
  ): Promise<void> {
    const permissions = INVENTORY_CONSTANTS.ROLES;

    switch (operation) {
      case 'view':
        if (!permissions.CAN_VIEW.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для просмотра склада'
          );
        }
        break;

      case 'update_quantities':
        if (!permissions.CAN_UPDATE_QUANTITIES.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для изменения количества'
          );
        }
        break;

      case 'update_settings':
        if (!permissions.CAN_UPDATE_SETTINGS.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для изменения настроек склада'
          );
        }
        break;

      case 'delete':
        if (!permissions.CAN_DELETE.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для удаления позиций склада'
          );
        }
        break;

      case 'view_costs':
        if (!permissions.CAN_VIEW_COSTS.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для просмотра себестоимости'
          );
        }
        break;

      default:
        throw new ValidationDataException(
          'operation',
          `Неизвестная операция: ${operation}`
        );
    }

    // Дополнительная проверка ownership для конкретной позиции
    if (inventoryId && userCompanyId) {
      await this.validateInventoryOwnership(inventoryId, userCompanyId);
    }
  }
}
