// src/modules/payment-methods/services/payment-methods-mapper.service.ts (ПОЛНАЯ версия)
import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../../database/entities';
import { PaymentMethodResponseDto } from '../dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from '../dto/response/paginated-payment-methods-response.dto';
import { PaymentMethodStats, PaymentMethodUsageStats, BulkUpdateResult, IntegrationTestResult } from '../types/payment-methods.types';

@Injectable()
export class PaymentMethodsMapperService {
  /**
   * 🔥 Маппинг PaymentMethod entity -> PaymentMethodResponseDto
   */
  mapToResponseDto(paymentMethod: PaymentMethod): PaymentMethodResponseDto {
    return {
      id: paymentMethod.id,
      companyId: paymentMethod.companyId, // 🔒 Всегда включаем для audit
      name: paymentMethod.name,
      description: paymentMethod.description,
      type: paymentMethod.type || 'unknown',
      processingFeePercent: paymentMethod.processingFeePercent,
      isActive: paymentMethod.isActive,
      limits: this.mapLimits(paymentMethod),
      installmentConfig: this.mapInstallmentConfig(paymentMethod),
      integrationStatus: this.mapIntegrationStatus(paymentMethod),
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };
  }

  /**
   * 🔥 Маппинг лимитов
   */
  private mapLimits(paymentMethod: PaymentMethod): any {
    if (!paymentMethod.minAmount && !paymentMethod.maxAmount && !paymentMethod.dailyTransactionLimit) {
      return undefined;
    }

    return {
      minAmount: paymentMethod.minAmount,
      maxAmount: paymentMethod.maxAmount,
      dailyTransactionLimit: paymentMethod.dailyTransactionLimit,
    };
  }

  /**
   * 🔥 Маппинг конфигурации рассрочки
   */
  private mapInstallmentConfig(paymentMethod: PaymentMethod): any {
    if (!paymentMethod.installmentMaxPeriodMonths) {
      return undefined;
    }

    return {
      maxPeriodMonths: paymentMethod.installmentMaxPeriodMonths,
      interestRate: paymentMethod.installmentInterestRate,
      minDownPaymentPercent: paymentMethod.installmentMinDownPaymentPercent,
    };
  }

  /**
   * 🔥 Маппинг статуса интеграции
   */
  private mapIntegrationStatus(paymentMethod: PaymentMethod): any {
    if (!paymentMethod.gatewayType) {
      return {
        isConfigured: false,
        testMode: true,
      };
    }

    return {
      isConfigured: true,
      gatewayType: paymentMethod.gatewayType,
      testMode: paymentMethod.gatewayTestMode ?? true,
    };
  }

  /**
   * 🔥 Маппинг массива payment methods -> array DTO
   */
  mapArrayToResponseDto(paymentMethods: PaymentMethod[]): PaymentMethodResponseDto[] {
    return paymentMethods.map(paymentMethod => this.mapToResponseDto(paymentMethod));
  }

  /**
   * 🔥 Маппинг для пагинированного ответа
   */
  mapToPaginatedResponse(
    paymentMethods: PaymentMethod[],
    total: number,
    page: number,
    limit: number
  ): PaginatedPaymentMethodsResponseDto {
    return {
      data: this.mapArrayToResponseDto(paymentMethods),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * 🔥 Маппинг для быстрого списка (без лишних полей)
   */
  mapToQuickListDto(paymentMethods: PaymentMethod[]): Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    processingFee?: number;
  }> {
    return paymentMethods.map(paymentMethod => ({
      id: paymentMethod.id,
      name: paymentMethod.name,
      type: paymentMethod.type || 'unknown',
      isActive: paymentMethod.isActive,
      processingFee: paymentMethod.processingFeePercent,
    }));
  }

  /**
   * 🔥 Маппинг для dropdown/select компонентов
   */
  mapToSelectOptions(paymentMethods: PaymentMethod[]): Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }> {
    return paymentMethods.map(paymentMethod => {
      const feeText = paymentMethod.processingFeePercent ? ` (+${paymentMethod.processingFeePercent}%)` : '';
      
      return {
        value: paymentMethod.id,
        label: `${paymentMethod.name}${feeText}`,
        disabled: !paymentMethod.isActive,
        meta: {
          type: paymentMethod.type,
          processingFee: paymentMethod.processingFeePercent,
          limits: this.mapLimits(paymentMethod),
          supportsInstallments: !!paymentMethod.installmentMaxPeriodMonths,
          supportsRefunds: paymentMethod.supportsRefunds ?? true,
        },
      };
    });
  }

