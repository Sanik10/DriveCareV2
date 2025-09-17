// path: apps/backend/src/modules/tariffs/tariffs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { TariffsDataService } from './services/tariffs-data.service';
import { TariffsBusinessService } from './services/tariffs-business.service';
import { TariffsValidationService } from './services/tariffs-validation.service';
import { TariffsMapperService } from './services/tariffs-mapper.service';
import { CreateTariffDto } from './dto/request/create-tariff.dto';
import { UpdateTariffDto } from './dto/request/update-tariff.dto';
import { TariffResponseDto } from './dto/response/tariff-response.dto';
import { TariffFilter, PaginatedTariffsResult, TariffMetricsMap } from './types/tariffs.types';
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
   * includeMetrics=false (public) — метрики подписчиков скрыты.
   * includeMetrics=true (admin) — добавляем active/totalSubscribers и даём сортировку/фильтры по метрикам.
   */
  async findAll(filter: TariffFilter = {}, opts?: { includeMetrics?: boolean }): Promise<PaginatedTariffsResult> {
    const includeMetrics = !!opts?.includeMetrics;
    this.logger.log(
      `Поиск тарифов с фильтрами (metrics=${includeMetrics}): ${JSON.stringify(filter)}`,
    );

    const metricsSortFields = new Set(['activeSubscribers', 'totalSubscribers']);
    const wantsMetricsSort =
      includeMetrics && filter.sortField ? metricsSortFields.has(filter.sortField) : false;
    const wantsMetricsFilter =
      includeMetrics &&
      ((typeof filter.minActiveSubscribers === 'number' && filter.minActiveSubscribers > 0) ||
        (typeof filter.minTotalSubscribers === 'number' && filter.minTotalSubscribers > 0));

    // Если нужна сортировка или фильтрация по метрикам — заберем максимум записей и отфильтруем в памяти
    const baseFilter = { ...filter };
    if (wantsMetricsSort || wantsMetricsFilter) {
      baseFilter.page = 1;
      baseFilter.limit = TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS;
      // сортировку по полям тарифа оставляем прежней — итоговую сортировку по метрикам сделаем ниже
    }

    const [tariffs, totalRaw] = await this.tariffsDataService.findWithFilters(baseFilter);

    let metricsMap: TariffMetricsMap | undefined;
    if (includeMetrics && tariffs.length > 0) {
      metricsMap = await this.tariffsDataService.getSubscribersMetricsByTariff(tariffs.map((t) => t.id));
    }

    // Применяем фильтры по метрикам (только если разрешено includeMetrics)
    let items = tariffs;
    if (includeMetrics && (wantsMetricsFilter || wantsMetricsSort)) {
      const mm = metricsMap || {};
      if (wantsMetricsFilter) {
        items = items.filter((t) => {
          const m = mm[t.id] || { activeSubscribers: 0, totalSubscribers: 0 };
          if (typeof filter.minActiveSubscribers === 'number' && filter.minActiveSubscribers > 0) {
            if (m.activeSubscribers < filter.minActiveSubscribers) return false;
          }
          if (typeof filter.minTotalSubscribers === 'number' && filter.minTotalSubscribers > 0) {
            if (m.totalSubscribers < filter.minTotalSubscribers) return false;
          }
          return true;
        });
      }

      // Сортировка по метрикам (если требуется)
      if (wantsMetricsSort && filter.sortField) {
        const order = filter.sortOrder === 'desc' ? -1 : 1;
        const sf = filter.sortField;
        items = [...items].sort((a, b) => {
          const am = mm[a.id] || { activeSubscribers: 0, totalSubscribers: 0 };
          const bm = mm[b.id] || { activeSubscribers: 0, totalSubscribers: 0 };
          const av = sf === 'activeSubscribers' ? am.activeSubscribers : am.totalSubscribers;
          const bv = sf === 'activeSubscribers' ? bm.activeSubscribers : bm.totalSubscribers;
          if (av !== bv) return (av - bv) * order;
          // вторично сортируем по цене за месяц
          return (a.priceMonthly - b.priceMonthly) * order;
        });
      }
    }

    // Пагинация
    let page = filter.page || 1;
    let limit = filter.limit || TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    limit = Math.min(limit, TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS);

    let paginatedItems = items;
    let total = wantsMetricsSort || wantsMetricsFilter ? items.length : totalRaw;
    if (wantsMetricsSort || wantsMetricsFilter) {
      const start = (page - 1) * limit;
      paginatedItems = items.slice(start, start + limit);
    }

    const totalPages = Math.ceil((total || 0) / (limit || 1));

    await this.auditService.log(AuditAction.TARIFFS_LISTED, {
      details: {
        search: filter.search || null,
        isActive: typeof filter.isActive === 'boolean' ? filter.isActive : null,
        minPrice: filter.minPrice ?? null,
        maxPrice: filter.maxPrice ?? null,
        minActiveSubscribers: includeMetrics ? filter.minActiveSubscribers ?? null : null,
        minTotalSubscribers: includeMetrics ? filter.minTotalSubscribers ?? null : null,
        page,
        limit,
        sortField: filter.sortField || 'priceMonthly',
        sortOrder: filter.sortOrder || 'asc',
        includeMetrics,
      },
    });

    return {
      items: this.tariffsMapperService.mapArrayToResponseDto(
        paginatedItems,
        includeMetrics ? metricsMap : undefined,
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Получение только активных тарифов (публично)
   */
  async findActive(): Promise<TariffResponseDto[]> {
    this.logger.log('Получение активных тарифов');

    const tariffs = await this.tariffsDataService.findAll(true);
    await this.auditService.log(AuditAction.TARIFFS_LISTED, {
      details: { scope: 'active' },
    });

    // публичный ответ — без метрик
    return this.tariffsMapperService.mapArrayToResponseDto(tariffs);
  }

  /**
   * Получение тарифа по ID (публично)
   */
  async findOne(id: string): Promise<TariffResponseDto> {
    this.logger.log(`Поиск тарифа по ID: ${id}`);

    const tariff = await this.tariffsValidationService.validateTariffExists(id);
    await this.auditService.log(AuditAction.TARIFF_VIEWED, {
      resourceId: id,
      resourceType: 'Tariff',
      details: { id },
    });

    // публичный ответ — без метрик
    return this.tariffsMapperService.mapToResponseDto(tariff);
  }

  /**
   * Обновление тарифа (admin)
   */
  async update(id: string, updateTariffDto: UpdateTariffDto): Promise<TariffResponseDto> {
    this.logger.log(`Обновление тарифа: ${id}`);

    await this.tariffsValidationService.validateUpdateData(id, updateTariffDto);
    const updatedTariff = await this.tariffsBusinessService.updateTariff(id, updateTariffDto);

    this.logger.log(`Тариф успешно обновлен: ${updatedTariff.name} (${id})`);
    return this.tariffsMapperService.mapToResponseDto(updatedTariff);
  }

  /**
   * Изменение статуса активности тарифа (admin)
   */
  async setActive(id: string, isActive: boolean): Promise<TariffResponseDto> {
    this.logger.log(`Изменение статуса тарифа ${id} на ${isActive ? 'активен' : 'неактивен'}`);

    const updatedTariff = await this.tariffsBusinessService.toggleTariffStatus(id, isActive);

    this.logger.log(`Статус тарифа ${id} успешно изменен`);
    return this.tariffsMapperService.mapToResponseDto(updatedTariff);
  }

  /**
   * Удаление тарифа (admin)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление тарифа: ${id}`);

    await this.tariffsValidationService.validateTariffExists(id);
    await this.tariffsBusinessService.deleteTariff(id);

    this.logger.log(`Тариф успешно удален: ${id}`);
  }

  /**
   * ИСПРАВЛЕНО: Получение популярных тарифов с проверкой реальных подписок
   */
  async getPopular(limit: number = 5): Promise<TariffResponseDto[]> {
    this.logger.log(`Получение популярных тарифов (лимит: ${limit})`);

    // Получаем все активные тарифы
    const allActiveTariffs = await this.tariffsDataService.findAll(true);
    
    if (allActiveTariffs.length === 0) {
      this.logger.log('Нет активных тарифов');
      return [];
    }

    try {
      // Получаем метрики подписчиков для определения популярности
      const metricsMap = await this.tariffsDataService.getSubscribersMetricsByTariff(
        allActiveTariffs.map(t => t.id)
      );

      // ИСПРАВЛЕНО: Определяем минимальный порог для "популярности"
      const MIN_SUBSCRIPTIONS_FOR_POPULAR = 5;

      // Фильтруем тарифы с достаточным количеством подписок
      const popularTariffs = allActiveTariffs.filter(tariff => {
        const metrics = metricsMap[tariff.id];
        if (!metrics) return false;
        
        const activeCount = metrics.activeSubscribers || 0;
        const totalCount = metrics.totalSubscribers || 0;
        
        return activeCount >= MIN_SUBSCRIPTIONS_FOR_POPULAR || totalCount >= MIN_SUBSCRIPTIONS_FOR_POPULAR;
      });

      let resultTariffs = [];

      if (popularTariffs.length > 0) {
        this.logger.log(`Найдено ${popularTariffs.length} реально популярных тарифов`);
        
        // Сортируем по количеству активных подписчиков (убывание)
        resultTariffs = popularTariffs.sort((a, b) => {
          const aMetrics = metricsMap[a.id] || { activeSubscribers: 0, totalSubscribers: 0 };
          const bMetrics = metricsMap[b.id] || { activeSubscribers: 0, totalSubscribers: 0 };
          
          // Сначала по активным подписчикам
          const activeDiff = bMetrics.activeSubscribers - aMetrics.activeSubscribers;
          if (activeDiff !== 0) return activeDiff;
          
          // Потом по общему количеству
          const totalDiff = bMetrics.totalSubscribers - aMetrics.totalSubscribers;
          if (totalDiff !== 0) return totalDiff;
          
          // Наконец по цене (возрастание)
          return a.priceMonthly - b.priceMonthly;
        });
      } else {
        this.logger.log('Нет тарифов с достаточным количеством подписок, используем fallback');
        
        // ИСПРАВЛЕНО: Fallback - возвращаем highlighted тарифы или топ по позиции
        const highlightedTariffs = allActiveTariffs.filter(t => t.features?.highlight === true);
        
        if (highlightedTariffs.length > 0) {
          this.logger.log(`Используем ${highlightedTariffs.length} highlighted тарифов как fallback`);
          resultTariffs = highlightedTariffs;
        } else {
          this.logger.log('Используем сортировку по shelf_position как fallback');
          // Последний fallback: сортируем по shelf_position, потом по цене
          resultTariffs = [...allActiveTariffs].sort((a, b) => {
            const aPos = typeof a.features?.shelf_position === 'number' ? a.features.shelf_position : 999;
            const bPos = typeof b.features?.shelf_position === 'number' ? b.features.shelf_position : 999;
            
            if (aPos !== bPos) return aPos - bPos;
            return a.priceMonthly - b.priceMonthly;
          });
        }
      }

      // Ограничиваем результат запрошенным лимитом
      const finalTariffs = resultTariffs.slice(0, limit);

      await this.auditService.log(AuditAction.TARIFFS_POPULAR_VIEWED, {
        details: { 
          limit,
          foundReallyPopular: popularTariffs.length,
          returned: finalTariffs.length,
          usedFallback: popularTariffs.length === 0
        },
      });

      // публичный ответ — без метрик
      return this.tariffsMapperService.mapArrayToResponseDto(finalTariffs);

    } catch (error) {
      this.logger.error('Ошибка при получении метрик подписчиков, используем простой fallback', error);
      
      // Fallback при ошибке: возвращаем первые N активных тарифов по цене
      const fallbackTariffs = [...allActiveTariffs]
        .sort((a, b) => a.priceMonthly - b.priceMonthly)
        .slice(0, limit);

      await this.auditService.log(AuditAction.TARIFFS_POPULAR_VIEWED, {
        details: { 
          limit,
          error: true,
          returned: fallbackTariffs.length
        },
      });

      return this.tariffsMapperService.mapArrayToResponseDto(fallbackTariffs);
    }
  }

  /**
   * Сравнение тарифов (публично)
   */
  async compareTariffs(tariffIds: string[]): Promise<TariffResponseDto[]> {
    this.logger.log(`Сравнение тарифов: ${tariffIds.join(', ')}`);

    const tariffs = await Promise.all(tariffIds.map((id) => this.tariffsValidationService.validateTariffExists(id)));

    await this.auditService.log(AuditAction.TARIFFS_COMPARED, {
      details: { tariffIds },
    });

    // публичный ответ — без метрик
    return this.tariffsMapperService.mapArrayToResponseDto(tariffs);
  }

  /**
   * Получение статистики по тарифам (admin-only, пока заглушка)
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
   * Получение опций для селектов (для других модулей) — публичные активные
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
