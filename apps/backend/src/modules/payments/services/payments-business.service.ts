// path: apps/backend/src/modules/payments/services/payments-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Invoice, Payment, PaymentMethod } from '../../../database/entities';
import { PaymentsDataService } from './payments-data.service';
import {
  CompanyBalance,
  CreatePaymentData,
  PaymentStatistics,
  PaymentStatus,
  RefundData,
  UpdatePaymentData,
  UserWithCompany,
} from '../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { PaymentMethodsService } from '../../payment-methods/payment-methods.service';
import {
  PaymentNotFoundException,
  PaymentProcessingException,
  ResourceOwnershipException,
  ValidationDataException,
} from '../../../common/exceptions/domain.exceptions';
// Тип для согласования с InvoicesService.processPayment
import type { UserWithCompany as InvoiceUser } from '../../invoices/types/invoices.types';

@Injectable()
export class PaymentsBusinessService {
  private readonly logger = new Logger(PaymentsBusinessService.name);

  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly auditService: AuditService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly dataSource: DataSource,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async recordPaymentForCompany(data: CreatePaymentData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(
      `Recording payment for company ${data.companyId}, amount: ${data.amount} ${data.currency || 'RUB'}`,
    );

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const currentCount = await this.paymentsDataService.getPaymentsCountForCompany(data.companyId);
        const limitCheck = await this.subscriptionLimitsService.checkOrderLimit(
          data.companyId,
          currentCount,
          1,
        );

        if (!limitCheck.allowed) {
          throw new PaymentProcessingException(
            `Превышен лимит платежей: ${currentCount}/${limitCheck.limit}`,
          );
        }

        const invoiceInfo = await this.invoicesService.getInvoiceInfo(data.invoiceId);
        if (!invoiceInfo) throw new PaymentNotFoundException(`Invoice ${data.invoiceId} not found`);
        if (invoiceInfo.companyId !== data.companyId) throw new ResourceOwnershipException('invoice', data.invoiceId);
        if (invoiceInfo.status !== 'issued') {
          throw new PaymentProcessingException(
            `Cannot process payment for invoice ${invoiceInfo.invoiceNumber} - status: ${invoiceInfo.status}`,
          );
        }

        const paymentMethodInfo = await this.paymentMethodsService.getPaymentMethodForPayment(
          data.paymentMethodId,
          data.companyId,
        );

        if (data.amount > invoiceInfo.remainingAmount) {
          throw new ValidationDataException(
            'amount',
            `Payment amount ${data.amount} exceeds remaining invoice amount ${invoiceInfo.remainingAmount}`,
          );
        }

        const processedData = await this.processCurrencyExchange(data, paymentMethodInfo);

        const feeInfo = await this.paymentMethodsService.calculateProcessingFee(
          data.paymentMethodId,
          processedData.amount,
          data.companyId,
        );

        const initialStatus = this.determineInitialStatus(paymentMethodInfo.type);

        // Фискальные данные считаем только если включено
        const fiscalData = PAYMENTS_CONSTANTS.BUSINESS_RULES.ENABLE_FISCALIZATION
          ? await this.calculateFiscalData(processedData, paymentMethodInfo)
          : { vatRate: null, vatAmount: null };

        const pdpData = await this.processPdpCompliance(processedData, user);

        const paymentData: CreatePaymentData = {
          ...processedData,
          status: initialStatus,
          gatewayFee: feeInfo.fee,

          // 54-ФЗ
          vatRate: fiscalData.vatRate,
          vatAmount: fiscalData.vatAmount,

          // 152-ФЗ
          pdpConsentVersion: pdpData.consentVersion,
          pdpConsentDate: pdpData.consentDate,
          dataRetentionUntil: pdpData.retentionUntil,

          // Безопасные метаданные
          safeMetadata: this.createSafeMetadata(data.metadata, user),
        };

        const payment = await this.paymentsDataService.createWithTransaction(paymentData, manager);

        // Автоперевод в PROCESSED для наличных
        if (
          PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_PROCESS_CASH_PAYMENTS &&
          paymentMethodInfo.type === 'cash'
        ) {
          await this.processPaymentAutomatically(payment.id, user, manager);

          // После успешной обработки наличного платежа — обновляем счет (оплата)
          try {
            const invUser: InvoiceUser = {
              id: user.id,
              email: user.email ?? '',
              role: user.role as any,
              companyId: user.companyId,
              firstName: user.firstName,
              lastName: user.lastName,
            };
            await this.invoicesService.processPayment(data.invoiceId, processedData.amount, invUser);
          } catch (err) {
            this.logger.warn(`Failed to mark invoice as paid for cash payment ${payment.id}: ${err?.message}`);
          }
        }

        // Фискализация (если требуется по типу оплаты и флагу)
        if (this.requiresFiscalization(paymentMethodInfo.type)) {
          await this.processFiscalization(payment, invoiceInfo, manager);
        }

        await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_RECORDED, {
          userId: user.id,
          companyId: user.companyId,
          entityType: 'payment',
          entityId: payment.id,
          details: this.createAuditDetails(payment, 'created'),
          metadata: {
            invoiceNumber: invoiceInfo.invoiceNumber,
            paymentMethodType: paymentMethodInfo.type,
            fiscalizationRequired: this.requiresFiscalization(paymentMethodInfo.type),
            action: 'payment_created',
            timestamp: new Date().toISOString(),
          },
        });

