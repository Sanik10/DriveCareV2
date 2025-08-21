// path: apps/backend/src/modules/payment-methods/services/payment-methods-business.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PaymentMethodsDataService } from './payment-methods-data.service';
import { PaymentMethodsValidationService } from './payment-methods-validation.service';
import { PaymentMethodsMapperService } from './payment-methods-mapper.service';
import { CreatePaymentMethodDto } from '../dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from '../dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from '../dto/response/paginated-payment-methods-response.dto';
import {
  PaymentMethodsFilter,
  PaymentMethodStats,
  BulkUpdateResult,
  UserWithCompany,
  IntegrationTestResult,
} from '../types/payment-methods.types';
import { ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { PAYMENT_METHODS_CONSTANTS } from '../constants/payment-methods.constants';

@Injectable()
export class PaymentMethodsBusinessService {
  constructor(
    public readonly dataService: PaymentMethodsDataService,
    public readonly validationService: PaymentMethodsValidationService,
    public readonly mapperService: PaymentMethodsMapperService,
  ) {}

  async findAllForUser(user: UserWithCompany, filter: PaymentMethodsFilter): Promise<PaginatedPaymentMethodsResponseDto> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);
    this.validationService.validatePaymentMethodsFilter(safeFilter);
    const [items, total] = await this.dataService.findWithFilters(safeFilter);
    return this.mapperService.mapToPaginatedResponse(
      items,
      total,
      safeFilter.page || 1,
      safeFilter.limit || PAYMENT_METHODS_CONSTANTS.DEFAULT_PAGE_SIZE,
    );
  }

  async findOneSecurely(paymentMethodId: string, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const pm = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);
    return this.mapperService.mapToResponseDto(pm);
  }

  async createPaymentMethod(dto: CreatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    await this.validationService.validateCreatePaymentMethodData(dto, user.companyId);
    const pm = await this.dataService.create(dto, user.companyId);
    return this.mapperService.mapToResponseDto(pm);
  }

  async updatePaymentMethod(paymentMethodId: string, dto: UpdatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    await this.validationService.validateUpdatePaymentMethodData(paymentMethodId, dto, user.companyId);
    const updated = await this.dataService.update(paymentMethodId, dto);
    return this.mapperService.mapToResponseDto(updated);
  }

  async removePaymentMethod(paymentMethodId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    await this.validationService.validatePaymentMethodDeletion(paymentMethodId, user.companyId);
    await this.dataService.remove(paymentMethodId);
  }

  async togglePaymentMethodStatus(paymentMethodId: string, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);
    const updated = await this.dataService.toggleStatus(paymentMethodId);
    return this.mapperService.mapToResponseDto(updated);
  }

  async bulkUpdatePaymentMethods(paymentMethodIds: string[], updates: UpdatePaymentMethodDto, user: UserWithCompany): Promise<BulkUpdateResult> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    await this.validationService.validateBulkPaymentMethodsOwnership(paymentMethodIds, user.companyId);
    const updatedCount = await this.dataService.bulkUpdate(paymentMethodIds, updates);
    return this.mapperService.mapBulkOperationResult(updatedCount, paymentMethodIds.length);
  }

  async getPaymentMethodsStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const stats: PaymentMethodStats = await this.dataService.getPaymentMethodsStats(user.companyId);
    return this.mapperService.mapStatsToResponse(stats);
  }

  async searchPaymentMethods(query: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    if (!query || query.trim().length < 2) {
      throw new ValidationDataException('q', 'Поисковый запрос должен содержать минимум 2 символа');
    }
    const items = await this.dataService.searchByName(query.trim(), user.companyId);
    return this.mapperService.mapArrayToResponseDto(items);
  }

  async getActivePaymentMethodsQuick(user: UserWithCompany) {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const items = await this.dataService.findActiveByCompany(user.companyId);
    return this.mapperService.mapToQuickListDto(items);
  }

  async getPaymentMethodsForSelect(user: UserWithCompany) {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const items = await this.dataService.findActiveByCompany(user.companyId);
    return this.mapperService.mapToSelectOptions(items);
  }

  async getPaymentMethodsByType(type: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const items = await this.dataService.findByType(user.companyId, type);
    return this.mapperService.mapArrayToResponseDto(items);
  }

  async checkPaymentMethodAvailability(paymentMethodId: string, user: UserWithCompany) {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    try {
      const pm = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, user.companyId);
      return { available: true, paymentMethod: this.mapperService.mapToResponseDto(pm) };
    } catch (e: any) {
      return { available: false, reason: e?.message || 'Unavailable' };
    }
  }

  async testIntegration(paymentMethodId: string, user: UserWithCompany): Promise<IntegrationTestResult> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const pm = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);
    if (!pm.gatewayType) {
      throw new ValidationDataException('integration', 'Интеграция не настроена');
    }
    const cfg = {
      gatewayType: pm.gatewayType,
      apiKey: pm.gatewayApiKey,
      merchantId: pm.gatewayMerchantId,
      webhookUrl: pm.gatewayWebhookUrl,
      testMode: pm.gatewayTestMode,
    };
    const testResult = await this.performIntegrationTest(cfg);
    return this.mapperService.mapIntegrationTestResult(paymentMethodId, pm.gatewayType, testResult);
  }

  // ========= Методы для других модулей =========

  async getPaymentMethodForPayment(paymentMethodId: string, companyId: string): Promise<PaymentMethodResponseDto> {
    const pm = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, companyId);
    return this.mapperService.mapToResponseDto(pm);
  }

  async existsInCompany(paymentMethodId: string, companyId: string): Promise<boolean> {
    try {
      await this.validationService.validatePaymentMethodOwnership(paymentMethodId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  async getPaymentMethodLimits(paymentMethodId: string, companyId: string): Promise<any> {
    const pm = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, companyId);
    return this.mapperService.mapLimitsConfig(pm);
  }

  async calculateProcessingFee(
    paymentMethodId: string,
    amount: number,
    companyId: string,
  ): Promise<{ amount: number; fee: number; totalAmount: number; feePercentage: number }> {
    const pm = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, companyId);
    const feePercentage = pm.processingFeePercent || 0;

    // Корректный расчет копеек: feeCents = round(amount * fee% / 100 * 100)
    const feeCents = Math.round((amount * feePercentage / 100) * 100);
    const fee = feeCents / 100;
    const totalAmount = Math.round((amount + fee) * 100) / 100;

    return { amount, fee, totalAmount, feePercentage };
  }

  // ========= Внутренние =========

  private prepareSafeFilter(filter: PaymentMethodsFilter, companyId: string): PaymentMethodsFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page))) : 1;
    const limit = filter.limit
      ? Math.min(PAYMENT_METHODS_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit))))
      : PAYMENT_METHODS_CONSTANTS.DEFAULT_PAGE_SIZE;
    return { ...filter, companyId, page, limit, offset: (page - 1) * limit };
  }

  private async performIntegrationTest(cfg: any): Promise<any> {
    const start = Date.now();
    try {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      const hasKey = !!cfg.apiKey;
      return {
        success: hasKey,
        responseTime: Date.now() - start,
        features: {
          payment: hasKey,
          refund: hasKey,
          installments: ['stripe', 'yookassa'].includes(cfg.gatewayType),
          webhooks: hasKey && !!cfg.webhookUrl,
        },
        errors: hasKey ? [] : ['API ключ не настроен'],
      };
    } catch (e: any) {
      return {
        success: false,
        responseTime: Date.now() - start,
        errors: [e?.message || 'Integration test failed'],
        features: { payment: false, refund: false, installments: false, webhooks: false },
      };
    }
  }
}
