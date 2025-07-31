// src/modules/payments/services/payments-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Payment } from '../../../database/entities';
import { PaymentResponseDto } from '../dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from '../dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from '../dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from '../dto/response/company-balance.dto';
import { 
  PaymentStatistics, 
  CompanyBalance, 
  PaymentStatus,
  PaymentCurrency 
} from '../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';

@Injectable()
export class PaymentsMapperService {
  
  /**
   * 🎯 Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      companyId: payment.companyId,
      invoiceId: payment.invoiceId,
      paymentMethodId: payment.paymentMethodId,
      amount: parseFloat(payment.amount.toString()),
      currency: (payment.currency as PaymentCurrency) || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      paymentDate: payment.paymentDate,
      transactionId: payment.transactionId,
      status: payment.status as PaymentStatus,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,

      // 🌍 МЕЖДУНАРОДНЫЕ ПОЛЯ (если есть в entity)
      exchangeRate: payment.exchangeRate ? parseFloat(payment.exchangeRate.toString()) : undefined,
      originalAmount: payment.originalAmount ? parseFloat(payment.originalAmount.toString()) : undefined,
      originalCurrency: payment.originalCurrency as PaymentCurrency,

      // 🏦 GATEWAY ИНТЕГРАЦИЯ (если есть в entity)
      gatewayTransactionId: payment.gatewayTransactionId,
      gatewayFee: payment.gatewayFee ? parseFloat(payment.gatewayFee.toString()) : undefined,

      // 📄 МЕТАДАННЫЕ (если есть в entity)
      metadata: payment.metadata,

      // 🔗 СВЯЗАННЫЕ ДАННЫЕ
      invoice: payment.invoice ? {
        invoiceNumber: payment.invoice.invoiceNumber,
        totalAmount: parseFloat(payment.invoice.totalAmount.toString()),
        status: payment.invoice.status,
      } : undefined,

      paymentMethod: payment.paymentMethod ? {
        name: payment.paymentMethod.name,
        type: payment.paymentMethod.type,
      } : undefined,

      // 📊 UI ДАННЫЕ
      statusColor: PAYMENTS_CONSTANTS.STATUS_COLORS[payment.status as PaymentStatus] || '#6b7280',
      statusDisplay: PAYMENTS_CONSTANTS.STATUS_DISPLAY[payment.status as PaymentStatus] || payment.status,
    };
  }

  /**
   * 📋 Маппинг для списков (массив Entity → массив ResponseDto)
   */
  mapArrayToResponseDto(payments: Payment[]): PaymentResponseDto[] {
    return payments.map(payment => this.mapToResponseDto(payment));
  }

  /**
   * 📊 Маппинг для пагинированного ответа
   */
  mapToPaginatedResponse(
    payments: Payment[],
    total: number,
    page: number,
    limit: number,
    additionalData?: {
      totalAmount?: number;
      successfulPayments?: number;
      failedPayments?: number;
      refundAmount?: number;
    }
  ): PaginatedPaymentsResponseDto {
    const totalPages = Math.ceil(total / limit);
    
    return {
      items: this.mapArrayToResponseDto(payments),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      
      // 📊 ДОПОЛНИТЕЛЬНАЯ СТАТИСТИКА
      totalAmount: additionalData?.totalAmount || 0,
      successfulPayments: additionalData?.successfulPayments || 0,
      failedPayments: additionalData?.failedPayments || 0,
      refundAmount: additionalData?.refundAmount || 0,
    };
  }

  /**
   * 📊 Маппинг статистики платежей
   */
  mapToStatisticsDto(statistics: PaymentStatistics): PaymentStatisticsDto {
    // Генерация трендовых данных (последние 30 дней)
    const dailyTrends = this.generateDailyTrends();
    
    // Генерация почасового распределения
    const hourlyDistribution = this.generateHourlyDistribution();

    return {
      total: statistics.total,
      byStatus: statistics.byStatus,
      byCurrency: statistics.byCurrency,
      byPaymentMethod: statistics.byPaymentMethod,
      totalAmount: statistics.totalAmount,
      totalAmountByCurrency: statistics.totalAmountByCurrency,
      thisMonth: statistics.thisMonth,
      thisMonthAmount: statistics.thisMonthAmount,
      avgPaymentAmount: Math.round(statistics.avgPaymentAmount * 100) / 100,
      avgPaymentTime: statistics.avgPaymentTime,
      successRate: Math.round(statistics.successRate * 100) / 100,
      refundRate: Math.round(statistics.refundRate * 100) / 100,
      
      // 📈 ТРЕНДОВЫЕ ДАННЫЕ
      dailyTrends,
      hourlyDistribution,
    };
  }

