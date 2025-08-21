// src/modules/inventory/suppliers/services/suppliers-validation.service.ts
import { Injectable } from '@nestjs/common';
import { SuppliersDataService } from './suppliers-data.service';
import { Supplier } from '../../../../database/entities';
import { CreateSupplierDto } from '../dto/request/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/request/update-supplier.dto';
import { BulkSuppliersDto } from '../dto/request/bulk-suppliers.dto';
import { CreateSupplierData, SupplierRatingData, SUPPLIER_CONSTRAINTS } from '../types/suppliers.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { SupplierNotFoundException, ValidationDataException, ResourceOwnershipException } from '../../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';

@Injectable()
export class SuppliersValidationService {
  constructor(private readonly suppliersDataService: SuppliersDataService) {}

  async validateSupplierExists(id: string): Promise<Supplier> {
    const supplier = await this.suppliersDataService.findById(id);
    if (!supplier) throw new SupplierNotFoundException(id);
    return supplier;
  }

  async validateSupplierOwnership(supplierId: string, userCompanyId: string): Promise<Supplier> {
    const supplier = await this.suppliersDataService.findById(supplierId);
    if (!supplier) throw new SupplierNotFoundException(supplierId);
    if (supplier.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('supplier', supplierId);
    }
    return supplier;
  }

  async validateCreateSupplier(data: CreateSupplierData & CreateSupplierDto, user: RequestWithUser['user']): Promise<void> {
    await this.validateCompanySupplierLimits(user.companyId);
    if (data.email) await this.validateEmailUniqueness(data.email, user.companyId);
    if (data.taxNumber) await this.validateTaxNumberUniqueness(data.taxNumber, user.companyId);
    this.validateSupplierBusinessRules(data);
    this.validateCreatePermissions(user);
  }

  async validateUpdateSupplier(id: string, data: UpdateSupplierDto, user: RequestWithUser['user']): Promise<Supplier> {
    const supplier = await this.validateSupplierOwnership(id, user.companyId);
    if (data.email && data.email !== supplier.email) await this.validateEmailUniqueness(data.email, user.companyId, id);
    if (data.taxNumber && data.taxNumber !== supplier.taxNumber)
      await this.validateTaxNumberUniqueness(data.taxNumber, user.companyId, id);
    this.validateUpdateBusinessRules(data, supplier);
    this.validateUpdatePermissions(user, supplier);
    return supplier;
  }

  async validateDeactivateSupplier(id: string, user: RequestWithUser['user']): Promise<Supplier> {
    const supplier = await this.validateSupplierOwnership(id, user.companyId);
    if (!supplier.isActive) throw new ValidationDataException('status', 'Поставщик уже деактивирован');

    const hasActiveOrders = await this.suppliersDataService.hasActiveOrders(id, user.companyId);
    if (hasActiveOrders) {
      throw new ValidationDataException('activeOrders', 'Нельзя деактивировать поставщика с активными заказами');
    }

    const hasUnpaidInvoices = await this.suppliersDataService.hasUnpaidInvoices(id);
    if (hasUnpaidInvoices) {
      throw new ValidationDataException('unpaidInvoices', 'Нельзя деактивировать поставщика с неоплаченными счетами');
    }

    this.validateDeactivatePermissions(user);
    return supplier;
  }

  async validateRateSupplier(id: string, ratingData: SupplierRatingData, user: RequestWithUser['user']): Promise<Supplier> {
    const supplier = await this.validateSupplierOwnership(id, user.companyId);
    if (!supplier.isActive) throw new ValidationDataException('status', 'Нельзя оценивать неактивного поставщика');
    this.validateRatingData(ratingData);
    const hasOrders = await this.suppliersDataService.hasOrderHistory(id, user.companyId);
    if (!hasOrders) throw new ValidationDataException('orderHistory', 'Нельзя оценивать поставщика без истории заказов');
    const hasRecentRating = await this.suppliersDataService.hasRecentRating(id, user.id, 7);
    if (hasRecentRating) throw new ValidationDataException('ratingFrequency', 'Можно оценивать поставщика не чаще раза в неделю');
    this.validateRatingPermissions(user);
    return supplier;
  }

