// src/modules/inventory/suppliers/suppliers.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SuppliersDataService } from './services/suppliers-data.service';
import { SuppliersBusinessService } from './services/suppliers-business.service';
import { SuppliersValidationService } from './services/suppliers-validation.service';
import { SuppliersMapperService } from './services/suppliers-mapper.service';
import { CreateSupplierDto } from './dto/request/create-supplier.dto';
import { UpdateSupplierDto } from './dto/request/update-supplier.dto';
import { BulkSuppliersDto } from './dto/request/bulk-suppliers.dto';
import { SupplierResponseDto } from './dto/response/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/response/paginated-suppliers-response.dto';
import { SupplierRatingResponseDto } from './dto/response/supplier-rating-response.dto';
import { SupplierAnalyticsResponseDto } from './dto/response/supplier-analytics-response.dto';
import { 
  SupplierFilter, 
  SupplierRatingData, 
  BulkSupplierResult,
  CreateSupplierData // ✅ ДОБАВЛЯЕМ импорт
} from './types/suppliers.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly suppliersDataService: SuppliersDataService,
    private readonly suppliersBusinessService: SuppliersBusinessService,
    private readonly suppliersValidationService: SuppliersValidationService,
    private readonly suppliersMapperService: SuppliersMapperService,
  ) {}

  /**
   * 🔒 Получение всех поставщиков с фильтрацией по принадлежности
   */
  async findAll(filter: SupplierFilter = {}): Promise<PaginatedSuppliersResponseDto> {
    this.logger.log(`Finding suppliers with filters: ${JSON.stringify(filter)}`);

    const [suppliers, total] = await this.suppliersDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;

    return this.suppliersMapperService.mapToPaginatedResponse(
      suppliers,
      total,
      page,
      limit,
      filter
    );
  }

  /**
   * 🔒 Получение поставщика по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<SupplierResponseDto> {
    this.logger.log(`Finding supplier: ${id}`);

    const supplier = await this.suppliersValidationService.validateSupplierExists(id);

    return this.suppliersMapperService.mapToResponseDto(supplier);
  }

  /**
   * 📝 Создание поставщика
   */
  async create(
	createSupplierDto: CreateSupplierDto,
	user: RequestWithUser['user']
	): Promise<SupplierResponseDto> {
	this.logger.log(`Creating supplier for company: ${user.companyId}`);

	// ✅ ИСПРАВЛЕНО: Используем правильный тип CreateSupplierData
	const supplierData: CreateSupplierData = {
		...createSupplierDto,
		companyId: user.companyId,
		createdBy: user.id,
		isActive: createSupplierDto.isActive ?? true,
	};

	// Валидация создания
	await this.suppliersValidationService.validateCreateSupplier(supplierData, user);

	// Создание через бизнес-сервис
	const supplier = await this.suppliersBusinessService.createSupplier(supplierData, user);

	this.logger.log(`Supplier created: ${supplier.id}`);

	return this.suppliersMapperService.mapToResponseDto(supplier);
	}

  /**
   * 📝 Обновление поставщика
   */
  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    user: RequestWithUser['user']
  ): Promise<SupplierResponseDto> {
    this.logger.log(`Updating supplier: ${id}`);

    // Валидация обновления
    await this.suppliersValidationService.validateUpdateSupplier(id, updateSupplierDto, user);

    // Обновление через бизнес-сервис
    const updatedSupplier = await this.suppliersBusinessService.updateSupplier(
      id, 
      updateSupplierDto, 
      user
    );

    this.logger.log(`Supplier updated: ${id}`);

    return this.suppliersMapperService.mapToResponseDto(updatedSupplier);
  }

  /**
   * 🗑️ Деактивация поставщика
   */
  async deactivate(
    id: string,
    user: RequestWithUser['user']
  ): Promise<SupplierResponseDto> {
    this.logger.log(`Deactivating supplier: ${id}`);

    // Валидация деактивации
    await this.suppliersValidationService.validateDeactivateSupplier(id, user);

    // Деактивация через бизнес-сервис
    const deactivatedSupplier = await this.suppliersBusinessService.deactivateSupplier(id, user);

    this.logger.log(`Supplier deactivated: ${id}`);

    return this.suppliersMapperService.mapToResponseDto(deactivatedSupplier);
  }

  /**
   * ⭐ Оценка поставщика
   */
  async rateSupplier(
    id: string,
    ratingData: SupplierRatingData,
    user: RequestWithUser['user']
  ): Promise<SupplierRatingResponseDto> {
    this.logger.log(`Rating supplier: ${id}`);

    // Валидация рейтинга
    await this.suppliersValidationService.validateRateSupplier(id, ratingData, user);

    // Создание рейтинга через бизнес-сервис
    const rating = await this.suppliersBusinessService.rateSupplier(id, ratingData, user);

    this.logger.log(`Supplier rated: ${id}, rating: ${rating.averageRating}`);

    return this.suppliersMapperService.mapToRatingResponse(rating);
  }

  /**
   * 💰 Сравнение цен на запчасть
   */
  async comparePartPrices(
    partId: string,
    companyId: string
  ): Promise<any> {
    this.logger.log(`Comparing prices for part: ${partId}`);

    return this.suppliersBusinessService.comparePartPrices(partId, companyId);
  }

  /**
   * 📊 Аналитика по поставщику
   */
  async getSupplierAnalytics(
    id: string,
    period: 'month' | 'quarter' | 'year',
    companyId: string
  ): Promise<SupplierAnalyticsResponseDto> {
    this.logger.log(`Getting analytics for supplier: ${id}, period: ${period}`);

    const analytics = await this.suppliersBusinessService.getSupplierAnalytics(
      id, 
      period, 
      companyId
    );

    return this.suppliersMapperService.mapToAnalyticsResponse(analytics);
  }

  /**
   * 📦 Массовые операции
   */
  async bulkOperations(
    bulkSuppliersDto: BulkSuppliersDto,
    user: RequestWithUser['user']
  ): Promise<BulkSupplierResult> {
    this.logger.log(`Bulk operations: ${bulkSuppliersDto.operation} for ${bulkSuppliersDto.suppliers.length} suppliers`);

    // Валидация bulk операции
    await this.suppliersValidationService.validateBulkOperation(bulkSuppliersDto, user);

    // Выполнение через бизнес-сервис
    const result = await this.suppliersBusinessService.bulkOperations(bulkSuppliersDto, user);

    this.logger.log(`Bulk operation completed: ${result.successCount} success, ${result.failureCount} failures`);

    return result;
  }

  /**
   * 🔍 Поиск лучшего поставщика для запчасти
   */
  async findBestSupplierForPart(
    partId: string,
    prioritize: 'price' | 'quality' | 'delivery',
    companyId: string
  ): Promise<any> {
    this.logger.log(`Finding best supplier for part: ${partId}, prioritize: ${prioritize}`);

    return this.suppliersBusinessService.findBestSupplierForPart(partId, prioritize, companyId);
  }

  /**
   * 📈 Топ поставщики компании
   */
  async getTopPerformers(
    companyId: string,
    period: 'month' | 'quarter' | 'year',
    limit: number
  ): Promise<any> {
    this.logger.log(`Getting top performers for company: ${companyId}, period: ${period}`);

    return this.suppliersBusinessService.getTopPerformers(companyId, period, limit);
  }

  /**
   * 📋 Для других модулей - проверка существования поставщика
   */
  async exists(id: string, companyId: string): Promise<boolean> {
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);
    return !!supplier;
  }

  /**
   * 📊 Для stock-movements - получение информации о поставщике
   */
  async getSupplierInfo(id: string, companyId: string): Promise<any> {
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);
    
    if (!supplier) {
      return null;
    }

    return this.suppliersMapperService.mapToBasicInfo(supplier);
  }

  /**
   * 🔄 Для orders модуля - получение активных поставщиков для запчасти
   */
  async getActiveSuppliersForPart(partId: string, companyId: string): Promise<any[]> {
    return this.suppliersDataService.findActiveSuppliersForPart(partId, companyId);
  }
}
