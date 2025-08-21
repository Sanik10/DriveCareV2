// src/modules/payments/services/payments-mapper.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../database/entities';
import { PaymentResponseDto } from '../dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from '../dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from '../dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from '../dto/response/company-balance.dto';
import {
  CompanyBalance,
  PaymentCurrency,
  PaymentStatistics,
  PaymentStatus,
} from '../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';

@Injectable()
export class PaymentsMapperService {
  private readonly logger = new Logger(PaymentsMapperService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

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

      // FX
      exchangeRate: payment.exchangeRate ? parseFloat(payment.exchangeRate.toString()) : undefined,
      originalAmount: payment.originalAmount ? parseFloat(payment.originalAmount.toString()) : undefined,
      originalCurrency: payment.originalCurrency as PaymentCurrency,

      // Gateway
      gatewayFee: payment.gatewayFee ? parseFloat(payment.gatewayFee.toString()) : undefined,

      // Relations
      invoice: payment.invoice
        ? {
            invoiceNumber: payment.invoice.invoiceNumber,
            totalAmount: parseFloat(payment.invoice.totalAmount.toString()),
            status: payment.invoice.status,
          }
        : undefined,

      paymentMethod: payment.paymentMethod
        ? {
            name: payment.paymentMethod.name,
            type: payment.paymentMethod.type,
          }
        : undefined,

      statusColor: PAYMENTS_CONSTANTS.STATUS_COLORS[payment.status as PaymentStatus] || '#6b7280',
      statusDisplay: PAYMENTS_CONSTANTS.STATUS_DISPLAY[payment.status as PaymentStatus] || payment.status,

      // Safe metadata уже безопасные — возвращаем как есть
      safeMetadata: payment.safeMetadata || undefined,
    };
  }

  mapArrayToResponseDto(payments: Payment[]): PaymentResponseDto[] {
    return payments.map((payment) => this.mapToResponseDto(payment));
  }

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
    },
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
      totalAmount: additionalData?.totalAmount || 0,
      successfulPayments: additionalData?.successfulPayments || 0,
      failedPayments: additionalData?.failedPayments || 0,
      refundAmount: additionalData?.refundAmount || 0,
    };
  }

  async mapToStatisticsDto(statistics: PaymentStatistics, companyId: string): Promise<PaymentStatisticsDto> {
    try {
      const dailyTrends = await this.calculateDailyTrends(companyId);
      const hourlyDistribution = await this.calculateHourlyDistribution(companyId);

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
        dailyTrends,
        hourlyDistribution,
      };
    } catch (error) {
      this.logger.error(`Failed to map statistics for company ${companyId}:`, error);
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
        dailyTrends: [],
        hourlyDistribution: [],
      };
    }
  }

  async mapToBalanceDto(balance: CompanyBalance): Promise<CompanyBalanceDto> {
    try {
      const last30DaysBalance = await this.calculateLast30DaysBalance(balance.companyId);
      const monthlyGrowthPercentage = await this.calculateMonthlyGrowth(balance.companyId);

      const totalTransactions = Object.values(balance.balanceByCurrency).reduce(
        (sum: number, currency: any) => sum + (currency.received > 0 ? 1 : 0),
        0,
      );

      const averageTransactionAmount = totalTransactions > 0 ? balance.totalReceived / totalTransactions : 0;

      return {
        companyId: balance.companyId,
        totalReceived: Math.round(balance.totalReceived * 100) / 100,
        totalRefunded: Math.round(balance.totalRefunded * 100) / 100,
        netBalance: Math.round(balance.netBalance * 100) / 100,
        pendingAmount: Math.round(balance.pendingAmount * 100) / 100,
        disputedAmount: Math.round(balance.disputedAmount * 100) / 100,
        balanceByCurrency: this.roundCurrencyBalances(balance.balanceByCurrency),
        lastUpdated: balance.lastUpdated,

        totalTransactions,
        averageTransactionAmount: Math.round(averageTransactionAmount * 100) / 100,
        last30DaysBalance: Math.round(last30DaysBalance * 100) / 100,
        monthlyGrowthPercentage: Math.round(monthlyGrowthPercentage * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to map balance for company ${balance.companyId}:`, error);
      return {
        companyId: balance.companyId,
        totalReceived: Math.round(balance.totalReceived * 100) / 100,
        totalRefunded: Math.round(balance.totalRefunded * 100) / 100,
        netBalance: Math.round(balance.netBalance * 100) / 100,
        pendingAmount: Math.round(balance.pendingAmount * 100) / 100,
        disputedAmount: Math.round(balance.disputedAmount * 100) / 100,
        balanceByCurrency: this.roundCurrencyBalances(balance.balanceByCurrency),
        lastUpdated: balance.lastUpdated,
        totalTransactions: 0,
        averageTransactionAmount: 0,
        last30DaysBalance: 0,
        monthlyGrowthPercentage: 0,
      };
    }
  }

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

  mapToExtendedInfo(payment: Payment): {
    id: string;
    invoiceId: string;
    companyId: string;
    amount: number;
    currency: string;
    status: string;
    paymentDate: Date;
    transactionId?: string;
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
      createdAt: payment.createdAt,
    };
  }

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
      disabled: ![PaymentStatus.PROCESSED, PaymentStatus.PARTIALLY_REFUNDED].includes(
        payment.status as PaymentStatus,
      ),
    };
  }

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

  mapToDashboardMetrics(payments: Payment[]): {
    totalCount: number;
    totalAmount: number;
    avgAmount: number;
    todayCount: number;
    todayAmount: number;
    successRate: number;
    topCurrency: string;
    recentPayments: Array<{ id: string; amount: number; status: string; paymentDate: Date }>;
  } {
    const totalCount = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPayments = payments.filter((p) => new Date(p.paymentDate) >= today);
    const todayCount = todayPayments.length;
    const todayAmount = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const successfulCount = payments.filter((p) => p.status === PaymentStatus.PROCESSED).length;
    const successRate = totalCount > 0 ? (successfulCount / totalCount) * 100 : 0;

    const currencyCount = payments.reduce((acc, p) => {
      const currency = p.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY;
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCurrency = Object.keys(currencyCount).sort((a, b) => currencyCount[b] - currencyCount[a])[0] || 'RUB';

    const recentPayments = payments
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5)
      .map((p) => ({
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

  // ========== PRIVATE HELPERS ==========

  private roundCurrencyBalances(balances: Record<string, any>): Record<string, any> {
    const rounded: Record<string, any> = {};
    Object.keys(balances).forEach((currency) => {
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

  private async calculateDailyTrends(
    companyId: string,
  ): Promise<Array<{ date: string; amount: number; count: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);

      const trends = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select([
          'DATE(payment.paymentDate) as date',
          'COUNT(*) as count',
          'COALESCE(SUM(CASE WHEN payment.status = :processedStatus THEN CAST(payment.amount AS DECIMAL) ELSE 0 END), 0) as amount',
        ])
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .setParameter('processedStatus', PaymentStatus.PROCESSED)
        .groupBy('DATE(payment.paymentDate)')
        .orderBy('DATE(payment.paymentDate)', 'ASC')
        .getRawMany();

      const result: Array<{ date: string; amount: number; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = trends.find((t) => t.date === dateStr);
        result.push({
          date: dateStr,
          amount: dayData ? parseFloat(dayData.amount) || 0 : 0,
          count: dayData ? parseInt(dayData.count, 10) || 0 : 0,
        });
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to calculate daily trends for company ${companyId}:`, error);
      return [];
    }
  }

  private async calculateHourlyDistribution(
    companyId: string,
  ): Promise<Array<{ hour: number; count: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const hourlyData = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select(['EXTRACT(HOUR FROM payment.paymentDate) as hour', 'COUNT(*) as count'])
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .groupBy('EXTRACT(HOUR FROM payment.paymentDate)')
        .orderBy('EXTRACT(HOUR FROM payment.paymentDate)', 'ASC')
        .getRawMany();

      const result: Array<{ hour: number; count: number }> = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourData = hourlyData.find((h) => parseInt(h.hour, 10) === hour);
        result.push({ hour, count: hourData ? parseInt(hourData.count, 10) || 0 : 0 });
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to calculate hourly distribution for company ${companyId}:`, error);
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }
  }

  private async calculateLast30DaysBalance(companyId: string): Promise<number> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(CAST(payment.amount AS DECIMAL)), 0)', 'totalAmount')
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
        .getRawOne();

      return parseFloat(result?.totalAmount) || 0;
    } catch (error) {
      this.logger.error(`Failed to calculate last 30 days balance for company ${companyId}:`, error);
      return 0;
    }
  }

  private async calculateMonthlyGrowth(companyId: string): Promise<number> {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const previousMonthEnd = new Date(currentMonth);
      previousMonthEnd.setMilliseconds(-1);

      const currentMonthResult = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(CAST(payment.amount AS DECIMAL)), 0)', 'amount')
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.paymentDate >= :startDate', { startDate: currentMonth })
        .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
        .getRawOne();

      const previousMonthResult = await this.paymentsRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(CAST(payment.amount AS DECIMAL)), 0)', 'amount')
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.paymentDate >= :startDate', { startDate: previousMonth })
        .andWhere('payment.paymentDate <= :endDate', { endDate: previousMonthEnd })
        .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
        .getRawOne();

      const currentAmount = parseFloat(currentMonthResult?.amount) || 0;
      const previousAmount = parseFloat(previousMonthResult?.amount) || 0;

      if (previousAmount === 0) return currentAmount > 0 ? 100 : 0;

      const growth = ((currentAmount - previousAmount) / previousAmount) * 100;
      return Math.min(Math.max(growth, -100), 1000);
    } catch (error) {
      this.logger.error(`Failed to calculate monthly growth for company ${companyId}:`, error);
      return 0;
    }
  }
}
