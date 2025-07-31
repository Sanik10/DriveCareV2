// src/modules/inventory/suppliers/services/suppliers-validation.service.ts
import { Injectable } from '@nestjs/common';
import { SuppliersDataService } from './suppliers-data.service';
import { Supplier } from '../../../../database/entities';
import { CreateSupplierDto } from '../dto/request/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/request/update-supplier.dto';
import { BulkSuppliersDto } from '../dto/request/bulk-suppliers.dto';
import { 
  CreateSupplierData, 
  SupplierRatingData, 
  SUPPLIER_CONSTRAINTS 
} from '../types/suppliers.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { 
  SupplierNotFoundException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';

@Injectable()
export class SuppliersValidationService {
  constructor(
    private readonly suppliersDataService: SuppliersDataService,
  ) {}

  /**
   * 🔒 Валидация существования поставщика с проверкой ownership
   */
  async validateSupplierExists(id: string): Promise<Supplier> {
    const supplier = await this.suppliersDataService.findById(id);
    
    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    return supplier;
  }

  /**
   * 🔒 Валидация ownership поставщика (используется в Guard)
   */
  async validateSupplierOwnership(
    supplierId: string, 
    userCompanyId: string
  ): Promise<Supplier> {
    const supplier = await this.suppliersDataService.findById(supplierId);
    
    if (!supplier) {
      throw new SupplierNotFoundException(supplierId);
    }

    if (supplier.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('supplier', supplierId);
    }

    return supplier;
  }

  /**
   * ✅ Валидация создания поставщика
   */
  async validateCreateSupplier(
    data: CreateSupplierData & CreateSupplierDto,
    user: RequestWithUser['user']
  ): Promise<void> {
    // 🔒 Проверяем лимиты компании
    await this.validateCompanySupplierLimits(user.companyId);

    // ✅ Проверяем уникальность email в компании
    if (data.email) {
      await this.validateEmailUniqueness(data.email, user.companyId);
    }

    // ✅ Проверяем уникальность налогового номера в компании
    if (data.taxNumber) {
      await this.validateTaxNumberUniqueness(data.taxNumber, user.companyId);
    }

    // ✅ Валидация бизнес-правил
    this.validateSupplierBusinessRules(data);

    // 🔐 Проверяем права на создание поставщиков
    this.validateCreatePermissions(user);
  }

  /**
   * ✅ Валидация обновления поставщика
   */
  async validateUpdateSupplier(
    id: string,
    data: UpdateSupplierDto,
    user: RequestWithUser['user']
  ): Promise<Supplier> {
    // 🔒 Проверяем существование и ownership
    const supplier = await this.validateSupplierOwnership(id, user.companyId);

    // ✅ Проверяем уникальность email (если изменяется)
    if (data.email && data.email !== supplier.email) {
      await this.validateEmailUniqueness(data.email, user.companyId, id);
    }

    // ✅ Проверяем уникальность налогового номера (если изменяется)
    if (data.taxNumber && data.taxNumber !== supplier.taxNumber) {
      await this.validateTaxNumberUniqueness(data.taxNumber, user.companyId, id);
    }

    // ✅ Валидация бизнес-правил для обновления
    this.validateUpdateBusinessRules(data, supplier);

    // 🔐 Проверяем права на обновление
    this.validateUpdatePermissions(user, supplier);

    return supplier;
  }

  /**
   * ✅ Валидация деактивации поставщика
   */
  async validateDeactivateSupplier(
    id: string,
    user: RequestWithUser['user']
  ): Promise<Supplier> {
    // 🔒 Проверяем существование и ownership
    const supplier = await this.validateSupplierOwnership(id, user.companyId);

    // ✅ Проверяем что поставщик активен
    if (!supplier.isActive) {
      throw new ValidationDataException(
        'status',
        'Поставщик уже деактивирован'
      );
    }

    // ✅ Проверяем наличие активных заказов
    const hasActiveOrders = await this.suppliersDataService.hasActiveOrders(id);
    if (hasActiveOrders) {
      throw new ValidationDataException(
        'activeOrders',
        'Нельзя деактивировать поставщика с активными заказами'
      );
    }

    // ✅ Проверяем наличие неоплаченных счетов
    const hasUnpaidInvoices = await this.suppliersDataService.hasUnpaidInvoices(id);
    if (hasUnpaidInvoices) {
      throw new ValidationDataException(
        'unpaidInvoices',
        'Нельзя деактивировать поставщика с неоплаченными счетами'
      );
    }

    // 🔐 Проверяем права на деактивацию
    this.validateDeactivatePermissions(user);

    return supplier;
  }

