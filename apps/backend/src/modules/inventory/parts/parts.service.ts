// src/modules/inventory/parts/parts.service.ts
import { Injectable } from '@nestjs/common';
import { PartsBusinessService } from './services/parts-business.service';
import { PartsDataService } from './services/parts-data.service';
import { PartsMapperService } from './services/parts-mapper.service';
import { PartsValidationService } from './services/parts-validation.service';
import { CreatePartDto } from './dto/request/create-part.dto';
import { UpdatePartDto } from './dto/request/update-part.dto';
import { BulkUpdatePartsDto } from './dto/request/bulk-update-parts.dto';
import { PartResponseDto } from './dto/response/part-response.dto';
import { PaginatedPartsResponseDto } from './dto/response/paginated-parts-response.dto';
import { PartFilter, BulkOperationResult } from './types/parts.types'; // 🔥 ДОБАВИЛИ BulkOperationResult
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { Logger } from '@nestjs/common';
import { PARTS_CONSTANTS } from './constants/parts.constants';

@Injectable()
export class PartsService {
  private readonly logger = new Logger(PartsService.name);

  constructor(
    private readonly partsDataService: PartsDataService,
    private readonly partsBusinessService: PartsBusinessService,
    private readonly partsValidationService: PartsValidationService,
    private readonly partsMapperService: PartsMapperService,
  ) {}

  /**
   * 📝 Создание новой запчасти для пользователя
   */
  async createForUser(createPartDto: CreatePartDto, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Creating part: ${createPartDto.name} for company ${user.companyId}`);

    // Валидация прав доступа
    this.partsValidationService.validateOperationPermissions('create', user.role);

    // Валидация и подготовка данных
    const createData = await this.partsValidationService.validateCreateData(createPartDto, user.companyId);

    // Создание через бизнес-сервис
    const part = await this.partsBusinessService.createPart(createData, user);

    this.logger.log(`Part created: ${part.name} (${part.id}) for company ${part.companyId}`);

    return this.partsMapperService.mapToResponseDto(part);
  }

  /**
   * 📋 Получение всех запчастей для пользователя
   */
  async findAllForUser(user: RequestWithUser['user'], filter: PartFilter = {}): Promise<PaginatedPartsResponseDto> {
    this.logger.log(`Finding parts with filters: ${JSON.stringify(filter)}`);

    // Валидация прав доступа
    this.partsValidationService.validateOperationPermissions('view', user.role);

    const [parts, total] = await this.partsDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    // Маппинг результатов
    const mappedParts = this.partsMapperService.mapArrayToResponseDto(parts);

    // Вычисление дополнительной статистики
    const totalValue = mappedParts.reduce((sum, part) => sum + (part.costPrice * 1), 0); // Умножаем на количество если есть
    const averagePrice = mappedParts.length > 0 ? totalValue / mappedParts.length : 0;
    const activeCount = mappedParts.filter(part => part.isActive).length;
    const inactiveCount = mappedParts.length - activeCount;

    return {
      items: mappedParts,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalValue: Math.round(totalValue * 100) / 100,
      averagePrice: Math.round(averagePrice * 100) / 100,
      activeCount,
      inactiveCount,
    };
  }

  /**
   * 🔍 Получение запчасти по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<PartResponseDto> {
    this.logger.log(`Finding part: ${id}`);

    const part = await this.partsValidationService.validatePartExists(id);

    return this.partsMapperService.mapToResponseDto(part);
  }

  /**
   * ✏️ Обновление запчасти
   */
  async update(id: string, updatePartDto: UpdatePartDto, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Updating part: ${id}`);

    // Валидация прав доступа
    this.partsValidationService.validateOperationPermissions('update', user.role);

    // Валидация и подготовка данных
    const { part, updateData } = await this.partsValidationService.validateUpdateData(id, updatePartDto, user.companyId);

    // Обновление через бизнес-сервис
    const updatedPart = await this.partsBusinessService.updatePart(id, updateData, user);

    this.logger.log(`Part updated: ${updatedPart.name} (${updatedPart.id})`);