  async validateBulkOperation(bulkData: BulkSuppliersDto, user: RequestWithUser['user']): Promise<void> {
    if (bulkData.suppliers.length === 0) throw new ValidationDataException('suppliers', 'Список поставщиков не может быть пустым');

    if (bulkData.suppliers.length > SUPPLIER_CONSTRAINTS.MAX_BULK_OPERATIONS) {
      throw new ValidationDataException(
        'suppliers',
        `Bulk операция не может содержать более ${SUPPLIER_CONSTRAINTS.MAX_BULK_OPERATIONS} поставщиков`,
      );
    }

    if (bulkData.operation === 'create') {
      await this.validateCompanySupplierLimits(user.companyId, bulkData.suppliers.length);
    }

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
      } catch (error: any) {
        throw new ValidationDataException(`suppliers[${index}]`, `Ошибка валидации поставщика #${index + 1}: ${error.message}`);
      }
    }

    this.validateBulkPermissions(user, bulkData.operation);
  }

  private async validateCompanySupplierLimits(companyId: string, additionalCount: number = 1): Promise<void> {
    const currentCount = await this.suppliersDataService.getCompanySupplierCount(companyId);
    const maxAllowed = SUPPLIER_CONSTRAINTS.MAX_SUPPLIERS_PER_COMPANY;
    if (currentCount + additionalCount > maxAllowed) {
      throw new ValidationDataException(
        'companyLimits',
        `Превышен лимит поставщиков для компании. Текущее количество: ${currentCount}, максимально разрешено: ${maxAllowed}`,
      );
    }
  }

  private async validateEmailUniqueness(email: string, companyId: string, excludeId?: string): Promise<void> {
    const existingSupplier = await this.suppliersDataService.findByEmailInCompany(email, companyId, excludeId);
    if (existingSupplier) throw new ValidationDataException('email', `Поставщик с email ${email} уже существует в компании`);
  }

  private async validateTaxNumberUniqueness(taxNumber: string, companyId: string, excludeId?: string): Promise<void> {
    const existingSupplier = await this.suppliersDataService.findByTaxNumberInCompany(taxNumber, companyId, excludeId);
    if (existingSupplier) throw new ValidationDataException('taxNumber', `Поставщик с налоговым номером ${taxNumber} уже существует в компании`);
  }

  private validateSupplierBusinessRules(data: CreateSupplierData & CreateSupplierDto): void {
    if (!data.name || data.name.trim().length === 0) throw new ValidationDataException('name', 'Название поставщика обязательно');
    if (!data.email && !data.phone) {
      throw new ValidationDataException('contacts', 'Должен быть указан либо email, либо телефон');
    }
    if (data.website && !this.isValidUrl(data.website)) throw new ValidationDataException('website', 'Некорректный формат URL сайта');
    if (data.taxNumber && !this.isValidTaxNumber(data.taxNumber)) {
      throw new ValidationDataException('taxNumber', 'Некорректный формат налогового номера');
    }
  }

  private validateUpdateBusinessRules(data: UpdateSupplierDto, existing: Supplier): void {
    const hasChanges = Object.keys(data).some((key) => (data as any)[key] !== undefined && (data as any)[key] !== (existing as any)[key]);
    if (!hasChanges) throw new ValidationDataException('updates', 'Должно быть изменено хотя бы одно поле');
    if (data.website !== undefined && data.website && !this.isValidUrl(data.website))
      throw new ValidationDataException('website', 'Некорректный формат URL сайта');
    if (data.taxNumber !== undefined && data.taxNumber && !this.isValidTaxNumber(data.taxNumber))
      throw new ValidationDataException('taxNumber', 'Некорректный формат налогового номера');
    if (data.email === null && data.phone === null && !existing.email && !existing.phone) {
      throw new ValidationDataException('contacts', 'Должен остаться либо email, либо телефон');
    }
  }

  private validateRatingData(ratingData: SupplierRatingData): void {
    const { MIN_RATING, MAX_RATING } = SUPPLIER_CONSTRAINTS;
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
        throw new ValidationDataException(rating.field, `Рейтинг должен быть от ${MIN_RATING} до ${MAX_RATING}`);
      }
    }
    if (ratingData.comment && ratingData.comment.length > 1000) {
      throw new ValidationDataException('comment', 'Комментарий не должен превышать 1000 символов');
    }
  }

  private async validateBulkCreateItem(item: any, companyId: string): Promise<void> {
    if (!item.name) throw new Error('Название поставщика обязательно');
    if (item.email) await this.validateEmailUniqueness(item.email, companyId);
    if (item.taxNumber) await this.validateTaxNumberUniqueness(item.taxNumber, companyId);
  }
  private async validateBulkUpdateItem(item: any, companyId: string): Promise<void> {
    if (!item.id) throw new Error('ID поставщика обязателен для операции обновления');
    await this.validateSupplierOwnership(item.id, companyId);
  }
  private async validateBulkStatusChangeItem(item: any, companyId: string): Promise<void> {
    if (!item.id) throw new Error('ID поставщика обязателен для операции изменения статуса');
    await this.validateSupplierOwnership(item.id, companyId);
  }

  private validateCreatePermissions(user: RequestWithUser['user']): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException('permissions', 'Недостаточно прав для создания поставщиков');
    }
  }
  private validateUpdatePermissions(user: RequestWithUser['user'], _supplier: Supplier): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException('permissions', 'Недостаточно прав для обновления поставщиков');
    }
  }
  private validateDeactivatePermissions(user: RequestWithUser['user']): void {
    const allowedRoles = ['company_owner', 'company_admin'];
    if (!allowedRoles.includes(user.role)) {
      throw new ValidationDataException('permissions', 'Недостаточно прав для деактивации поставщиков');
    }
  }
  private validateRatingPermissions(user: RequestWithUser['user']): void {
    const allowedRoles = INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS;
    if (!allowedRoles.includes(user.role as any)) {
      throw new ValidationDataException('permissions', 'Недостаточно прав для оценки поставщиков');
    }
  }
  private validateBulkPermissions(user: RequestWithUser['user'], operation: string): void {
    const allowedRoles = ['company_owner', 'company_admin'];
    if (!allowedRoles.includes(user.role)) {
      throw new ValidationDataException('permissions', `Недостаточно прав для bulk операции: ${operation}`);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  private isValidTaxNumber(taxNumber: string): boolean {
    return /^\d{10,12}$/.test(taxNumber);
  }
}