  /**
   * 💰 Маппинг баланса компании
   */
  mapToBalanceDto(balance: CompanyBalance): CompanyBalanceDto {
    // Расчет дополнительной аналитики
    const totalTransactions = Object.values(balance.balanceByCurrency).reduce(
      (sum, currency) => sum + (currency.received > 0 ? 1 : 0), 0
    );

    const averageTransactionAmount = totalTransactions > 0 ? 
      balance.totalReceived / totalTransactions : 0;

    // Заглушки для дополнительных метрик (в реальном проекте брать из БД)
    const last30DaysBalance = balance.netBalance * 0.15; // 15% от общего баланса
    const monthlyGrowthPercentage = 12.5; // Заглушка

    return {
      companyId: balance.companyId,
      totalReceived: Math.round(balance.totalReceived * 100) / 100,
      totalRefunded: Math.round(balance.totalRefunded * 100) / 100,
      netBalance: Math.round(balance.netBalance * 100) / 100,
      pendingAmount: Math.round(balance.pendingAmount * 100) / 100,
      disputedAmount: Math.round(balance.disputedAmount * 100) / 100,
      balanceByCurrency: this.roundCurrencyBalances(balance.balanceByCurrency),
      lastUpdated: balance.lastUpdated,

      // 📊 ДОПОЛНИТЕЛЬНАЯ АНАЛИТИКА
      totalTransactions,
      averageTransactionAmount: Math.round(averageTransactionAmount * 100) / 100,
      last30DaysBalance: Math.round(last30DaysBalance * 100) / 100,
      monthlyGrowthPercentage: Math.round(monthlyGrowthPercentage * 100) / 100,
    };
  }

