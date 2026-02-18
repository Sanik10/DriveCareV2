// path: apps/backend/src/modules/payment-methods/services/payment-methods-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../../database/entities';
import { PaymentMethodResponseDto } from '../dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from '../dto/response/paginated-payment-methods-response.dto';
import {
  PaymentMethodStats,
  BulkUpdateResult,
  IntegrationTestResult,
} from '../types/payment-methods.types';

@Injectable()
export class PaymentMethodsMapperService {
  private requiresIntegration(type?: string | null): boolean {
    const t = String(type || '').toLowerCase();
    // Онлайн-методы, для которых нужна интеграция с PSP
    return t === 'card' || t === 'digital_wallet' || t === 'cryptocurrency';
  }

  mapToResponseDto(pm: PaymentMethod): PaymentMethodResponseDto {
    return {
      id: pm.id,
      companyId: pm.companyId,
      name: pm.name,
      description: pm.description || undefined,
      type: pm.type || 'unknown',
      processingFeePercent: pm.processingFeePercent ?? 0,
      isActive: pm.isActive,
      limits: this.mapLimits(pm),
      installmentConfig: this.mapInstallmentConfig(pm),
      integrationStatus: this.mapIntegrationStatus(pm),
      createdAt: pm.createdAt,
      updatedAt: pm.updatedAt,
    };
  }

  private mapLimits(pm: PaymentMethod) {
    if (!pm.minAmount && !pm.maxAmount && !pm.dailyTransactionLimit) return undefined;
    return {
      minAmount: pm.minAmount ?? null,
      maxAmount: pm.maxAmount ?? null,
      dailyTransactionLimit: pm.dailyTransactionLimit ?? null,
    };
  }

  private mapInstallmentConfig(pm: PaymentMethod) {
    if (!pm.installmentMaxPeriodMonths) return undefined;
    return {
      maxPeriodMonths: pm.installmentMaxPeriodMonths,
      interestRate: pm.installmentInterestRate ?? 0,
      minDownPaymentPercent: pm.installmentMinDownPaymentPercent ?? null,
    };
  }

  /**
   * ВАЖНО:
   * - Для офлайн-методов (cash, bank_transfer, corporate, installments) интеграция не требуется.
   *   Возвращаем { isConfigured: true, testMode: false }, чтобы в UI не горела плашка "Требует настройки".
   * - Для онлайн-методов (card, digital_wallet, cryptocurrency):
   *   • если gatewayType не задан → isConfigured=false, testMode=false
   *   • если задан → isConfigured=true, testMode = !!gatewayTestMode
   */
  private mapIntegrationStatus(pm: PaymentMethod) {
    const needs = this.requiresIntegration(pm.type as any);
    if (!needs) {
      return { isConfigured: true, testMode: false } as const;
    }
    if (!pm.gatewayType) {
      return { isConfigured: false, testMode: false } as const;
    }
    return {
      isConfigured: true,
      gatewayType: pm.gatewayType,
      testMode: !!pm.gatewayTestMode,
    };
  }

  mapArrayToResponseDto(items: PaymentMethod[]): PaymentMethodResponseDto[] {
    return items.map((i) => this.mapToResponseDto(i));
  }