  /**
   * ⭐ Валидация оценки поставщика
   */
  async validateRateSupplier(
    id: string,
    ratingData: SupplierRatingData,
    user: RequestWithUser['user']
  ): Promise<Supplier> {
    // 🔒 Проверяем существование и ownership
    const supplier = await this.validateSupplierOwnership(id, user.companyId);

    // ✅ Проверяем что поставщик активен
    if (!supplier.isActive) {
      throw new ValidationDataException(
        'status',
        'Нельзя оценивать неактивного поставщика'
      );
    }

    // ✅ Валидация рейтинговых данных
    this.validateRatingData(ratingData);

    // ✅ Проверяем что есть заказы с этим поставщиком
    const hasOrders = await this.suppliersDataService.hasOrderHistory(id, user.companyId);
    if (!hasOrders) {
      throw new ValidationDataException(
        'orderHistory',
        'Нельзя оценивать поставщика без истории заказов'
      );
    }

    // ✅ Проверяем частоту оценок (не чаще раза в неделю от одного пользователя)
    const hasRecentRating = await this.suppliersDataService.hasRecentRating(
      id, 
      user.id, 
      7 // дней
    );
    if (hasRecentRating) {
      throw new ValidationDataException(
        'ratingFrequency',
        'Можно оценивать поставщика не чаще раза в неделю'
      );
    }

    // 🔐 Проверяем права на оценку
    this.validateRatingPermissions(user);

    return supplier;
  }

  /**
   * 📦 Валидация bulk операций
   */
  async validateBulkOperation(
    bulkData: BulkSuppliersDto,
    user: RequestWithUser['user']
  ): Promise<void> {
    // ✅ Проверяем размер batch
    if (bulkData.suppliers.length === 0) {
      throw new ValidationDataException(
        'suppliers',
        'Список поставщиков не может быть пустым'
      );
    }

    if (bulkData.suppliers.length > SUPPLIER_CONSTRAINTS.MAX_BULK_OPERATIONS) {
      throw new ValidationDataException(
        'suppliers',
        `Bulk операция не может содержать более ${SUPPLIER_CONSTRAINTS.MAX_BULK_OPERATIONS} поставщиков`
      );
    }

    // 🔒 Проверяем лимиты компании для создания
    if (bulkData.operation === 'create') {
      await this.validateCompanySupplierLimits(
        user.companyId, 
        bulkData.suppliers.length
      );
    }

    // ✅ Валидация каждого поставщика в зависимости от операции
    for (const [index, supplierData] of bulkData.suppliers.entries()) {
      try {
        switch (bulkData.operation) {
          case 'create':
            await this.validateBulkCreateItem(supplierData, user.companyId);
            break;
          case 'update':
            await this.validateBulkUpdateItem(supplierData, user.companyId);
            break;
          case 'deactivate':
          case 'activate':
            await this.validateBulkStatusChangeItem(supplierData, user.companyId);
            break;
        }
      } catch (error) {
        throw new ValidationDataException(
          `suppliers[${index}]`,
          `Ошибка валидации поставщика #${index + 1}: ${error.message}`
        );
      }
    }

    // 🔐 Проверяем права на bulk операции
    this.validateBulkPermissions(user, bulkData.operation);
  }

  /**
   * 🔒 Проверка лимитов компании
   */
  private async validateCompanySupplierLimits(
    companyId: string, 
    additionalCount: number = 1
  ): Promise<void> {
    const currentCount = await this.suppliersDataService.getCompanySupplierCount(companyId);
    const maxAllowed = SUPPLIER_CONSTRAINTS.MAX_SUPPLIERS_PER_COMPANY;

    if (currentCount + additionalCount > maxAllowed) {
      throw new ValidationDataException(
        'companyLimits',
        `Превышен лимит поставщиков для компании. ` +
        `Текущее количество: ${currentCount}, ` +
        `максимально разрешено: ${maxAllowed}`
      );
    }
  }

  /**
   * ✅ Проверка уникальности email в компании
   */
  private async validateEmailUniqueness(
    email: string, 
    companyId: string,
    excludeId?: string
  ): Promise<void> {
    const existingSupplier = await this.suppliersDataService.findByEmailInCompany(
      email, 
      companyId,
      excludeId
    );

    if (existingSupplier) {
      throw new ValidationDataException(
        'email',
        `Поставщик с email ${email} уже существует в компании`
      );
    }
  }

