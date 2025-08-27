// path: apps/backend/src/modules/payments/services/payments-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Payment } from '../../../database/entities';
import {
  CompanyBalance,
  CreatePaymentData,
  PaymentCurrency,
  PaymentFilter,
  PaymentStatistics,
  PaymentStatus,
  UpdatePaymentData,
} from '../types/payments.types';
import { IPaymentsDataService } from '../interfaces/payments.interface';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';

@Injectable()
export class PaymentsDataService implements IPaymentsDataService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  // ========== BASIC CRUD ==========

  async create(data: CreatePaymentData): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      companyId: data.companyId,
      invoiceId: data.invoiceId,
      paymentMethodId: data.paymentMethodId,
      amount: data.amount,
      currency: data.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      paymentDate: data.paymentDate || new Date(),
      transactionId: data.transactionId || null,
      status: data.status || PAYMENTS_CONSTANTS.DEFAULTS.STATUS,
      notes: data.notes || null,

      // FX
      exchangeRate: data.exchangeRate ?? null,
      originalAmount: data.originalAmount ?? null,
      originalCurrency: data.originalCurrency ?? null,

      // Gateway
      gatewayTransactionId: data.gatewayTransactionId ?? null,
      gatewayFee: data.gatewayFee ?? null,

      // Compliance
      vatRate: data.vatRate ?? null,
      vatAmount: data.vatAmount ?? null,

      pdpConsentVersion: data.pdpConsentVersion ?? null,
      pdpConsentDate: data.pdpConsentDate ?? null,
      dataRetentionUntil: data.dataRetentionUntil ?? null,

      // Безопасные метаданные
      safeMetadata: data.safeMetadata ?? null,
    });

    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['invoice', 'paymentMethod'],
      order: { paymentDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { id },
      relations: ['invoice', 'paymentMethod', 'company'],
    });
  }

  async findByIdForCompany(id: string, companyId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { id, companyId },
      relations: ['invoice', 'paymentMethod'],
    });
  }

  async findByGatewayTransactionId(gatewayTransactionId: string, companyId?: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: companyId ? { gatewayTransactionId, companyId } as any : { gatewayTransactionId },
      relations: ['invoice', 'paymentMethod', 'company'],
    });
  }

  async findWithFilters(filter: PaymentFilter): Promise<[Payment[], number]> {
    const {
      companyId,
      invoiceId,
      paymentMethodId,
      status,
      amountFrom,
      amountTo,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = PAYMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'paymentDate',
      sortOrder = 'desc',
    } = filter;

    const query = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('payment.company', 'company');

    if (!companyId) throw new Error('Company ID is required for payment queries');
    query.andWhere('payment.companyId = :companyId', { companyId });

    if (invoiceId) query.andWhere('payment.invoiceId = :invoiceId', { invoiceId });
    if (paymentMethodId) query.andWhere('payment.paymentMethodId = :paymentMethodId', { paymentMethodId });
    if (status) query.andWhere('payment.status = :status', { status });

    if (amountFrom !== undefined) query.andWhere('payment.amount >= :amountFrom', { amountFrom });
    if (amountTo !== undefined) query.andWhere('payment.amount <= :amountTo', { amountTo });

    if (dateFrom) query.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    if (dateTo) query.andWhere('payment.paymentDate <= :dateTo', { dateTo });

    if (search) {
      query.andWhere(
        '(payment.transactionId ILIKE :search OR payment.notes ILIKE :search OR payment.gatewayTransactionId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  async update(id: string, data: UpdatePaymentData): Promise<Payment> {
    const updateData: Partial<Payment> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.gatewayTransactionId !== undefined) updateData.gatewayTransactionId = data.gatewayTransactionId;
    if (data.gatewayFee !== undefined) updateData.gatewayFee = data.gatewayFee;

    if (data.safeMetadata !== undefined) updateData.safeMetadata = data.safeMetadata;

    // Fiscal
    if (data.fiscalReceiptNumber !== undefined) updateData.fiscalReceiptNumber = data.fiscalReceiptNumber;
    if (data.fiscalReceiptDate !== undefined) updateData.fiscalReceiptDate = data.fiscalReceiptDate;
    if (data.kktSerialNumber !== undefined) updateData.kktSerialNumber = data.kktSerialNumber;
    if (data.fiscalDocumentNumber !== undefined) updateData.fiscalDocumentNumber = data.fiscalDocumentNumber;
    if (data.fiscalDocumentAttribute !== undefined) updateData.fiscalDocumentAttribute = data.fiscalDocumentAttribute;

    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (data.vatAmount !== undefined) updateData.vatAmount = data.vatAmount;

    if (data.fiscalRefundReceiptNumber !== undefined) updateData.fiscalRefundReceiptNumber = data.fiscalRefundReceiptNumber;
    if (data.fiscalRefundDate !== undefined) updateData.fiscalRefundDate = data.fiscalRefundDate;

    await this.paymentsRepository.update(id, updateData);

    const updatedPayment = await this.findById(id);
    if (!updatedPayment) {
      throw new Error(`Payment with id ${id} not found after update`);
    }

    return updatedPayment;
  }

  async delete(id: string): Promise<void> {
    await this.paymentsRepository.delete(id);
  }

  // ========== TRANSACTIONAL HELPERS ==========

  async createWithTransaction(data: CreatePaymentData, manager: EntityManager): Promise<Payment> {
    const repo = manager.getRepository(Payment);
    const payment = repo.create({
      companyId: data.companyId,
      invoiceId: data.invoiceId,
      paymentMethodId: data.paymentMethodId,
      amount: data.amount,
      currency: data.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
      paymentDate: data.paymentDate || new Date(),
      transactionId: data.transactionId || null,
      status: data.status || PAYMENTS_CONSTANTS.DEFAULTS.STATUS,
      notes: data.notes || null,

      exchangeRate: data.exchangeRate ?? null,
      originalAmount: data.originalAmount ?? null,
      originalCurrency: data.originalCurrency ?? null,

      gatewayTransactionId: data.gatewayTransactionId ?? null,
      gatewayFee: data.gatewayFee ?? null,

      vatRate: data.vatRate ?? null,
      vatAmount: data.vatAmount ?? null,

      pdpConsentVersion: data.pdpConsentVersion ?? null,
      pdpConsentDate: data.pdpConsentDate ?? null,
      dataRetentionUntil: data.dataRetentionUntil ?? null,

      safeMetadata: data.safeMetadata ?? null,
    });

    return repo.save(payment);
  }

  async findByIdWithTransaction(id: string, manager: EntityManager): Promise<Payment | null> {
    return manager.getRepository(Payment).findOne({
      where: { id },
      relations: ['invoice', 'paymentMethod', 'company'],
    });
  }

  async updateWithTransaction(id: string, data: UpdatePaymentData, manager: EntityManager): Promise<Payment> {
    const repo = manager.getRepository(Payment);
    const updateData: Partial<Payment> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.gatewayTransactionId !== undefined) updateData.gatewayTransactionId = data.gatewayTransactionId;
    if (data.gatewayFee !== undefined) updateData.gatewayFee = data.gatewayFee;

    if (data.safeMetadata !== undefined) updateData.safeMetadata = data.safeMetadata;

    if (data.fiscalReceiptNumber !== undefined) updateData.fiscalReceiptNumber = data.fiscalReceiptNumber;
    if (data.fiscalReceiptDate !== undefined) updateData.fiscalReceiptDate = data.fiscalReceiptDate;
    if (data.kktSerialNumber !== undefined) updateData.kktSerialNumber = data.kktSerialNumber;
    if (data.fiscalDocumentNumber !== undefined) updateData.fiscalDocumentNumber = data.fiscalDocumentNumber;
    if (data.fiscalDocumentAttribute !== undefined) updateData.fiscalDocumentAttribute = data.fiscalDocumentAttribute;

    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
    if (data.vatAmount !== undefined) updateData.vatAmount = data.vatAmount;

    if (data.fiscalRefundReceiptNumber !== undefined) updateData.fiscalRefundReceiptNumber = data.fiscalRefundReceiptNumber;
    if (data.fiscalRefundDate !== undefined) updateData.fiscalRefundDate = data.fiscalRefundDate;

    await repo.update(id, updateData);

    const updatedPayment = await repo.findOne({
      where: { id },
      relations: ['invoice', 'paymentMethod', 'company'],
    });

    if (!updatedPayment) throw new Error(`Payment with id ${id} not found after update`);
    return updatedPayment;
  }

  // ========== ANALYTICS ==========

  async getPaymentsStatistics(companyId: string): Promise<PaymentStatistics> {
    const total = await this.paymentsRepository.count({ where: { companyId } });

    const statusStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('payment.companyId = :companyId', { companyId })
      .groupBy('payment.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status as PaymentStatus] = parseInt(stat.count, 10);
      return acc;
    }, {} as Record<PaymentStatus, number>);

    const currencyStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .where('payment.companyId = :companyId', { companyId })
      .groupBy('payment.currency')
      .getRawMany();

    const byCurrency = currencyStats.reduce((acc, stat) => {
      acc[stat.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY] = parseInt(stat.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const paymentMethodStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.paymentMethod', 'pm')
      .select('pm.name', 'methodName')
      .addSelect('COUNT(*)', 'count')
      .where('payment.companyId = :companyId', { companyId })
      .groupBy('pm.name')
      .getRawMany();

    const byPaymentMethod = paymentMethodStats.reduce((acc, stat) => {
      acc[stat.methodName || 'Unknown'] = parseInt(stat.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const amountStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalAmount')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
      .groupBy('payment.currency')
      .getRawMany();

    const totalAmountByCurrency: Record<string, number> = amountStats.reduce((acc, stat) => {
      const amount = parseFloat(stat.totalAmount) || 0;
      acc[stat.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY] = amount;
      return acc;
    }, {} as Record<string, number>);

    const amounts = Object.values(totalAmountByCurrency);
    const totalAmount: number = amounts.reduce((sum, amount) => sum + (typeof amount === 'number' ? amount : 0), 0);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonth = await this.paymentsRepository.count({
      where: { companyId, paymentDate: MoreThanOrEqual(currentMonth) },
    });

    const thisMonthAmountResult = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('SUM(CAST(payment.amount AS DECIMAL))', 'amount')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.paymentDate >= :fromDate', { fromDate: currentMonth })
      .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
      .getRawOne();

    const thisMonthAmount = parseFloat(thisMonthAmountResult?.amount) || 0;
    const avgPaymentAmount: number = total > 0 ? totalAmount / total : 0;

    const successfulCount = byStatus[PaymentStatus.PROCESSED] || 0;
    const successRate = total > 0 ? (successfulCount / total) * 100 : 0;

    const refundedCount =
      (byStatus[PaymentStatus.REFUNDED] || 0) + (byStatus[PaymentStatus.PARTIALLY_REFUNDED] || 0);
    const refundRate = total > 0 ? (refundedCount / total) * 100 : 0;

    return {
      total,
      byStatus,
      byCurrency,
      byPaymentMethod,
      totalAmount,
      totalAmountByCurrency,
      thisMonth,
      thisMonthAmount,
      avgPaymentAmount,
      avgPaymentTime: 300,
      successRate,
      refundRate,
    };
  }

  async getCompanyBalance(companyId: string): Promise<CompanyBalance> {
    const now = new Date();

    const receivedStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalReceived')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
      .groupBy('payment.currency')
      .getRawMany();

    const refundedStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalRefunded')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
      })
      .groupBy('payment.currency')
      .getRawMany();

    const pendingStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalPending')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      })
      .groupBy('payment.currency')
      .getRawMany();

    const disputedStats = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(CAST(payment.amount AS DECIMAL))', 'totalDisputed')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.DISPUTED, PaymentStatus.CHARGEBACK],
      })
      .groupBy('payment.currency')
      .getRawMany();

    const balanceByCurrency: Record<PaymentCurrency, any> = {} as any;

    Object.values(PaymentCurrency).forEach((currency) => {
      balanceByCurrency[currency] = {
        received: 0,
        refunded: 0,
        net: 0,
        pending: 0,
      };
    });

    const allCurrencies = new Set([
      ...receivedStats.map((s) => s.currency),
      ...refundedStats.map((s) => s.currency),
      ...pendingStats.map((s) => s.currency),
      ...disputedStats.map((s) => s.currency),
    ]);

    allCurrencies.forEach((currency) => {
      if (!currency) return;

      const received = parseFloat(receivedStats.find((s) => s.currency === currency)?.totalReceived) || 0;
      const refunded = parseFloat(refundedStats.find((s) => s.currency === currency)?.totalRefunded) || 0;
      const pending = parseFloat(pendingStats.find((s) => s.currency === currency)?.totalPending) || 0;

      if (Object.values(PaymentCurrency).includes(currency as PaymentCurrency)) {
        balanceByCurrency[currency as PaymentCurrency] = {
          received,
          refunded,
          net: received - refunded,
          pending,
        };
      }
    });

    const totalReceived = receivedStats.reduce((sum, stat) => sum + parseFloat(stat.totalReceived || 0), 0);
    const totalRefunded = refundedStats.reduce((sum, stat) => sum + parseFloat(stat.totalRefunded || 0), 0);
    const pendingAmount = pendingStats.reduce((sum, stat) => sum + parseFloat(stat.totalPending || 0), 0);
    const disputedAmount = disputedStats.reduce((sum, stat) => sum + parseFloat(stat.totalDisputed || 0), 0);

    return {
      companyId,
      totalReceived,
      totalRefunded,
      netBalance: totalReceived - totalRefunded,
      pendingAmount,
      disputedAmount,
      balanceByCurrency,
      lastUpdated: now,
    };
  }

  async getPaymentsCountForCompany(companyId: string): Promise<number> {
    return this.paymentsRepository.count({ where: { companyId } });
  }

  async findOverduePayments(companyId: string): Promise<Payment[]> {
    const now = new Date();
    const timeoutMinutes = PAYMENTS_CONSTANTS.DEFAULTS.PAYMENT_TIMEOUT_MINUTES;
    const expiredDate = new Date(now.getTime() - timeoutMinutes * 60 * 1000);

    return this.paymentsRepository.find({
      where: {
        companyId,
        status: PaymentStatus.PENDING,
        createdAt: LessThan(expiredDate),
      } as any,
      relations: ['invoice', 'paymentMethod'],
      order: { createdAt: 'ASC' },
    });
  }

  async bulkUpdateStatus(paymentIds: string[], status: PaymentStatus): Promise<number> {
    const result = await this.paymentsRepository.update({ id: In(paymentIds) }, { status });
    return result.affected || 0;
  }

  // ========== PRIVATE ==========

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      paymentDate: 'payment.paymentDate',
      amount: 'payment.amount',
      status: 'payment.status',
      createdAt: 'payment.createdAt',
      updatedAt: 'payment.updatedAt',
      transactionId: 'payment.transactionId',
    };

    return fieldMap[sortField] || 'payment.paymentDate';
  }
}