  mapToPaginatedResponse(
    items: PaymentMethod[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedPaymentMethodsResponseDto {
    const totalPages = Math.ceil(total / limit);
    return {
      data: this.mapArrayToResponseDto(items),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  mapToQuickListDto(items: PaymentMethod[]) {
    return items.map((pm) => ({
      id: pm.id,
      name: pm.name,
      type: pm.type || 'unknown',
      isActive: pm.isActive,
      processingFee: pm.processingFeePercent ?? 0,
    }));
  }

  mapToSelectOptions(items: PaymentMethod[]) {
    return items.map((pm) => {
      const feeText = pm.processingFeePercent ? ` (+${pm.processingFeePercent}%)` : '';
      return {
        value: pm.id,
        label: `${pm.name}${feeText}`,
        disabled: !pm.isActive,
        meta: {
          type: pm.type,
          processingFee: pm.processingFeePercent ?? 0,
          limits: this.mapLimits(pm),
          supportsInstallments: !!pm.installmentMaxPeriodMonths,
          supportsRefunds: pm.supportsRefunds ?? true,
        },
      };
    });
  }

  mapStatsToResponse(stats: PaymentMethodStats): any {
    return {
      summary: {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        activationRate: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
      },
      financial: {
        totalVolume: stats.totalVolume,
        totalTransactions: stats.totalTransactions,
        totalFees: stats.totalFees,
        averageTransactionAmount: stats.averageTransactionAmount,
      },
      distribution: {
        byType: stats.byType.map((t) => ({
          type: t.type,
          count: t.count,
          percentage: t.percentage,
        })),
      },
      performance: {
        mostUsedType: stats.byType.length > 0 ? stats.byType[0].type : null,
        feesPercentage:
          stats.totalVolume > 0 ? Math.round((stats.totalFees / stats.totalVolume) * 10000) / 100 : 0,
      },
    };
  }

  mapLimitsConfig(pm: PaymentMethod): any {
    return {
      paymentMethodId: pm.id,
      name: pm.name,
      limits: {
        minAmount: pm.minAmount ?? null,
        maxAmount: pm.maxAmount ?? null,
        dailyTransactionLimit: pm.dailyTransactionLimit ?? null,
      },
      effective: {
        canProcessSmallPayments: !pm.minAmount || pm.minAmount <= 100,
        canProcessLargePayments: !pm.maxAmount || pm.maxAmount >= 10000,
        hasTransactionLimits: !!pm.dailyTransactionLimit,
      },
    };
  }

  mapForExport(items: PaymentMethod[]) {
    return items.map((pm) => ({
      name: pm.name,
      type: pm.type || 'unknown',
      fee: pm.processingFeePercent ? `${pm.processingFeePercent}%` : '0%',
      status: pm.isActive ? 'Активен' : 'Неактивен',
      integration: pm.gatewayType || 'Не требуется',
      created: pm.createdAt.toLocaleDateString('ru-RU'),
    }));
  }

  mapToMobileDto(items: PaymentMethod[]) {
    return items
      .filter((pm) => pm.isActive)
      .map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.type || 'unknown',
        icon: this.getPaymentMethodIcon(pm.type || 'unknown'),
      }));
  }

  private getPaymentMethodIcon(type: string): string {
    const iconMap: Record<string, string> = {
      cash: '💵',
      card: '💳',
      bank_transfer: '🏦',
      installments: '📊',
      corporate: '🏢',
      digital_wallet: '📱',
      cryptocurrency: '₿',
    };
    return iconMap[type] || '💰';
  }

  mapBulkOperationResult(updated: number, total: number, errors: string[] = []): BulkUpdateResult {
    const failed = total - updated;
    const successRate = total > 0 ? Math.round((updated / total) * 100) : 0;
    return {
      updated,
      failed,
      total,
      successRate,
      errors,
      message:
        errors.length > 0
          ? `Обновлено ${updated} из ${total} способов оплаты. Есть ошибки.`
          : `Успешно обновлено ${updated} из ${total} способов оплаты.`,
    };
  }

  mapIntegrationTestResult(
    paymentMethodId: string,
    gatewayType: string,
    result: any,
  ): IntegrationTestResult {
    return {
      paymentMethodId,
      gatewayType,
      connectionSuccessful: !!result?.success,
      responseTime: Number(result?.responseTime) || 0,
      features: {
        payment: !!result?.features?.payment,
        refund: !!result?.features?.refund,
        installments: !!result?.features?.installments,
        webhooks: !!result?.features?.webhooks,
      },
      errors: Array.isArray(result?.errors) ? result.errors : [],
      lastTested: new Date(),
    };
  }
}
