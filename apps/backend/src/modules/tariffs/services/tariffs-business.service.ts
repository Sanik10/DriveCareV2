// path: apps/backend/src/modules/tariffs/services/tariffs-business.service.ts
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

    // Обработка features (в т.ч. маркетинговые поля)
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

    // Валидация ценообразования (если меняются цены) — проверяем в связке с текущими
    if (data.priceMonthly !== undefined || data.priceYearly !== undefined) {
      const monthlyPrice = data.priceMonthly ?? beforeTariff.priceMonthly;
      const yearlyPrice = data.priceYearly ?? beforeTariff.priceYearly;
      this.validatePricing(monthlyPrice, yearlyPrice);
    }

    // Обработка features (в т.ч. маркетинговые поля)
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

    // Безопасность: запрещаем удаление активного тарифа
    if (tariff.isActive) {
      throw new BadRequestException('Нельзя удалить активный тариф. Сначала деактивируйте тариф.');
    }

    // Проверка наличия подписчиков (активных и исторических) — блокируем удаление,
    // чтобы не ломать историю и связи
    const metrics = await this.tariffsDataService.getSubscribersMetricsByTariff([id]);
    const m = metrics[id] || { activeSubscribers: 0, totalSubscribers: 0 };

    if (m.activeSubscribers > 0) {
      throw new BadRequestException(
        'Нельзя удалить тариф, на который есть активные подписки. Сначала дождитесь завершения подписок.',
      );
    }
    if (m.totalSubscribers > 0) {
      // Если нужно разрешить удаление после миграции исторических данных — это правило можно ослабить
      throw new BadRequestException(
        'Нельзя удалить тариф, который уже использовался компаниями. Рекомендуется оставить его деактивированным.',
      );
    }

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
    if (yearlyFromMonthly <= 0) return 0;
    const discount = ((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100;
    return Math.round(discount * 100) / 100; // Округляем до 2 знаков
  }

  /**
   * Валидация ценообразования (единое правило, согласованное с TariffsValidationService)
   */
  validatePricing(monthlyPrice: number, yearlyPrice: number): void {
    // Годовая цена не может быть больше месячной × 12
    const maxYearlyPrice = monthlyPrice * 12;
    if (yearlyPrice > maxYearlyPrice) {
      throw new BadRequestException(
        `Годовая цена (${yearlyPrice.toFixed(2)} руб.) не может быть больше месячной цены × 12 (${maxYearlyPrice.toFixed(
          2,
        )} руб.)`,
      );
    }

    // Минимальная скидка за год (процент из констант, по умолчанию 1%)
    const MIN_DISCOUNT =
      ((TARIFFS_CONSTANTS as any)?.VALIDATION?.MIN_YEARLY_DISCOUNT_PERCENT as number | undefined) ?? 1;
    const minYearlyPrice = monthlyPrice * 12 * (1 - MIN_DISCOUNT / 100);

    if (yearlyPrice > minYearlyPrice) {
      const currentDiscount = this.calculateYearlyDiscount(monthlyPrice, yearlyPrice);
      throw new BadRequestException(
        `Скидка за годовую оплату слишком мала (${currentDiscount}%). Минимальная скидка должна быть ${MIN_DISCOUNT}%.`,
      );
    }
  }

  /**
   * Обработка и стандартизация features
   * - нормализация boolean-строк
   * - поддержка маркетинговых полей: recommended, badge, tags/labels, highlight, shelf_position/display_rank
   * - объединение с базовыми функциональными фичами (FEATURES.BASIC)
   */
  processFeatures(features?: TariffFeatures): TariffFeatures {
    const base: TariffFeatures = { ...TARIFFS_CONSTANTS.FEATURES.BASIC };
    if (!features || typeof features !== 'object') {
      return base;
    }

    const processed: TariffFeatures = {
      ...base,
      ...features,
    };

    // Нормализация boolean-строк
    Object.keys(processed).forEach((key) => {
      const value = (processed as any)[key];
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true' || v === '1') (processed as any)[key] = true;
        else if (v === 'false' || v === '0') (processed as any)[key] = false;
      }
    });

    // badge
    if ((processed as any).badge !== undefined) {
      const badge = this.normalizeBadge((processed as any).badge);
      if (badge) (processed as any).badge = badge;
      else delete (processed as any).badge;
    }

    // recommended / highlight → boolean
    if ((processed as any).recommended !== undefined) {
      (processed as any).recommended = !!(processed as any).recommended;
    }
    if ((processed as any).highlight !== undefined) {
      (processed as any).highlight = !!(processed as any).highlight;
    }

    // tags / labels → массив строк, уникальный, очищенный
    const rawTags =
      (processed as any).tags ??
      (processed as any).labels ??
      undefined;

    if (rawTags !== undefined) {
      let tags: string[] = [];
      if (typeof rawTags === 'string') {
        tags = rawTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(rawTags)) {
        tags = rawTags.map((x) => String(x).trim()).filter(Boolean);
      }
      // нормализация: ограничиваем длину тега, убираем дубликаты, обрезаем массив
      const set = new Set<string>();
      for (const t of tags) {
        const tt = t.slice(0, 40);
        if (tt) set.add(tt);
        if (set.size >= 50) break;
      }
      const norm = Array.from(set);
      if (norm.length > 0) (processed as any).tags = norm;
      else delete (processed as any).tags;

      // labels больше не держим (единизируем в tags)
      if ('labels' in processed) delete (processed as any).labels;
    }

    // shelf_position / display_rank → shelf_position int 0..9999
    const pos = (processed as any).shelf_position ?? (processed as any).display_rank;
    if (pos !== undefined) {
      const n = typeof pos === 'string' ? Number(pos) : pos;
      if (Number.isFinite(n) && Math.floor(n as number) === (n as number) && (n as number) >= 0 && (n as number) <= 9999) {
        (processed as any).shelf_position = Number(n);
      } else {
        delete (processed as any).shelf_position;
      }
      if ('display_rank' in processed) delete (processed as any).display_rank;
    }

    return processed;
  }

  private normalizeBadge(badge: unknown): string | undefined {
    if (typeof badge !== 'string') return undefined;
    const v = badge.trim().toLowerCase();
    const allowed = ['popular', 'best_value', 'new', 'sale', 'recommended', 'hot'];
    return allowed.includes(v) ? v : undefined;
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
      updatedAt,
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
      updatedAt,
    };
  }
}
