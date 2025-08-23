// path: apps/backend/src/modules/tariffs/tariffs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { TariffsDataService } from './services/tariffs-data.service';
import { TariffsBusinessService } from './services/tariffs-business.service';
import { TariffsValidationService } from './services/tariffs-validation.service';
import { TariffsMapperService } from './services/tariffs-mapper.service';
import { CreateTariffDto } from './dto/request/create-tariff.dto';
import { UpdateTariffDto } from './dto/request/update-tariff.dto';
import { TariffResponseDto } from './dto/response/tariff-response.dto';
import { TariffFilter, PaginatedTariffsResult } from './types/tariffs.types';
import { TARIFFS_CONSTANTS } from './constants/tariffs.constants';
import { AuditService, AuditAction } from '../../common/audit/audit.service';

@Injectable()
export class TariffsService {
  private readonly logger = new Logger(TariffsService.name);

  constructor(
    private readonly tariffsDataService: TariffsDataService,
    private readonly tariffsBusinessService: TariffsBusinessService,
    private readonly tariffsValidationService: TariffsValidationService,
    private readonly tariffsMapperService: TariffsMapperService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Создание нового тарифа
   */
  async create(createTariffDto: CreateTariffDto): Promise<TariffResponseDto> {
    this.logger.log(`Создание нового тарифа: ${createTariffDto.name}`);

    await this.tariffsValidationService.validateCreateData(createTariffDto);
    const tariff = await this.tariffsBusinessService.createTariff(createTariffDto);

    this.logger.log(`Тариф успешно создан: ${tariff.name} (${tariff.id})`);
    return this.tariffsMapperService.mapToResponseDto(tariff);
  }

  /**
   * Получение всех тарифов с фильтрацией
   */
  async findAll(filter: TariffFilter = {}): Promise<PaginatedTariffsResult> {
    this.logger.log(`Поиск тарифов с фильтрами: ${JSON.stringify(filter)}`);

    const [tariffs, total] = await this.tariffsDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    await this.auditService.log(AuditAction.TARIFFS_LISTED, {
      details: {
        search: filter.search || null,
        isActive: typeof filter.isActive === 'boolean' ? filter.isActive : null,
        minPrice: filter.minPrice ?? null,
        maxPrice: filter.maxPrice ?? null,
        page,
        limit,
        sortField: filter.sortField || 'priceMonthly',
        sortOrder: filter.sortOrder || 'asc',
      },
    });

    return {
      items: this.tariffsMapperService.mapArrayToResponseDto(tariffs),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Получение только активных тарифов
   */
  async findActive(): Promise<TariffResponseDto[]> {
    this.logger.log('Получение активных тарифов');

    const tariffs = await this.tariffsDataService.findAll(true);
    await this.auditService.log(AuditAction.TARIFFS_LISTED, {
      details: { scope: 'active' },
    });

    return this.tariffsMapperService.mapArrayToResponseDto(tariffs);
  }

  /**
   * Получение тарифа по ID
   */
  async findOne(id: string): Promise<TariffResponseDto> {
    this.logger.log(`Поиск тарифа по ID: ${id}`);

    const tariff = await this.tariffsValidationService.validateTariffExists(id);
    await this.auditService.log(AuditAction.TARIFF_VIEWED, {
      resourceId: id,
      resourceType: 'Tariff',
      details: { id },
    });

    return this.tariffsMapperService.mapToResponseDto(tariff);
  }

  /**
   * Обновление тарифа
   */
  async update(id: string, updateTariffDto: UpdateTariffDto): Promise<TariffResponseDto> {
    this.logger.log(`Обновление тарифа: ${id}`);

    await this.tariffsValidationService.validateUpdateData(id, updateTariffDto);
    const updatedTariff = await this.tariffsBusinessService.updateTariff(id, updateTariffDto);

    this.logger.log(`Тариф успешно обновлен: ${updatedTariff.name} (${id})`);
    return this.tariffsMapperService.mapToResponseDto(updatedTariff);
  }

  /**
   * Изменение статуса активности тарифа
   */
  async setActive(id: string, isActive: boolean): Promise<TariffResponseDto> {
    this.logger.log(`Изменение статуса тарифа ${id} на ${isActive ? 'активен' : 'неактивен'}`);

    const updatedTariff = await this.tariffsBusinessService.toggleTariffStatus(id, isActive);

    this.logger.log(`Статус тарифа ${id} успешно изменен`);
    return this.tariffsMapperService.mapToResponseDto(updatedTariff);
  }

  /**
   * Удаление тарифа (только для platform roles)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление тарифа: ${id}`);

    await this.tariffsValidationService.validateTariffExists(id);
    await this.tariffsBusinessService.deleteTariff(id);

    this.logger.log(`Тариф успешно удален: ${id}`);
  }

  /**
   * Получение популярных тарифов
   */
  async getPopular(limit: number = 5): Promise<TariffResponseDto[]> {
    this.logger.log(`Получение популярных тарифов (лимит: ${limit})`);

    const tariffs = await this.tariffsDataService.getPopularTariffs(limit);

    await this.auditService.log(AuditAction.TARIFFS_POPULAR_VIEWED, {
      details: { limit },
    });

    return this.tariffsMapperService.mapArrayToResponseDto(tariffs);
  }

  /**
   * Сравнение тарифов
   */
  async compareTariffs(tariffIds: string[]): Promise<TariffResponseDto[]> {
    this.logger.log(`Сравнение тарифов: ${tariffIds.join(', ')}`);

    const tariffs = await Promise.all(tariffIds.map((id) => this.tariffsValidationService.validateTariffExists(id)));

    await this.auditService.log(AuditAction.TARIFFS_COMPARED, {
      details: { tariffIds },
    });

    return this.tariffsMapperService.mapArrayToResponseDto(tariffs);
  }

  /**
   * Получение данных для сравнения тарифов
   */
  async getComparisonData(
    tariffIds: string[],
  ): Promise<
    {
      id: string;
      name: string;
      priceMonthly: number;
      priceYearly: number;
      yearlyDiscount: number;
      limits: {
        users: number | null;
        customers: number | null;
        vehicles: number | null;
        orders: number | null;
      };
      features: Record<string, any>;
      isRecommended: boolean;
    }[]
  > {
    this.logger.log(`Получение данных для сравнения тарифов: ${tariffIds.join(', ')}`);

    const tariffs = await Promise.all(tariffIds.map((id) => this.tariffsValidationService.validateTariffExists(id)));

    await this.auditService.log(AuditAction.TARIFFS_COMPARED, {
      details: { tariffIds, mode: 'detailed' },
    });

    return tariffs.map((tariff) => this.tariffsMapperService.mapToComparisonData(tariff));
  }

  /**
   * Получение статистики по тарифам
   */
  async getStats(): Promise<
    {
      id: string;
      name: string;
      priceMonthly: number;
      priceYearly: number;
      isActive: boolean;
      subscriptionsCount: number;
      popularity: 'low' | 'medium' | 'high';
      revenue: {
        monthly: number;
        yearly: number;
      };
    }[]
  > {
    this.logger.log('Получение статистики по тарифам');

    const tariffs = await this.tariffsDataService.findAll();

    // TODO: заменить подсчет на реальный после интеграции с подписками
    const subscriptionsCounts: Record<string, number> = {};

    const stats = tariffs.map((tariff) =>
      this.tariffsMapperService.mapToStatsInfo(tariff, subscriptionsCounts[tariff.id] || 0),
    );

    await this.auditService.log(AuditAction.TARIFF_STATS_VIEWED, {
      details: { count: stats.length },
    });

    return stats;
  }

  /**
   * Получение опций для селектов (для других модулей)
   */
  async getSelectOptions(): Promise<
    {
      value: string;
      label: string;
      priceMonthly: number;
      priceYearly: number;
      isActive: boolean;
    }[]
  > {
    const activeTariffs = await this.tariffsDataService.findAll(true);

    const options = activeTariffs.map((tariff) => this.tariffsMapperService.mapToSelectOption(tariff));

    await this.auditService.log(AuditAction.TARIFF_SELECT_OPTIONS_VIEWED, {
      details: { count: options.length },
    });

    return options;
  }

  /**
   * Получение базовой информации о тарифе (для других модулей)
   */
  async getTariffInfo(
    id: string,
  ): Promise<{
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers: number | null;
    maxCustomers: number | null;
    maxVehicles: number | null;
    maxOrders: number | null;
  } | null> {
    const tariff = await this.tariffsDataService.findById(id);
    if (!tariff) return null;

    return this.tariffsMapperService.mapToBasicInfo(tariff);
  }

  /**
   * Проверка существования тарифа (для других модулей)
   */
  async exists(id: string): Promise<boolean> {
    const tariff = await this.tariffsDataService.findById(id);
    return !!tariff;
  }
}