  /**
   * 📊 Маппинг статистики способов оплаты
   */
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
        byType: stats.byType.map(type => ({
          type: type.type,
          count: type.count,
          percentage: type.percentage,
        })),
      },
      performance: {
        mostUsedType: stats.byType.length > 0 ? stats.byType[0].type : null,
        feesPercentage: stats.totalVolume > 0 ? 
          Math.round((stats.totalFees / stats.totalVolume) * 10000) / 100 : 0,
      },
    };
  }

  /**
   * 🔥 Маппинг результата bulk операций
   */
  mapBulkOperationResult(
    updated: number,
    total: number,
    errors: string[] = []
  ): BulkUpdateResult {
    const failed = total - updated;
    const successRate = total > 0 ? Math.round((updated / total) * 100) : 0;

    return {
      updated,
      failed,
      total,
      successRate,
      errors,
      message: errors.length > 0 
        ? `Обновлено ${updated} из ${total} способов оплаты. Есть ошибки.`
        : `Успешно обновлено ${updated} из ${total} способов оплаты.`,
    };
  }

  /**
   * 🔥 Маппинг результатов тестирования интеграции
   */
  mapIntegrationTestResult(
    paymentMethodId: string,
    gatewayType: string,
    result: any
  ): IntegrationTestResult {
    return {
      paymentMethodId,
      gatewayType,
      connectionSuccessful: result.success || false,
      responseTime: result.responseTime || 0,
      features: {
        payment: result.features?.payment ?? false,
        refund: result.features?.refund ?? false,
        installments: result.features?.installments ?? false,
        webhooks: result.features?.webhooks ?? false,
      },
      errors: result.errors || [],
      lastTested: new Date(),
    };
  }

  /**
   * 🔥 Маппинг конфигурации лимитов
   */
  mapLimitsConfig(paymentMethod: PaymentMethod): any {
    return {
      paymentMethodId: paymentMethod.id,
      name: paymentMethod.name,
      limits: {
        minAmount: paymentMethod.minAmount || null,
        maxAmount: paymentMethod.maxAmount || null,
        dailyTransactionLimit: paymentMethod.dailyTransactionLimit || null,
      },
      effective: {
        canProcessSmallPayments: !paymentMethod.minAmount || paymentMethod.minAmount <= 100,
        canProcessLargePayments: !paymentMethod.maxAmount || paymentMethod.maxAmount >= 10000,
        hasTransactionLimits: !!paymentMethod.dailyTransactionLimit,
      },
    };
  }

  /**
   * 🔥 Маппинг для экспорта данных
   */
  mapForExport(paymentMethods: PaymentMethod[]): Array<{
    name: string;
    type: string;
    fee: string;
    status: string;
    integration: string;
    created: string;
  }> {
    return paymentMethods.map(paymentMethod => ({
      name: paymentMethod.name,
      type: paymentMethod.type || 'unknown',
      fee: paymentMethod.processingFeePercent ? `${paymentMethod.processingFeePercent}%` : '0%',
      status: paymentMethod.isActive ? 'Активен' : 'Неактивен',
      integration: paymentMethod.gatewayType || 'Не настроена',
      created: paymentMethod.createdAt.toLocaleDateString('ru-RU'),
    }));
  }

  /**
   * 📱 Маппинг для мобильного API (упрощенный)
   */
  mapToMobileDto(paymentMethods: PaymentMethod[]): Array<{
    id: string;
    name: string;
    type: string;
    icon?: string;
  }> {
    return paymentMethods
      .filter(paymentMethod => paymentMethod.isActive)
      .map(paymentMethod => ({
        id: paymentMethod.id,
        name: paymentMethod.name,
        type: paymentMethod.type || 'unknown',
        icon: this.getPaymentMethodIcon(paymentMethod.type || 'unknown'),
      }));
  }

  /**
   * 🎨 Получение иконки для типа способа оплаты
   */
  private getPaymentMethodIcon(type: string): string {
    const iconMap = {
      'cash': '💵',
      'card': '💳',
      'bank_transfer': '🏦',
      'installments': '📊',
      'corporate': '🏢',
      'digital_wallet': '📱',
      'cryptocurrency': '₿',
    };

    return iconMap[type] || '💰';
  }

  /**
   * 📊 Маппинг аналитики использования (для future implementation)
   */
  mapUsageAnalytics(paymentMethod: PaymentMethod, usageData?: any): any {
    // TODO: Implement when payments/transactions data is available
    return {
      paymentMethodId: paymentMethod.id,
      name: paymentMethod.name,
      usage: {
        totalTransactions: usageData?.totalTransactions || 0,
        totalVolume: usageData?.totalVolume || 0,
        averageAmount: usageData?.averageAmount || 0,
        lastUsed: usageData?.lastUsed,
      },
      trends: {
        weeklyGrowth: usageData?.weeklyGrowth || 0,
        monthlyGrowth: usageData?.monthlyGrowth || 0,
        popularDays: usageData?.popularDays || [],
        popularHours: usageData?.popularHours || [],
      },
    };
  }
}