  /**
   * ✅ Проверка уникальности налогового номера в компании
   */
  private async validateTaxNumberUniqueness(
    taxNumber: string, 
    companyId: string,
    excludeId?: string
  ): Promise<void> {
    const existingSupplier = await this.suppliersDataService.findByTaxNumberInCompany(
      taxNumber, 
      companyId,
      excludeId
    );

    if (existingSupplier) {
      throw new ValidationDataException(
        'taxNumber',
        `Поставщик с налоговым номером ${taxNumber} уже существует в компании`
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил для создания
   */
  private validateSupplierBusinessRules(data: CreateSupplierData & CreateSupplierDto): void {
    // ✅ Валидация обязательных полей
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationDataException(
        'name',
        'Название поставщика обязательно'
      );
    }

    // ✅ Валидация контактной информации
    if (!data.email && !data.phone) {
      throw new ValidationDataException(
        'contacts',
        'Должен быть указан либо email, либо телефон'
      );
    }

    // ✅ Валидация URL сайта
    if (data.website && !this.isValidUrl(data.website)) {
      throw new ValidationDataException(
        'website',
        'Некорректный формат URL сайта'
      );
    }

    // ✅ Валидация налогового номера
    if (data.taxNumber && !this.isValidTaxNumber(data.taxNumber)) {
      throw new ValidationDataException(
        'taxNumber',
        'Некорректный формат налогового номера'
      );
    }
  }

  /**
   * 📋 Валидация бизнес-правил для обновления
   */
  private validateUpdateBusinessRules(data: UpdateSupplierDto, existing: Supplier): void {
    // ✅ Валидация что хотя бы одно поле изменяется
    const hasChanges = Object.keys(data).some(key => {
      return data[key] !== undefined && data[key] !== existing[key];
    });

    if (!hasChanges) {
      throw new ValidationDataException(
        'updates',
        'Должно быть изменено хотя бы одно поле'
      );
    }

    // ✅ Валидация URL сайта
    if (data.website !== undefined && data.website && !this.isValidUrl(data.website)) {
      throw new ValidationDataException(
        'website',
        'Некорректный формат URL сайта'
      );
    }

    // ✅ Валидация налогового номера
    if (data.taxNumber !== undefined && data.taxNumber && !this.isValidTaxNumber(data.taxNumber)) {
      throw new ValidationDataException(
        'taxNumber',
        'Некорректный формат налогового номера'
      );
    }

    // ✅ Проверяем что остается контактная информация
    if (data.email === null && data.phone === null && !existing.email && !existing.phone) {
      throw new ValidationDataException(
        'contacts',
        'Должен остаться либо email, либо телефон'
      );
    }
  }

  /**
   * ⭐ Валидация рейтинговых данных
   */
  private validateRatingData(ratingData: SupplierRatingData): void {
    const { MIN_RATING, MAX_RATING } = SUPPLIER_CONSTRAINTS;

    // ✅ Валидация диапазонов рейтингов
    const ratings = [
      { field: 'qualityRating', value: ratingData.qualityRating },
      { field: 'deliveryRating', value: ratingData.deliveryRating },
      { field: 'priceRating', value: ratingData.priceRating },
    ];

    if (ratingData.communicationRating !== undefined) {
      ratings.push({ field: 'communicationRating', value: ratingData.communicationRating });
    }

    for (const rating of ratings) {
      if (rating.value < MIN_RATING || rating.value > MAX_RATING) {
        throw new ValidationDataException(
          rating.field,
          `Рейтинг должен быть от ${MIN_RATING} до ${MAX_RATING}`
        );
      }
    }

    // ✅ Валидация комментария
    if (ratingData.comment && ratingData.comment.length > 1000) {
      throw new ValidationDataException(
        'comment',
        'Комментарий не должен превышать 1000 символов'
      );
    }
  }

  /**
   * 📦 Валидация элементов bulk операций
   */
  private async validateBulkCreateItem(item: any, companyId: string): Promise<void> {
    // Базовая валидация полей
    if (!item.name) {
      throw new Error('Название поставщика обязательно');
    }

    // Проверяем уникальность
    if (item.email) {
      await this.validateEmailUniqueness(item.email, companyId);
    }

    if (item.taxNumber) {
      await this.validateTaxNumberUniqueness(item.taxNumber, companyId);
    }
  }

  private async validateBulkUpdateItem(item: any, companyId: string): Promise<void> {
    if (!item.id) {
      throw new Error('ID поставщика обязателен для операции обновления');
    }

    // Проверяем существование
    await this.validateSupplierOwnership(item.id, companyId);
  }

  private async validateBulkStatusChangeItem(item: any, companyId: string): Promise<void> {
    if (!item.id) {
      throw new Error('ID поставщика обязателен для операции изменения статуса');
    }

    // Проверяем существование
    await this.validateSupplierOwnership(item.id, companyId);
  }

  /**
   * 🔐 Проверки прав доступа
   */
  private validateCreatePermissions(user: RequestWithUser['user']): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException(
        'permissions',
        'Недостаточно прав для создания поставщиков'
      );
    }
  }

  private validateUpdatePermissions(user: RequestWithUser['user'], supplier: Supplier): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException(
        'permissions',
        'Недостаточно прав для обновления поставщиков'
      );
    }
  }

  private validateDeactivatePermissions(user: RequestWithUser['user']): void {
    const allowedRoles = ['owner', 'admin']; // Только владелец и админ
    if (!allowedRoles.includes(user.role)) {
      throw new ValidationDataException(
        'permissions',
        'Недостаточно прав для деактивации поставщиков'
      );
    }
  }

  private validateRatingPermissions(user: RequestWithUser['user']): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException(
        'permissions',
        'Недостаточно прав для оценки поставщиков'
      );
    }
  }

  private validateBulkPermissions(user: RequestWithUser['user'], operation: string): void {
    // Bulk операции только для владельцев и админов
    const allowedRoles = ['owner', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      throw new ValidationDataException(
        'permissions',
        `Недостаточно прав для bulk операции: ${operation}`
      );
    }
  }

  /**
   * 🔧 Вспомогательные методы валидации
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidTaxNumber(taxNumber: string): boolean {
    // Простая валидация - только цифры, 10-12 символов
    return /^\d{10,12}$/.test(taxNumber);
  }
}