        // Для безналичных/эквайринга статус станет PROCESSED позже — обработаем в update (processStatusChange)
        this.logger.log(`✅ Payment recorded: ${payment.id} for ${payment.amount} ${payment.currency}`);
        return payment;
      } catch (error) {
        this.logger.error(`❌ Failed to record payment: ${error.message}`, error.stack);
        await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_RECORDED, {
          userId: user.id,
          companyId: user.companyId,
          entityType: 'payment',
          entityId: 'failed',
          metadata: {
            error: error.message,
            action: 'payment_creation_failed',
            timestamp: new Date().toISOString(),
            attemptedAmount: data.amount,
            attemptedCurrency: data.currency,
          },
        });
        throw error;
      }
    });
  }

  async updatePayment(id: string, data: UpdatePaymentData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(`Updating payment ${id} for user ${user.id}`);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const payment = await this.paymentsDataService.findByIdWithTransaction(id, manager);
        if (!payment) throw new PaymentNotFoundException(id);

        if (payment.companyId !== user.companyId) throw new ResourceOwnershipException('payment', id);

        if (data.status && data.status !== payment.status) {
          await this.validateStatusTransition(payment.status as PaymentStatus, data.status as PaymentStatus);
          await this.processStatusChange(payment, data.status as PaymentStatus, user, manager);
        }

        const updateData = await this.prepareUpdateData(data, payment, user);
        const updatedPayment = await this.paymentsDataService.updateWithTransaction(id, updateData, manager);

        await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_UPDATED, {
          userId: user.id,
          companyId: user.companyId,
          entityType: 'payment',
          entityId: id,
          details: this.createAuditDetails(updatedPayment, 'updated'),
          metadata: {
            changes: this.detectChanges(payment, data),
            oldStatus: payment.status,
            newStatus: data.status,
            action: 'payment_updated',
            timestamp: new Date().toISOString(),
          },
        });

        this.logger.log(`✅ Payment ${id} updated successfully`);
        return updatedPayment;
      } catch (error) {
        this.logger.error(`❌ Failed to update payment ${id}: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  async processRefund(paymentId: string, refundData: RefundData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(`Processing refund for payment ${paymentId}, amount: ${refundData.amount}`);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const payment = await this.paymentsDataService.findByIdWithTransaction(paymentId, manager);
        if (!payment) throw new PaymentNotFoundException(paymentId);

        if (payment.companyId !== user.companyId)
          throw new ResourceOwnershipException('payment', paymentId);

        if (payment.status !== PaymentStatus.PROCESSED) {
          throw new PaymentProcessingException(
            `Cannot refund payment ${paymentId} - current status: ${payment.status}`,
          );
        }

        const maxRefundAmount = parseFloat(payment.amount.toString());
        if (refundData.amount > maxRefundAmount) {
          throw new ValidationDataException(
            'amount',
            `Refund amount ${refundData.amount} exceeds payment amount ${maxRefundAmount}`,
          );
        }

        this.validateRefundTimeLimit(payment);

        if (
          PAYMENTS_CONSTANTS.BUSINESS_RULES.REQUIRE_APPROVAL_FOR_LARGE_REFUNDS &&
          refundData.amount >= PAYMENTS_CONSTANTS.BUSINESS_RULES.LARGE_REFUND_THRESHOLD &&
          !['company_owner', 'company_admin'].includes(user.role)
        ) {
          throw new PaymentProcessingException(`Large refunds require owner or admin approval`);
        }

        const isFullRefund = Math.abs(refundData.amount - maxRefundAmount) < 0.01;
        const newStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

        let fiscalRefundData: { receiptNumber: string; refundDate: Date } | null = null;
        if (PAYMENTS_CONSTANTS.BUSINESS_RULES.ENABLE_FISCALIZATION && payment.fiscalReceiptNumber) {
          fiscalRefundData = await this.processFiscalRefund(payment, refundData, manager);
        }

        const updatedPayment = await this.paymentsDataService.updateWithTransaction(
          paymentId,
          {
            status: newStatus,
            notes: this.appendRefundNotes(payment.notes, refundData),
            fiscalRefundReceiptNumber: fiscalRefundData?.receiptNumber || null,
            fiscalRefundDate: fiscalRefundData?.refundDate || null,
          },
          manager,
        );

        await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_REFUNDED, {
          userId: user.id,
          companyId: user.companyId,
          entityType: 'payment',
          entityId: paymentId,
          details: this.createAuditDetails(updatedPayment, 'refunded'),
          metadata: {
            refundAmount: refundData.amount,
            originalAmount: maxRefundAmount,
            refundType: isFullRefund ? 'full' : 'partial',
            reason: this.sanitizeRefundReason(refundData.reason),
            fiscalRefund: !!fiscalRefundData,
            action: 'payment_refunded',
            timestamp: new Date().toISOString(),
          },
        });

        this.logger.log(
          `✅ Refund processed: ${paymentId}, amount: ${refundData.amount}, type: ${
            isFullRefund ? 'full' : 'partial'
          }`,
        );
        return updatedPayment;
      } catch (error) {
        this.logger.error(`❌ Failed to process refund for payment ${paymentId}: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  async calculateCompanyBalance(companyId: string): Promise<CompanyBalance> {
    this.logger.log(`Calculating balance for company ${companyId}`);
    try {
      const balance = await this.paymentsDataService.getCompanyBalance(companyId);
      await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.BALANCE_CALCULATED, {
        companyId,
        entityType: 'company_balance',
        entityId: companyId,
        details: {
          netBalance: balance.netBalance,
          totalReceived: balance.totalReceived,
          totalRefunded: balance.totalRefunded,
          pendingAmount: balance.pendingAmount,
        },
        metadata: {
          action: 'balance_calculated',
          timestamp: new Date().toISOString(),
          calculationType: 'full_company_balance',
        },
      });
      return balance;
    } catch (error) {
      this.logger.error(`❌ Failed to calculate balance for company ${companyId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processOverduePayments(companyId: string): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
    anonymized: number;
  }> {
    this.logger.log(`Processing overdue payments for company ${companyId}`);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const overduePayments = await this.paymentsDataService.findOverduePayments(companyId);

        let expired = 0;
        let cancelled = 0;
        let anonymized = 0;

        const expiredRetentionPayments = await this.findPaymentsForAnonymization(companyId, manager);

        for (const payment of overduePayments) {
          try {
            if (payment.status === PaymentStatus.PENDING) {
              await this.paymentsDataService.updateWithTransaction(
                payment.id,
                { status: PaymentStatus.EXPIRED },
                manager,
              );
              expired++;

              await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_STATUS_CHANGED, {
                companyId,
                entityType: 'payment',
                entityId: payment.id,
                details: this.createAuditDetails(payment, 'expired'),
                metadata: {
                  autoExpired: true,
                  originalStatus: PaymentStatus.PENDING,
                  newStatus: PaymentStatus.EXPIRED,
                  timeoutMinutes: PAYMENTS_CONSTANTS.DEFAULTS.PAYMENT_TIMEOUT_MINUTES,
                  action: 'payment_auto_expired',
                  timestamp: new Date().toISOString(),
                },
              });
            }

            const hoursOverdue = Math.floor(
              (new Date().getTime() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60),
            );

            if (
              PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_EXPIRE_PENDING_PAYMENTS_HOURS > 0 &&
              hoursOverdue >= PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_EXPIRE_PENDING_PAYMENTS_HOURS * 2
            ) {
              await this.paymentsDataService.updateWithTransaction(
                payment.id,
                { status: PaymentStatus.CANCELED },
                manager,
              );
              cancelled++;
              this.logger.warn(`🗑️ Auto-cancelled payment ${payment.id} after ${hoursOverdue} hours`);
            }
          } catch (error) {
            this.logger.error(`❌ Failed to process overdue payment ${payment.id}:`, error);
          }
        }

        for (const payment of expiredRetentionPayments) {
          try {
            await this.anonymizePaymentPii(payment.id, manager);
            anonymized++;
          } catch (error) {
            this.logger.error(`❌ Failed to anonymize payment ${payment.id}:`, error);
          }
        }

        const result = {
          processed: overduePayments.length,
          expired,
          cancelled,
          anonymized,
        };

        this.logger.log(`✅ Overdue payments processed for company ${companyId}: ${JSON.stringify(result)}`);
        return result;
      } catch (error) {
        this.logger.error(
          `❌ Failed to process overdue payments for company ${companyId}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });
  }

  // ========== PRIVATE COMPLIANCE METHODS ==========

  private async calculateFiscalData(
    data: CreatePaymentData,
    paymentMethod: any,
  ): Promise<{ vatRate: number | null; vatAmount: number | null }> {
    const vatRate = paymentMethod.type === 'cash' ? 20.0 : null;
    const vatAmount = vatRate ? (data.amount * vatRate) / (100 + vatRate) : null;

    return {
      vatRate,
      vatAmount: vatAmount ? Math.round(vatAmount * 100) / 100 : null,
    };
  }

  private async processPdpCompliance(
    _data: CreatePaymentData,
    _user: UserWithCompany,
  ): Promise<{ consentVersion: string; consentDate: Date; retentionUntil: Date }> {
    const consentVersion = process.env.PRIVACY_POLICY_VERSION || '1.0';
    const consentDate = new Date();

    const retentionYears = parseInt(process.env.PAYMENT_DATA_RETENTION_YEARS || '5', 10);
    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    return { consentVersion, consentDate, retentionUntil };
  }

  private createSafeMetadata(
    originalMetadata: Record<string, any> | undefined,
    user: UserWithCompany,
  ): Record<string, any> {
    const safeMetadata: Record<string, any> = {
      source: 'api',
      version: '2.0',
      processed_by: user.role,
      timestamp: new Date().toISOString(),
    };

    if (originalMetadata) {
      const safeFields = ['source', 'campaign', 'device_type', 'app_version', 'referrer'];
      safeFields.forEach((field) => {
        if (originalMetadata[field] !== undefined) {
          safeMetadata[field] = originalMetadata[field];
        }
      });
    }

    return safeMetadata;
  }

  private requiresFiscalization(paymentMethodType: string): boolean {
    if (!PAYMENTS_CONSTANTS.BUSINESS_RULES.ENABLE_FISCALIZATION) return false;
    const fiscalizationTypes = ['cash', 'card', 'digital_wallet'];
    return fiscalizationTypes.includes(paymentMethodType);
  }

  private async processFiscalization(payment: Payment, _invoiceInfo: any, manager: EntityManager): Promise<void> {
    try {
      const receiptNumber = `${Date.now()}-${payment.id.slice(0, 8)}`;
      const fiscalDate = new Date();

      await this.paymentsDataService.updateWithTransaction(
        payment.id,
        {
          fiscalReceiptNumber: receiptNumber,
          fiscalReceiptDate: fiscalDate,
          kktSerialNumber: process.env.KKT_SERIAL_NUMBER || 'KKT000001',
          fiscalDocumentNumber: `FD${Date.now()}`,
          fiscalDocumentAttribute: this.generateFiscalAttribute(),
        },
        manager,
      );

      this.logger.log(`✅ Payment ${payment.id} fiscalized with receipt ${receiptNumber}`);
    } catch (error) {
      this.logger.error(`❌ Failed to fiscalize payment ${payment.id}:`, error);
    }
  }

  private async processFiscalRefund(
    payment: Payment,
    _refundData: RefundData,
    _manager: EntityManager,
  ): Promise<{ receiptNumber: string; refundDate: Date } | null> {
    try {
      const refundReceiptNumber = `REF-${Date.now()}-${payment.id.slice(0, 8)}`;
      const refundDate = new Date();

      this.logger.log(`✅ Fiscal refund processed for payment ${payment.id}, receipt: ${refundReceiptNumber}`);
      return { receiptNumber: refundReceiptNumber, refundDate };
    } catch (error) {
      this.logger.error(`❌ Failed to process fiscal refund for payment ${payment.id}:`, error);
      return null;
    }
  }

  private async findPaymentsForAnonymization(companyId: string, manager: EntityManager): Promise<Payment[]> {
    const now = new Date();

    return manager
      .getRepository(Payment)
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.dataRetentionUntil IS NOT NULL')
      .andWhere('p.dataRetentionUntil < :now', { now })
      .andWhere('p.piiAnonymized = false')
      .take(100)
      .getMany();
  }

  private async anonymizePaymentPii(paymentId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(Payment).update(
      paymentId,
      {
        notes: 'ANONYMIZED_DUE_TO_RETENTION_POLICY',
        transactionId: `ANON_${paymentId.slice(0, 8)}`,
        maskedCardNumber: null,
        piiAnonymized: true,
        safeMetadata: { anonymized: true, anonymizedAt: new Date().toISOString() } as any,
      } as any,
    );

    this.logger.log(`✅ Payment ${paymentId} PII anonymized due to retention policy`);
  }

  // ========== HELPERS ==========

  private generateFiscalAttribute(): string {
    return Math.floor(Math.random() * 1_000_000_000).toString();
  }

  private sanitizeRefundReason(reason: string): string {
    return reason
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '****')
      .replace(/\b\d{10,12}\b/g, '****')
      .slice(0, 100);
  }

  private appendRefundNotes(originalNotes: string | null, refundData: RefundData): string {
    const refundNote = `[REFUND] ${this.sanitizeRefundReason(refundData.reason)}: ${refundData.amount} RUB`;
    return originalNotes ? `${originalNotes}\n${refundNote}` : refundNote;
  }

  private createAuditDetails(payment: Payment, operation: string): Record<string, any> {
    return {
      operation,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      hasNotes: !!payment.notes,
      hasFiscalData: !!payment.fiscalReceiptNumber,
      isAnonymized: payment.piiAnonymized || false,
    };
  }

  private async processCurrencyExchange(data: CreatePaymentData, _paymentMethod: any): Promise<CreatePaymentData> {
    return data;
  }

  private determineInitialStatus(paymentMethodType: string): PaymentStatus {
    switch (paymentMethodType) {
      case 'cash':
        return PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_PROCESS_CASH_PAYMENTS
          ? PaymentStatus.PROCESSED
          : PaymentStatus.PENDING;
      case 'card':
      case 'digital_wallet':
        return PaymentStatus.PROCESSING;
      default:
        return PAYMENTS_CONSTANTS.DEFAULTS.STATUS;
    }
  }

  private async processPaymentAutomatically(
    paymentId: string,
    _user: UserWithCompany,
    manager: EntityManager,
  ): Promise<void> {
    await this.paymentsDataService.updateWithTransaction(
      paymentId,
      { status: PaymentStatus.PROCESSED },
      manager,
    );
  }

  private async validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): Promise<void> {
    const allowedTransitions = PAYMENTS_CONSTANTS.STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new PaymentProcessingException(
        `Cannot change payment status from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async processStatusChange(
    payment: Payment,
    newStatus: PaymentStatus,
    user: UserWithCompany,
    _manager: EntityManager,
  ): Promise<void> {
    // Если платеж стал PROCESSED (например, эквайринг подтвердил) — синхронизируем статус счета
    if (newStatus === PaymentStatus.PROCESSED) {
      try {
        const invUser: InvoiceUser = {
          id: user.id,
          email: user.email ?? '',
          role: user.role as any,
          companyId: user.companyId,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        const amount = parseFloat(payment.amount as any);
        await this.invoicesService.processPayment(payment.invoiceId, amount, invUser);
      } catch (err) {
        this.logger.warn(
          `Failed to update invoice after payment ${payment.id} moved to PROCESSED: ${err?.message}`,
        );
      }
    }
  }

  private async prepareUpdateData(
    data: UpdatePaymentData,
    _payment: Payment,
    _user: UserWithCompany,
  ): Promise<UpdatePaymentData> {
    return data;
  }

  private detectChanges(original: Payment, updates: UpdatePaymentData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      const k = key as keyof UpdatePaymentData;
      if ((updates as any)[k] !== (original as any)[k]) {
        changes[k] = { from: (original as any)[k], to: (updates as any)[k] };
      }
    });
    return changes;
  }

  private async updateInvoiceStatusIfNeeded(
    _invoiceId: string,
    _user: UserWithCompany,
    _manager: EntityManager,
  ): Promise<void> {
    // Логика перенесена: вызываем processPayment при переходе в PROCESSED (наличные — сразу, эквайринг — при update)
    return;
  }

  private validateRefundTimeLimit(payment: Payment): void {
    const paymentDate = new Date(payment.paymentDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS) {
      throw new PaymentProcessingException(
        `Cannot refund payment older than ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS} days. Payment is ${daysDiff} days old.`,
      );
    }
  }
}
