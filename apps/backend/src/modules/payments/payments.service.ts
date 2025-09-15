// path: apps/backend/src/modules/payments/payments.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';
import { RecordPaymentDto } from './dto/request/record-payment.dto';
import { RefundPaymentDto } from './dto/request/refund-payment.dto';
import { UpdatePaymentDto } from './dto/request/update-payment.dto';
import { PaymentResponseDto } from './dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from './dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from './dto/response/company-balance.dto';
import {
  PaymentFilter,
  CreatePaymentData,
  UserWithCompany,
  PaymentStatus,
  PaymentCurrency,
} from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';
import { AuthRole } from '../auth/types/auth.types';
import { PaymentProcessingException, ValidationDataException } from '../../common/exceptions/domain.exceptions';
import { InvoicesService } from '../invoices/invoices.service';
import { OnlinePaymentInitResponseDto } from './dto/response/online-init-response.dto';
import { OnlinePaymentInitDto } from './dto/request/online-init.dto';
import { PaymentMethod, Order } from '../../database/entities';
import { YooKassaPaymentsClient } from './services/yookassa-payments.client';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly paymentsBusinessService: PaymentsBusinessService,
    private readonly paymentsValidationService: PaymentsValidationService,
    private readonly paymentsMapperService: PaymentsMapperService,
    private readonly invoicesService: InvoicesService,
    private readonly ykClient: YooKassaPaymentsClient,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async initOnlinePayment(
    dto: OnlinePaymentInitDto,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<OnlinePaymentInitResponseDto> {
    const companyId = user.companyId!;
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const idem = idempotencyKey || `auto-${companyId}-${dto.invoiceId}-${Date.now()}`;
    const idemCacheKey = `payments:online:init:${companyId}:${dto.invoiceId}:${dto.amount || 'full'}:${idem}`;
    try {
      const cached = await this.redis.get(idemCacheKey);
      if (cached) return JSON.parse(cached) as OnlinePaymentInitResponseDto;
    } catch (e) {
      this.logger.warn(`Redis get failed for ${idemCacheKey}: ${e instanceof Error ? e.message : e}`);
    }

    const invoiceInfo = await this.invoicesService.getInvoiceInfo(dto.invoiceId);
    if (!invoiceInfo) throw new PaymentProcessingException(`Invoice ${dto.invoiceId} not found`);
    if (invoiceInfo.companyId !== companyId) throw new PaymentProcessingException('Invoice does not belong to company');
    if (invoiceInfo.status !== 'issued') {
      throw new PaymentProcessingException(`Invoice ${invoiceInfo.invoiceNumber} has status ${invoiceInfo.status}`);
    }

    const amountToPay = dto.amount ?? invoiceInfo.remainingAmount;
    if (typeof amountToPay !== 'number' || amountToPay <= 0) {
      throw new ValidationDataException('amount', 'Amount must be positive');
    }
    if (amountToPay > invoiceInfo.remainingAmount) {
      throw new ValidationDataException(
        'amount',
        `Amount ${amountToPay} exceeds remaining invoice amount ${invoiceInfo.remainingAmount}`,
      );
    }

    const pmRepo = this.dataSource.getRepository(PaymentMethod);
    let method: PaymentMethod | null = null;
    if (dto.paymentMethodId) {
      method = await pmRepo.findOne({ where: { id: dto.paymentMethodId, companyId, isActive: true } as any });
    } else {
      method = await pmRepo.findOne({
        where: { companyId, isActive: true, gatewayType: 'yookassa' } as any,
        order: { updatedAt: 'DESC' },
      });
    }
    if (!method) throw new PaymentProcessingException('No active YooKassa payment method configured for the company');
    if (!method.gatewayMerchantId || !method.gatewayApiKey) {
      throw new PaymentProcessingException('YooKassa merchant credentials are not configured');
    }

    const receipt = await this.buildYooKassaReceipt({
      orderId: invoiceInfo.orderId,
      invoiceId: invoiceInfo.id,
      invoiceTotal: invoiceInfo.totalAmount,
      payAmount: amountToPay,
      overrideEmail: dto.customer?.email,
      overridePhone: dto.customer?.phone,
    });

    const description =
      dto.description ||
      `Оплата счета ${invoiceInfo.invoiceNumber}${invoiceInfo.orderId ? ` по заказу ${invoiceInfo.orderId}` : ''}`;

    const metadata: Record<string, string> = {
      company_id: companyId,
      invoice_id: dto.invoiceId,
      order_id: invoiceInfo.orderId,
      created_by_user: user.id,
      provider: 'yookassa',
      ...(dto.metadata || {}),
    };

    const createPaymentData: CreatePaymentData = {
      companyId,
      invoiceId: dto.invoiceId,
      paymentMethodId: method.id,
      amount: amountToPay,
      currency: (dto.currency as PaymentCurrency) || PaymentCurrency.RUB,
      paymentDate: new Date(),
      notes: null,
      metadata: { ...dto.metadata, source: 'online', flow: 'yookassa' },
    };
    const localPayment = await this.paymentsBusinessService.recordPaymentForCompany(createPaymentData, userWithCompany);

    try {
      await this.paymentsDataService.update(localPayment.id, {
        safeMetadata: {
          ...(localPayment.safeMetadata || {}),
          idempotencyKey: idem,
          returnUrl: dto.returnUrl,
          provider: 'yookassa',
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to update safeMetadata for payment ${localPayment.id}: ${String(e)}`);
    }

    let yk;
    try {
      yk = await this.ykClient.createPayment({
        shopId: method.gatewayMerchantId!,
        secret: method.gatewayApiKey!,
        idempotenceKey: idem,
        amount: amountToPay,
        currency: (dto.currency as PaymentCurrency) || PaymentCurrency.RUB,
        description,
        returnUrl: dto.returnUrl,
        locale: dto.locale || 'ru_RU',
        capture: dto.capture ?? true,
        receipt,
        metadata,
      });
    } catch (e: any) {
      this.logger.error(`YooKassa createPayment failed: ${e?.message || e}`);
      try {
        await this.paymentsDataService.update(localPayment.id, {
          status: PaymentStatus.FAILED,
          notes: 'Online init failed',
          safeMetadata: {
            ...(localPayment.safeMetadata || {}),
            yk_error: e?.message || 'unknown_error',
          },
        });
      } catch {}
      throw new PaymentProcessingException('Failed to initialize online payment with provider');
    }

    try {
      await this.paymentsDataService.update(localPayment.id, {
        gatewayTransactionId: yk.id,
        safeMetadata: {
          ...(localPayment.safeMetadata || {}),
          redirectUrl: yk.confirmationUrl,
          yk_payment_id: yk.id,
          yk_status: yk.status,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to persist gateway data for payment ${localPayment.id}: ${String(e)}`);
    }

    const response: OnlinePaymentInitResponseDto = {
      paymentId: localPayment.id,
      provider: 'yookassa',
      status: 'pending',
      redirectUrl: yk.confirmationUrl,
      expiresAt: yk.expiresAt,
    };

    try {
      await this.redis.set(idemCacheKey, JSON.stringify(response), 'EX', 900);
    } catch (e) {
      this.logger.warn(`Redis set failed for ${idemCacheKey}: ${e instanceof Error ? e.message : e}`);
    }

    return response;
  }

  private async buildYooKassaReceipt(params: {
    orderId: string;
    invoiceId: string;
    invoiceTotal: number;
    payAmount: number;
    overrideEmail?: string;
    overridePhone?: string;
  }): Promise<{
    customer?: { email?: string; phone?: string };
    items: Array<{
      description: string;
      quantity: number;
      amount: { value: string; currency: string };
      vat_code: number;
      payment_mode: string;
      payment_subject: string;
    }>;
    tax_system_code?: number;
  }> {
    const { orderId, invoiceTotal, payAmount, overrideEmail, overridePhone } = params;
    const orderRepo = this.dataSource.getRepository(Order);

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'orderServices', 'orderParts'],
    });

    const items: Array<{
      description: string;
      quantity: number;
      rawTotal: number;
      subject: 'service' | 'commodity';
    }> = [];

    if (order?.orderServices?.length) {
      for (const s of order.orderServices) {
        const qty = Number(s.quantity || 1);
        const total = Number(s.totalAmount || 0);
        const desc = `Услуга #${s.serviceId || s.id}`;
        items.push({ description: desc, quantity: qty, rawTotal: total, subject: 'service' });
      }
    }

    if (order?.orderParts?.length) {
      for (const p of order.orderParts) {
        const qty = Number(p.quantity || 1);
        const total = Number(p.totalAmount || 0);
        const desc = `Запчасть #${p.partId || p.id}`;
        items.push({ description: desc, quantity: qty, rawTotal: total, subject: 'commodity' });
      }
    }

    if (!items.length) {
      return {
        customer: {
          email: overrideEmail || order?.customer?.emailNormalized || order?.customer?.email || undefined,
          phone: overridePhone || order?.customer?.phoneE164 || order?.customer?.phone || undefined,
        },
        items: [
          {
            description: 'Оплата по счёту',
            quantity: 1,
            amount: { value: this.asMoney(payAmount), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          },
        ],
      };
    }

    const scale = invoiceTotal > 0 ? payAmount / invoiceTotal : 1;
    const mapped = items.map((i) => ({
      description: i.description.slice(0, 128),
      quantity: i.quantity,
      scaled: Math.max(0, Math.round(i.rawTotal * scale * 100) / 100),
      subject: i.subject,
    }));

    const subtotal = mapped.reduce((sum, i) => sum + i.scaled, 0);
    const diff = Math.round((payAmount - subtotal) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      const last = mapped[mapped.length - 1];
      last.scaled = Math.max(0, Math.round((last.scaled + diff) * 100) / 100);
    }

    const resultItems = mapped.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      amount: { value: this.asMoney(i.scaled), currency: 'RUB' },
      vat_code: 1,
      payment_mode: 'full_payment',
      payment_subject: i.subject,
    }));

    return {
      customer: {
        email: overrideEmail || order?.customer?.emailNormalized || order?.customer?.email || undefined,
        phone: overridePhone || order?.customer?.phoneE164 || order?.customer?.phone || undefined,
      },
      items: resultItems,
    };
  }

  private asMoney(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  async recordPayment(recordPaymentDto: RecordPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for user ${user.id} in company ${user.companyId}`);
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const createPaymentData: CreatePaymentData = {
      companyId: user.companyId!,
      invoiceId: recordPaymentDto.invoiceId,
      paymentMethodId: recordPaymentDto.paymentMethodId,
      amount: recordPaymentDto.amount,
      currency: recordPaymentDto.currency,
      paymentDate: recordPaymentDto.paymentDate ? new Date(recordPaymentDto.paymentDate) : new Date(),
      transactionId: recordPaymentDto.transactionId,
      notes: recordPaymentDto.notes,
      exchangeRate: recordPaymentDto.exchangeRate,
      originalAmount: recordPaymentDto.originalAmount,
      originalCurrency: recordPaymentDto.originalCurrency,
      gatewayTransactionId: recordPaymentDto.gatewayTransactionId,
      gatewayResponse: recordPaymentDto.gatewayResponse,
      gatewayFee: recordPaymentDto.gatewayFee,
      metadata: recordPaymentDto.metadata,
    };

    await this.paymentsValidationService.validateRecordPaymentForUser(createPaymentData, userWithCompany);
    const payment = await this.paymentsBusinessService.recordPaymentForCompany(createPaymentData, userWithCompany);
    this.logger.log(`Payment recorded: ${payment.id} for amount ${payment.amount} ${payment.currency || 'RUB'}`);
    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  async findAll(filter: PaymentFilter = {}, user: RequestWithUser['user']): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Finding payments with filters: ${JSON.stringify(filter)} for user ${user.id}`);
    const secureFilter: PaymentFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };
    const [payments, total] = await this.paymentsDataService.findWithFilters(secureFilter);
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || PAYMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const totalPages = Math.ceil(total / limit);
    const statistics =
      user.role !== 'mechanic' ? await this.paymentsDataService.getPaymentsStatistics(secureFilter.companyId!) : null;

    return {
      items: this.paymentsMapperService.mapArrayToResponseDto(payments),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalAmount: statistics?.totalAmount || 0,
      successfulPayments: statistics?.byStatus?.processed || 0,
      failedPayments: statistics?.byStatus?.failed || 0,
      refundAmount: (statistics?.byStatus?.refunded || 0) + (statistics?.byStatus?.partially_refunded || 0),
    };
  }

  async findOne(id: string): Promise<PaymentResponseDto> {
    this.logger.log(`Finding payment: ${id}`);
    const payment = await this.paymentsValidationService.validatePaymentExists(id);
    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment: ${id}`);
    await this.paymentsValidationService.validateUpdateData(id, updatePaymentDto);
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const updatedPayment = await this.paymentsBusinessService.updatePayment(id, updatePaymentDto, userWithCompany);
    this.logger.log(`Payment updated: ${id}`);
    return this.paymentsMapperService.mapToResponseDto(updatedPayment);
  }

  async refundPayment(paymentId: string, refundPaymentDto: RefundPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);
    await this.paymentsValidationService.validateRefundData(paymentId, refundPaymentDto);
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const refundedPayment = await this.paymentsBusinessService.processRefund(paymentId, refundPaymentDto, userWithCompany);
    this.logger.log(`Refund processed for payment: ${paymentId}, amount: ${refundPaymentDto.amount}`);
    return this.paymentsMapperService.mapToResponseDto(refundedPayment);
  }

  async getStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for user ${user.id}`);
    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }
    const statistics = await this.paymentsDataService.getPaymentsStatistics(companyId!);
    return this.paymentsMapperService.mapToStatisticsDto(statistics, companyId!);
  }

  async getCompanyBalance(user: RequestWithUser['user']): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for user ${user.id}`);
    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }
    const balance = await this.paymentsBusinessService.calculateCompanyBalance(companyId!);
    return await this.paymentsMapperService.mapToBalanceDto(balance);
  }

  async processOverduePayments(user: RequestWithUser['user']): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
  }> {
    this.logger.log(`Processing overdue payments for user ${user.id}`);
    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }
    return this.paymentsBusinessService.processOverduePayments(companyId!);
  }

  async exists(id: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findById(id);
    return !!payment;
  }

  async getPaymentInfo(id: string): Promise<{
    id: string;
    invoiceId: string;
    companyId: string;
    status: string;
    amount: number;
    currency: string;
  } | null> {
    const payment = await this.paymentsDataService.findById(id);
    return payment ? this.paymentsMapperService.mapToBasicInfo(payment) : null;
  }

  async belongsToCompany(paymentId: string, companyId: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findByIdForCompany(paymentId, companyId);
    return !!payment;
  }

  async getPaymentsCountForCompany(companyId: string): Promise<number> {
    return this.paymentsDataService.getPaymentsCountForCompany(companyId);
  }

  async getPayments(filter: PaymentFilter): Promise<PaginatedPaymentsResponseDto> {
    const mockUser = {
      id: 'system-payment-user',
      email: 'system@payment.local',
      companyId: filter.companyId,
      role: 'company_admin' as AuthRole,
    } as RequestWithUser['user'];
    return this.findAll(filter, mockUser);
  }

  async getPaymentById(id: string, _user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.findOne(id);
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.update(id, updatePaymentDto, user);
  }

  async getPaymentStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    return this.getStatistics(user);
  }

  async deletePayment(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Deleting payment ${id} for user ${user.id}`);
    const payment = await this.paymentsValidationService.validatePaymentOwnership(id, user.companyId!);
    const forbiddenStatuses: PaymentStatus[] = [
      PaymentStatus.PROCESSED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.DISPUTED,
      PaymentStatus.CHARGEBACK,
    ];
    if (forbiddenStatuses.includes(payment.status as PaymentStatus)) {
      throw new PaymentProcessingException(
        'Cannot delete processed/refunded/disputed payments. Use refund or corrective documents.',
      );
    }
    await this.paymentsDataService.delete(id);
    this.logger.log(`Payment ${id} deleted`);
  }
}