    return this.partsMapperService.mapToResponseDto(updatedPart);
  }

  /**
   * 🗑️ Удаление запчасти (деактивация)
   */
  async remove(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Removing part: ${id}`);

    // Валидация прав доступа
    this.partsValidationService.validateOperationPermissions('delete', user.role);

    // Валидация возможности удаления
    await this.partsValidationService.validateDeletePart(id, user.companyId);

    // Удаление через бизнес-сервис
    await this.partsBusinessService.deletePart(id, user);

    this.logger.log(`Part removed: ${id}`);
  }

  /**
   * 🔄 Изменение статуса активности
   */
  async setActive(id: string, isActive: boolean, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Setting part ${id} active status to: ${isActive}`);

    // Валидация прав доступа
    this.partsValidationService.validateOperationPermissions('update', user.role);

    // Валидация принадлежности
    await this.partsValidationService.validatePartOwnership(id, user.companyId);

    // Изменение статуса через бизнес-сервис
    const part = await this.partsBusinessService.setPartActive(id, isActive, user);

    return this.partsMapperService.mapToResponseDto(part);
  }

  /**
   * 🔍 Поиск запчастей
   */
  async searchParts(searchTerm: string, companyId: string, limit: number = 10): Promise<PartResponseDto[]> {
    this.logger.log(`Searching parts: "${searchTerm}" for company: ${companyId}`);

    // Валидация поискового запроса
    if (searchTerm.length < PARTS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
      return [];
    }

    if (searchTerm.length > PARTS_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH) {
      searchTerm = searchTerm.substring(0, PARTS_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH);
    }

    // Поиск через бизнес-сервис
    const parts = await this.partsBusinessService.searchParts(searchTerm, companyId, limit);

    return this.partsMapperService.mapArrayToResponseDto(parts);
  }

  /**
   * 📦 Bulk обновление запчастей
   */
  async bulkUpdate(bulkUpdateDto: BulkUpdatePartsDto, user: RequestWithUser['user']): Promise<BulkOperationResult> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.partIds.length} parts for company: ${user.companyId}`);

    // Валидация bulk операции
    const { parts, updateData } = await this.partsValidationService.validateBulkUpdate(bulkUpdateDto, user);

    // Выполнение через бизнес-сервис
    const result = await this.partsBusinessService.bulkUpdateParts(bulkUpdateDto.partIds, updateData, user);

    this.logger.log(`Bulk update completed: ${result.successCount} success, ${result.failureCount} failures`);

    return result;
  }

  /**
   * 📈 Получение популярных запчастей
   */
  async getPopularParts(companyId: string, limit: number = 20): Promise<PartResponseDto[]> {
    const parts = await this.partsBusinessService.getPopularParts(companyId, limit);
    return this.partsMapperService.mapArrayToResponseDto(parts);
  }

  /**
   * 📊 Получение статистики по запчастям
   */
  async getStats(companyId: string): Promise<any> {
    this.logger.log(`Getting parts statistics for company: ${companyId}`);

    return this.partsBusinessService.getPartsStats(companyId);
  }

  /**
   * 💰 Анализ прибыльности
   */
  async analyzeProfitability(companyId: string): Promise<any> {
    this.logger.log(`Analyzing profitability for company: ${companyId}`);

    return this.partsBusinessService.analyzeProfitability(companyId);
  }

  /**
   * 🔗 Для других модулей - проверка существования запчасти
   */
  async exists(partId: string, companyId: string): Promise<boolean> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    return !!part;
  }

  /**
   * 🔗 Для других модулей - получение базовой информации
   */
  async getBasicInfo(partId: string, companyId: string): Promise<any> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    return part ? this.partsMapperService.mapToBasicInfo(part) : null;
  }

  /**
   * 🔗 Для других модулей - получение запчасти с инвентарем
   */
  async getPartWithInventory(partId: string, companyId: string): Promise<PartResponseDto | null> {
    const part = await this.partsBusinessService.getPartWithInventory(partId, companyId);
    return part ? this.partsMapperService.mapToResponseDto(part) : null;
  }

  /**
   * 📋 Для orders модуля - получение нескольких запчастей
   */
  async getMultipleParts(partIds: string[], companyId: string): Promise<PartResponseDto[]> {
    const parts = await this.partsDataService.findMultipleByIds(partIds, companyId);
    return this.partsMapperService.mapArrayToResponseDto(parts);
  }
}