  /**
   * 🔗 Базовая информация о платеже (для других модулей)
   */
  mapToBasicInfo(payment: Payment): { 
    id: string; 
    invoiceId: string; 
    companyId: string; 
    status: string;
    amount: number;
    currency: string;
  } {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      companyId: payment.companyId,
      status: payment.status,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
    };
  }

  /**
   * 🎨 Расширенная информация о платеже (для интеграций)
   */
  mapToExtendedInfo(payment: Payment): {
    id: string;
    invoiceId: string;
    companyId: string;
    amount: number;
    currency: string;
    status: string;
    paymentDate: Date;
    transactionId?: string;
    gatewayTransactionId?: string;
    metadata?: any;
    createdAt: Date;
  } {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      companyId: payment.companyId,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      status: payment.status,
      paymentDate: payment.paymentDate,
      transactionId: payment.transactionId,
      gatewayTransactionId: payment.gatewayTransactionId,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
    };
  }

  /**
   * 📋 Маппинг для выпадающих списков (ID + описание)
   */
  mapToSelectOption(payment: Payment): { 
    value: string; 
    label: string; 
    amount: number;
    status: string;
    disabled?: boolean;
  } {
    const statusDisplay = PAYMENTS_CONSTANTS.STATUS_DISPLAY[payment.status as PaymentStatus] || payment.status;
    const currency = payment.currency || 'RUB';
    const amount = parseFloat(payment.amount.toString());
    
    return {
      value: payment.id,
      label: `${payment.transactionId || payment.id.slice(0, 8)} - ${amount} ${currency} (${statusDisplay})`,
      amount,
      status: payment.status,
      disabled: ![PaymentStatus.PROCESSED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status as PaymentStatus),
    };
  }

  /**
   * 🔍 Маппинг для поиска (компактная форма)
   */
  mapToSearchResult(payment: Payment): {
    id: string;
    transactionId?: string;
    amount: number;
    currency: string;
    status: string;
    paymentDate: Date;
    invoiceNumber?: string;
  } {
    return {
      id: payment.id,
      transactionId: payment.transactionId,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      status: payment.status,
      paymentDate: payment.paymentDate,
      invoiceNumber: payment.invoice?.invoiceNumber,
    };
  }

  /**
   * 💳 Маппинг для отчетов (финансовая информация)
   */
  mapToFinancialReport(payment: Payment): {
    id: string;
    transactionId?: string;
    amount: number;
    currency: string;
    status: string;
    paymentDate: Date;
    gatewayFee?: number;
    netAmount: number;
    exchangeRate?: number;
    originalAmount?: number;
    originalCurrency?: string;
  } {
    const amount = parseFloat(payment.amount.toString());
    const gatewayFee = payment.gatewayFee ? parseFloat(payment.gatewayFee.toString()) : 0;
    
    return {
      id: payment.id,
      transactionId: payment.transactionId,
      amount,
      currency: payment.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      status: payment.status,
      paymentDate: payment.paymentDate,
      gatewayFee,
      netAmount: amount - gatewayFee,
      exchangeRate: payment.exchangeRate ? parseFloat(payment.exchangeRate.toString()) : undefined,
      originalAmount: payment.originalAmount ? parseFloat(payment.originalAmount.toString()) : undefined,
      originalCurrency: payment.originalCurrency,
    };
  }

  /**
   * 📊 Маппинг для дашборда (ключевые метрики)
   */
  mapToDashboardMetrics(payments: Payment[]): {
    totalCount: number;
    totalAmount: number;
    avgAmount: number;
    todayCount: number;
    todayAmount: number;
    successRate: number;
    topCurrency: string;
    recentPayments: Array<{
      id: string;
      amount: number;
      status: string;
      paymentDate: Date;
    }>;
  } {
    const totalCount = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPayments = payments.filter(p => new Date(p.paymentDate) >= today);
    const todayCount = todayPayments.length;
    const todayAmount = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const successfulCount = payments.filter(p => p.status === PaymentStatus.PROCESSED).length;
    const successRate = totalCount > 0 ? (successfulCount / totalCount) * 100 : 0;

    // Определение самой популярной валюты
    const currencyCount = payments.reduce((acc, p) => {
      const currency = p.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY;
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCurrency = Object.keys(currencyCount).sort((a, b) => currencyCount[b] - currencyCount[a])[0] || 'RUB';

    // Последние 5 платежей
    const recentPayments = payments
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        amount: parseFloat(p.amount.toString()),
        status: p.status,
        paymentDate: p.paymentDate,
      }));

    return {
      totalCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
      avgAmount: Math.round(avgAmount * 100) / 100,
      todayCount,
      todayAmount: Math.round(todayAmount * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      topCurrency,
      recentPayments,
    };
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * 💰 Округление балансов по валютам
   */
  private roundCurrencyBalances(balances: Record<string, any>): Record<string, any> {
    const rounded = {};
    
    Object.keys(balances).forEach(currency => {
      const balance = balances[currency];
      rounded[currency] = {
        received: Math.round(balance.received * 100) / 100,
        refunded: Math.round(balance.refunded * 100) / 100,
        net: Math.round(balance.net * 100) / 100,
        pending: Math.round(balance.pending * 100) / 100,
      };
    });

    return rounded;
  }

  /**
   * 📈 Генерация данных по дням (заглушка)
   */
  private generateDailyTrends(): Array<{ date: string; amount: number; count: number }> {
    const trends = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 100000) + 50000, // Заглушка
        count: Math.floor(Math.random() * 20) + 5, // Заглушка
      });
    }
    
    return trends;
  }

  /**
   * ⏰ Генерация почасового распределения (заглушка)
   */
  private generateHourlyDistribution(): Array<{ hour: number; count: number }> {
    const distribution = [];
    
    for (let hour = 0; hour < 24; hour++) {
      // Имитируем реальное распределение (больше днем, меньше ночью)
      let count = 0;
      if (hour >= 9 && hour <= 18) {
        count = Math.floor(Math.random() * 50) + 20; // Рабочие часы
      } else if (hour >= 19 && hour <= 22) {
        count = Math.floor(Math.random() * 30) + 10; // Вечер
      } else {
        count = Math.floor(Math.random() * 10) + 1; // Ночь/раннее утро
      }
      
      distribution.push({ hour, count });
    }
    
    return distribution;
  }
}
