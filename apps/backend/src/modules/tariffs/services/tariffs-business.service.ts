import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { TariffsDataService } from './tariffs-data.service';
import { Tariff } from '../../../database/entities';
import { CreateTariffData, UpdateTariffData, TariffFeatures } from '../types/tariffs.types';
import { ITariffsBusinessService } from '../interfaces/tariffs.interface';
import { TARIFFS_CONSTANTS } from '../constants/tariffs.constants';

@Injectable()
export class TariffsBusinessService implements ITariffsBusinessService {
  private readonly logger = new Logger(TariffsBusinessService.name);

  constructor(
    private readonly tariffsDataService: TariffsDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Создание тарифа с бизнес-логикой
   */
  async createTariff(data: CreateTariffData): Promise<Tariff> {
    this.logger.log(`Создание нового тарифа: ${data.name}`);

    // Валидация ценообразования
    this.validatePricing(data.priceMonthly, data.priceYearly);

    // Обработка features
    const processedFeatures = this.processFeatures(data.features);

    // Создаем тариф
    const tariff = await this.tariffsDataService.create({
      ...data,
      features: processedFeatures,
    });

    // Логируем создание
    await this.auditService.logTariffCreated({
      entityId: tariff.id,
      entityType: 'Tariff',
      changes: { after: this.sanitizeTariffData(tariff) },
      metadata: {
        name: tariff.name,
        priceMonthly: tariff.priceMonthly,
        priceYearly: tariff.priceYearly,
        yearlyDiscount: this.calculateYearlyDiscount(tariff.priceMonthly, tariff.priceYearly),
      },
    });

    this.logger.log(`Тариф успешно создан: ${tariff.name} (${tariff.id})`);

    return tariff;
  }

  /**
   * Обновление тарифа с бизнес-логикой
   */
  async updateTariff(id: string, data: UpdateTariffData): Promise<Tariff> {
    this.logger.log(`Обновление тарифа: ${id}`);

    // Получаем текущие данные для аудита
    const beforeTariff = await this.tariffsDataService.findById(id);
    if (!beforeTariff) {
      throw new Error(`Tariff with id ${id} not found`);
    }

    // Валидация ценообразования (если меняются цены)
    if (data.priceMonthly !== undefined || data.priceYearly !== undefined) {
      const monthlyPrice = data.priceMonthly ?? beforeTariff.priceMonthly;
      const yearlyPrice = data.priceYearly ?? beforeTariff.priceYearly;
      this.validatePricing(monthlyPrice, yearlyPrice);
    }

    // Обработка features (если меняются)
    if (data.features !== undefined) {
      data.features = this.processFeatures(data.features);
    }

    // Обновляем данные
    const updatedTariff = await this.tariffsDataService.update(id, data);

    // Логируем обновление
    await this.auditService.logTariffUpdated({
      entityId: id,
      entityType: 'Tariff',
      changes: {
        before: this.sanitizeTariffData(beforeTariff),
        after: this.sanitizeTariffData(updatedTariff),
      },
      metadata: {
        updatedFields: Object.keys(data),
        name: updatedTariff.name,
        previousName: beforeTariff.name,
      },
    });

    this.logger.log(`Тариф успешно обновлен: ${updatedTariff.name} (${id})`);

    return updatedTariff;
  }

  /**
   * Удаление тарифа с бизнес-логикой
   */
  async deleteTariff(id: string): Promise<void> {
    this.logger.log(`Удаление тарифа: ${id}`);

    // Получаем данные тарифа для аудита
    const tariff = await this.tariffsDataService.findById(id);
    if (!tariff) {
      throw new Error(`Tariff with id ${id} not found`);
    }

    // TODO: Проверить, есть ли активные подписки на этот тариф
    // if (hasActiveSubscriptions) {
    //   throw new BadRequestException('Нельзя удалить тариф с активными подписками');
    // }

    // Удаляем тариф
    await this.tariffsDataService.delete(id);

    // Логируем удаление
    await this.auditService.logTariffDeleted({
      entityId: id,
      entityType: 'Tariff',
      changes: { before: this.sanitizeTariffData(tariff) },
      metadata: {
        name: tariff.name,
        priceMonthly: tariff.priceMonthly,
        priceYearly: tariff.priceYearly,
      },
    });

    this.logger.log(`Тариф успешно удален: ${tariff.name} (${id})`);
  }

  /**
   * Изменение статуса тарифа с бизнес-логикой
   */
  async toggleTariffStatus(id: string, isActive: boolean): Promise<Tariff> {
    this.logger.log(`Изменение статуса тарифа ${id} на ${isActive ? 'активен' : 'неактивен'}`);

    // Получаем текущие данные
    const beforeTariff = await this.tariffsDataService.findById(id);
    if (!beforeTariff) {
      throw new Error(`Tariff with id ${id} not found`);
    }

    // Изменяем статус
    const updatedTariff = await this.tariffsDataService.setActive(id, isActive);

    // Логируем изменение статуса
    await this.auditService.logTariffStatusChanged({
      entityId: id,
      entityType: 'Tariff',
      changes: {
        before: { isActive: beforeTariff.isActive },
        after: { isActive: updatedTariff.isActive },
      },
      metadata: {
        name: updatedTariff.name,
        statusAction: isActive ? 'activated' : 'deactivated',
      },
    });

    this.logger.log(`Статус тарифа ${id} успешно изменен на ${isActive ? 'активен' : 'неактивен'}`);

    return updatedTariff;
  }

  /**
   * 💰 Расчет скидки при годовой оплате
   */
  calculateYearlyDiscount(monthlyPrice: number, yearlyPrice: number): number {
    if (monthlyPrice <= 0 || yearlyPrice <= 0) return 0;
    
    const yearlyFromMonthly = monthlyPrice * 12;
    const discount = ((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100;
    
    return Math.round(discount * 100) / 100; // Округляем до 2 знаков
  }

  /**
   * Валидация ценообразования
   */
  validatePricing(monthlyPrice: number, yearlyPrice: number): void {
    // Годовая цена не может быть больше месячной * 12
    const maxYearlyPrice = monthlyPrice * 12;
    if (yearlyPrice > maxYearlyPrice) {
      throw new BadRequestException(
        `Годовая цена (${yearlyPrice / 100} руб.) не может быть больше месячной цены × 12 (${maxYearlyPrice / 100} руб.)`
      );
    }

    // Минимальная скидка за годовую оплату (например, 5%)
    const minYearlyPrice = monthlyPrice * 12 * 0.95; // 5% скидка минимум
    if (yearlyPrice > minYearlyPrice) {
      const currentDiscount = this.calculateYearlyDiscount(monthlyPrice, yearlyPrice);
      throw new BadRequestException(
        `Скидка за годовую оплату слишком мала (${currentDiscount}%). Минимальная скидка должна быть 5%.`
      );
    }
  }

  /**
   * Обработка и стандартизация features
   */
  processFeatures(features?: TariffFeatures): TariffFeatures {
    if (!features) {
      return { ...TARIFFS_CONSTANTS.FEATURES.BASIC };
    }

    // Объединяем с базовыми features и нормализуем булевые значения
    const processedFeatures: TariffFeatures = {
      ...TARIFFS_CONSTANTS.FEATURES.BASIC,
      ...features,
    };

    // Нормализуем булевые значения
    Object.keys(processedFeatures).forEach(key => {
      const value = processedFeatures[key];
      if (typeof value === 'string') {
        processedFeatures[key] = value.toLowerCase() === 'true';
      }
    });

    return processedFeatures;
  }

  /**
   * Санитизация данных тарифа для аудита
   */
  private sanitizeTariffData(tariff: Tariff): Partial<Tariff> {
    const {
      id,
      name,
      description,
      priceMonthly,
      priceYearly,
      maxUsers,
      maxCustomers,
      maxVehicles,
      maxOrders,
      isActive,
      createdAt,
      updatedAt
    } = tariff;

    return {
      id,
      name,
      description,
      priceMonthly,
      priceYearly,
      maxUsers,
      maxCustomers,
      maxVehicles,
      maxOrders,
      isActive,
      createdAt,
      updatedAt
    };
  }
}
