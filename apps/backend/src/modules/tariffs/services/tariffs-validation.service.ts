import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TariffsDataService } from './tariffs-data.service';
import { Tariff } from '../../../database/entities';
import { CreateTariffData, UpdateTariffData } from '../types/tariffs.types';
import { ITariffsValidationService } from '../interfaces/tariffs.interface';
import { TARIFFS_CONSTANTS } from '../constants/tariffs.constants';

@Injectable()
export class TariffsValidationService implements ITariffsValidationService {
  constructor(
    private readonly tariffsDataService: TariffsDataService,
  ) {}

  /**
   * Валидация данных для создания тарифа
   */
  async validateCreateData(data: CreateTariffData): Promise<void> {
    // Проверяем уникальность названия
    await this.validateNameUniqueness(data.name);

    // Проверяем цены
    this.validatePrices(data.priceMonthly, data.priceYearly);

    // Проверяем лимиты
    this.validateLimits({
      maxUsers: data.maxUsers,
      maxCustomers: data.maxCustomers,
      maxVehicles: data.maxVehicles,
      maxOrders: data.maxOrders,
    });

    // Дополнительные бизнес-правила
    this.validateBusinessRules(data);
  }

  /**
   * Валидация данных для обновления тарифа
   */
  async validateUpdateData(id: string, data: UpdateTariffData): Promise<void> {
    // Проверяем существование тарифа
    await this.validateTariffExists(id);

    // Если меняется название, проверяем уникальность
    if (data.name) {
      await this.validateNameUniqueness(data.name, id);
    }

    // Если меняются цены, проверяем их
    if (data.priceMonthly !== undefined || data.priceYearly !== undefined) {
      this.validatePrices(data.priceMonthly, data.priceYearly);
    }

    // Если меняются лимиты, проверяем их
    const limitsToValidate = {
      maxUsers: data.maxUsers,
      maxCustomers: data.maxCustomers,
      maxVehicles: data.maxVehicles,
      maxOrders: data.maxOrders,
    };

    if (Object.values(limitsToValidate).some(limit => limit !== undefined)) {
      this.validateLimits(limitsToValidate);
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
   * Проверка уникальности названия
   */
  async validateNameUniqueness(name: string, excludeId?: string): Promise<void> {
    const existingTariff = await this.tariffsDataService.findByName(name);
    
    if (existingTariff && existingTariff.id !== excludeId) {
      throw new ConflictException(`Тариф с названием "${name}" уже существует`);
    }
  }

  /**
   * Валидация цен
   */
  validatePrices(monthlyPrice?: number, yearlyPrice?: number): void {
    if (monthlyPrice !== undefined) {
      if (monthlyPrice < TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE) {
        throw new BadRequestException(
          `Месячная цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE}`
        );
      }

      if (monthlyPrice > TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100) {
        throw new BadRequestException(
          `Месячная цена не может превышать ${TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE} руб.`
        );
      }
    }

    if (yearlyPrice !== undefined) {
      if (yearlyPrice < TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE) {
        throw new BadRequestException(
          `Годовая цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE}`
        );
      }

      if (yearlyPrice > TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100) {
        throw new BadRequestException(
          `Годовая цена не может превышать ${TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE} руб.`
        );
      }
    }

    // Проверяем соотношение цен (если обе указаны)
    if (monthlyPrice !== undefined && yearlyPrice !== undefined) {
      const maxYearlyPrice = monthlyPrice * 12;
      if (yearlyPrice > maxYearlyPrice) {
        throw new BadRequestException(
          'Годовая цена не может быть больше месячной цены умноженной на 12'
        );
      }

      // Минимальная скидка за год должна быть хотя бы 1%
      const minYearlyPrice = monthlyPrice * 12 * 0.99;
      if (yearlyPrice > minYearlyPrice) {
        throw new BadRequestException(
          'Годовая цена должна предоставлять скидку минимум 1% от месячной оплаты'
        );
      }
    }
  }

  /**
   * Валидация лимитов
   */
  validateLimits(limits: { 
    maxUsers?: number | null; 
    maxCustomers?: number | null; 
    maxVehicles?: number | null; 
    maxOrders?: number | null; 
  }): void {
    Object.entries(limits).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Проверяем что лимит положительный
        if (value <= 0 && value !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE) {
          throw new BadRequestException(
            `${this.getLimitDisplayName(key)} должен быть больше 0 или равен -1 для безлимитного тарифа`
          );
        }

        // Проверяем максимальное значение
        if (value > TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE) {
          throw new BadRequestException(
            `${this.getLimitDisplayName(key)} не может превышать ${TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE}`
          );
        }
      }
    });

    // Дополнительная логическая валидация лимитов
    if (limits.maxUsers && limits.maxCustomers) {
      // Клиентов обычно больше чем пользователей
      if (limits.maxCustomers < limits.maxUsers && 
          limits.maxCustomers !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE) {
        throw new BadRequestException(
          'Лимит клиентов не должен быть меньше лимита пользователей'
        );
      }
    }

    if (limits.maxCustomers && limits.maxVehicles) {
      // ТС обычно больше чем клиентов (у клиента может быть несколько ТС)
      if (limits.maxVehicles < limits.maxCustomers && 
          limits.maxVehicles !== TARIFFS_CONSTANTS.DEFAULTS.UNLIMITED_VALUE) {
        throw new BadRequestException(
          'Лимит транспортных средств не должен быть меньше лимита клиентов'
        );
      }
    }
  }

  /**
   * Дополнительные бизнес-правила
   */
  private validateBusinessRules(data: CreateTariffData): void {
    // Проверяем features
    if (data.features) {
      const allowedFeatures = [
        'reports', 'analytics', 'api_access', 'priority_support', 
        'custom_fields', 'integrations', 'advanced_reports', 'white_label'
      ];

      Object.keys(data.features).forEach(feature => {
        if (!allowedFeatures.includes(feature)) {
          throw new BadRequestException(
            `Неподдерживаемая возможность: ${feature}. Доступные: ${allowedFeatures.join(', ')}`
          );
        }
      });
    }

    // Проверяем что название не содержит запрещенных слов
    const forbiddenWords = ['test', 'tmp', 'temporary', 'удалить'];
    const lowerName = data.name.toLowerCase();
    
    if (forbiddenWords.some(word => lowerName.includes(word))) {
      throw new BadRequestException(
        'Название тарифа содержит недопустимые слова'
      );
    }
  }

  /**
   * Получение понятного названия лимита
   */
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
