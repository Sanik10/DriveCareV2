// path: apps/backend/src/modules/tariffs/services/tariffs-validation.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TariffsDataService } from './tariffs-data.service';
import { Tariff } from '../../../database/entities';
import { CreateTariffData, UpdateTariffData } from '../types/tariffs.types';
import { ITariffsValidationService } from '../interfaces/tariffs.interface';
import { TARIFFS_CONSTANTS } from '../constants/tariffs.constants';

@Injectable()
export class TariffsValidationService implements ITariffsValidationService {
  constructor(private readonly tariffsDataService: TariffsDataService) {}

  /**
   * Валидация данных для создания тарифа
   */
  async validateCreateData(data: CreateTariffData): Promise<void> {
    await this.validateNameUniqueness(data.name);

    this.validatePrices(data.priceMonthly, data.priceYearly);

    this.validateLimits({
      maxUsers: data.maxUsers as any,
      maxCustomers: data.maxCustomers as any,
      maxVehicles: data.maxVehicles as any,
      maxOrders: data.maxOrders as any,
    });

    this.validateBusinessRules(data);
  }

  /**
   * Валидация данных для обновления тарифа
   */
  async validateUpdateData(id: string, data: UpdateTariffData): Promise<void> {
    // Проверяем, что тариф существует и используем его значения как базовые
    const existing = await this.validateTariffExists(id);

    if (data.name) {
      await this.validateNameUniqueness(data.name, id);
    }

    if (data.priceMonthly !== undefined || data.priceYearly !== undefined) {
      const monthly = data.priceMonthly ?? existing.priceMonthly;
      const yearly = data.priceYearly ?? existing.priceYearly;
      this.validatePrices(monthly, yearly);
    }

    const limitsToValidate = {
      maxUsers: data.maxUsers as any,
      maxCustomers: data.maxCustomers as any,
      maxVehicles: data.maxVehicles as any,
      maxOrders: data.maxOrders as any,
    };

    if (Object.values(limitsToValidate).some((limit) => limit !== undefined)) {
      this.validateLimits(limitsToValidate);
    }

    // Бизнес-правила также применим (в т.ч. к features)
    if (data.features) {
      this.validateBusinessRules({ ...(existing as any), ...data });
    }
  }

  /**
   * Проверка существования тарифа
   */
  async validateTariffExists(id: string): Promise<Tariff> {
    const tariff = await this.tariffsDataService.findById(id);

    if (!tariff) {
      throw new NotFoundException(`Тариф с ID ${id} не найден`);
    }

    return tariff;
  }

  /**
   * Проверка уникальности названия (case-insensitive)
   */
  async validateNameUniqueness(name: string, excludeId?: string): Promise<void> {
    const existingTariff = await this.tariffsDataService.findByName(name);

    if (existingTariff && existingTariff.id !== excludeId) {
      throw new ConflictException(`Тариф с названием "${name}" уже существует`);
    }
  }

  /**
   * Валидация цен (рубли, decimal)
   */
  validatePrices(monthlyPrice?: number, yearlyPrice?: number): void {
    if (monthlyPrice !== undefined) {
      if (monthlyPrice < TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE) {
        throw new BadRequestException(
          `Месячная цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE}`,
        );
      }

      if (monthlyPrice > TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE) {
        throw new BadRequestException(
          `Месячная цена не может превышать ${TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE} руб.`,
        );
      }
    }

    if (yearlyPrice !== undefined) {
      if (yearlyPrice < TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE) {
        throw new BadRequestException(
          `Годовая цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE}`,
        );
      }

      if (yearlyPrice > TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE) {
        throw new BadRequestException(
          `Годовая цена не может превышать ${TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE} руб.`,
        );
      }
    }

    if (monthlyPrice !== undefined && yearlyPrice !== undefined) {
      const maxYearlyPrice = monthlyPrice * 12;
      if (yearlyPrice > maxYearlyPrice) {
        throw new BadRequestException('Годовая цена не может быть больше месячной цены × 12');
      }

      // Минимальная скидка за год — из констант (по умолчанию 1%)
      const MIN_DISCOUNT =
        ((TARIFFS_CONSTANTS as any)?.VALIDATION?.MIN_YEARLY_DISCOUNT_PERCENT as number | undefined) ?? 1;
      const minYearlyPrice = monthlyPrice * 12 * (1 - MIN_DISCOUNT / 100);

      if (yearlyPrice > minYearlyPrice) {
        throw new BadRequestException(
          `Годовая цена должна предоставлять скидку минимум ${MIN_DISCOUNT}% от месячной оплаты`,
        );
      }
    }
  }

  /**
   * Валидация лимитов (null = безлимит, -1 = безлимит в БД)
   */
  validateLimits(limits: {
    maxUsers?: number | null;
    maxCustomers?: number | null;
    maxVehicles?: number | null;
    maxOrders?: number | null;
  }): void {
    Object.entries(limits).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value <= 0 && value !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE) {
          throw new BadRequestException(
            `${this.getLimitDisplayName(key)} должен быть больше 0 или null для безлимита`,
          );
        }

        if (value > TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE) {
          throw new BadRequestException(
            `${this.getLimitDisplayName(key)} не может превышать ${TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE}`,
          );
        }
      }
    });

    if (limits.maxUsers && limits.maxCustomers) {
      if (
        limits.maxCustomers < limits.maxUsers &&
        limits.maxCustomers !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE
      ) {
        throw new BadRequestException('Лимит клиентов не должен быть меньше лимита пользователей');
      }
    }

    if (limits.maxCustomers && limits.maxVehicles) {
      if (
        limits.maxVehicles < limits.maxCustomers &&
        limits.maxVehicles !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE
      ) {
        throw new BadRequestException('Лимит транспортных средств не должен быть меньше лимита клиентов');
      }
    }
  }

  /**
   * Дополнительные бизнес-правила (в т.ч. валидируем marketing-поля в features)
   */
  private validateBusinessRules(data: CreateTariffData): void {
    if (data.features) {
      const allowedFeatures = [
        // функциональные возможности
        'reports',
        'analytics',
        'api_access',
        'priority_support',
        'custom_fields',
        'integrations',
        'advanced_reports',
        'white_label',
        // маркетинговые поля (для UI, чтобы не трогать JSON вручную)
        'recommended', // boolean
        'badge', // string: popular|best_value|new|sale|recommended|hot
        'tags', // string[]
        'labels', // string[] (синоним tags)
        'highlight', // boolean
        'shelf_position', // number
        'display_rank', // number (синоним для позиции в списке)
        'showcase_rank', // number (1..3) — место в ТОП‑3 витрины
      ];

      Object.keys(data.features).forEach((feature) => {
        if (!allowedFeatures.includes(feature)) {
          throw new BadRequestException(
            `Неподдерживаемая возможность: ${feature}. Доступные: ${allowedFeatures.join(', ')}`,
          );
        }
      });

      const f: Record<string, any> = data.features;

      // badge
      if (f.badge !== undefined) {
        if (typeof f.badge !== 'string') {
          throw new BadRequestException('Поле "badge" должно быть строкой');
        }
        const allowedBadges = ['popular', 'best_value', 'new', 'sale', 'recommended', 'hot'];
        if (!allowedBadges.includes(String(f.badge))) {
          throw new BadRequestException(
            `Недопустимое значение "badge". Разрешено: ${allowedBadges.join(', ')}`,
          );
        }
      }

      // recommended / highlight
      ['recommended', 'highlight'].forEach((k) => {
        const v = f[k];
        if (v !== undefined && typeof v !== 'boolean' && !(typeof v === 'string' && /^(true|false|0|1)$/i.test(v))) {
          throw new BadRequestException(`Поле "${k}" должно быть boolean (true/false)`);
        }
      });

      // tags/labels
      const tags = Array.isArray(f.tags) ? (f.tags as unknown[]) : Array.isArray(f.labels) ? (f.labels as unknown[]) : undefined;
      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          throw new BadRequestException('Поле "tags"/"labels" должно быть массивом строк');
        }
        if (tags.length > 50) {
          throw new BadRequestException('Количество тегов не может превышать 50');
        }
        for (const t of tags) {
          if (typeof t !== 'string') {
            throw new BadRequestException('Каждый тег должен быть строкой');
          }
          if (t.length > 40) {
            throw new BadRequestException('Длина тега не должна превышать 40 символов');
          }
        }
      }

      // shelf_position / display_rank (позиция в общем списке)
      const pos = f.shelf_position ?? f.display_rank;
      if (pos !== undefined) {
        const n = typeof pos === 'string' ? Number(pos) : pos;
        if (!Number.isFinite(n as number) || Math.floor(n as number) !== n || (n as number) < 0 || (n as number) > 9999) {
          throw new BadRequestException('Поле "shelf_position"/"display_rank" должно быть целым числом 0..9999');
        }
      }

      // showcase_rank (строго 1..3) — управление ТОП‑3 витрины
      if (f.showcase_rank !== undefined) {
        const n = typeof f.showcase_rank === 'string' ? Number(f.showcase_rank) : f.showcase_rank;
        if (!Number.isFinite(n) || Math.floor(n) !== n || n < 1 || n > 3) {
          throw new BadRequestException('Поле "showcase_rank" должно быть целым числом 1..3');
        }
      }
    }

    const forbiddenWords = ['test', 'tmp', 'temporary', 'удалить'];
    const lowerName = (data.name || '').toLowerCase();

    if (forbiddenWords.some((word) => lowerName.includes(word))) {
      throw new BadRequestException('Название тарифа содержит недопустимые слова');
    }
  }

  private getLimitDisplayName(limitKey: string): string {
    const displayNames: Record<string, string> = {
      maxUsers: 'Лимит пользователей',
      maxCustomers: 'Лимит клиентов',
      maxVehicles: 'Лимит транспортных средств',
      maxOrders: 'Лимит заказов',
    };

    return displayNames[limitKey] || limitKey;
  }
}
