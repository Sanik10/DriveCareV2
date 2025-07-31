// src/modules/payments/services/payments-business.service.ts (ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, Invoice, PaymentMethod } from '../../../database/entities';
import { PaymentsDataService } from './payments-data.service';
import { 
  CreatePaymentData, 
  UpdatePaymentData,
  RefundData,
  UserWithCompany,
  PaymentStatus, // ✅ ИСПРАВЛЕНО
  PaymentCurrency,
  CompanyBalance,
  PaymentStatistics
} from '../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { PaymentMethodsService } from '../../payment-methods/payment-methods.service';

@Injectable()
export class PaymentsBusinessService {
  private readonly logger = new Logger(PaymentsBusinessService.name);

  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly auditService: AuditService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentMethodsService: PaymentMethodsService,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  /**
   * 💰 Запись платежа для компании с полной business логикой
   */
  async recordPaymentForCompany(data: CreatePaymentData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(`Recording payment for company ${data.companyId} from invoice ${data.invoiceId}`);

    // 🔒 Проверка лимитов подписки
    const currentCount = await this.paymentsDataService.getPaymentsCountForCompany(data.companyId);
    const limitCheck = await this.subscriptionLimitsService.checkOrderLimit(data.companyId, currentCount, 1);
    
    if (!limitCheck.allowed) {
      throw new Error(`Превышен лимит платежей: ${currentCount}/${limitCheck.limit}`);
    }

    // 🧾 Проверка и получение информации о счете
    const invoiceInfo = await this.invoicesService.getInvoiceInfo(data.invoiceId);
    if (!invoiceInfo) {
      throw new Error(`Invoice ${data.invoiceId} not found`);
    }

    if (invoiceInfo.companyId !== data.companyId) {
      throw new Error(`Invoice ${data.invoiceId} does not belong to company ${data.companyId}`);
    }

    if (invoiceInfo.status !== 'issued') {
      throw new Error(`Cannot process payment for invoice ${invoiceInfo.invoiceNumber} - status: ${invoiceInfo.status}`);
    }

    // 💳 Проверка способа оплаты
    const paymentMethodInfo = await this.paymentMethodsService.getPaymentMethodForPayment(
      data.paymentMethodId, 
      data.companyId
    );

    // 💰 Валидация суммы платежа
    if (data.amount > invoiceInfo.remainingAmount) {
      throw new Error(
        `Payment amount ${data.amount} exceeds remaining invoice amount ${invoiceInfo.remainingAmount}`
      );
    }

    // 💱 Обработка валютного обмена
    const processedData = await this.processCurrencyExchange(data, paymentMethodInfo);

    // 🧮 Расчет комиссий
    const feeInfo = await this.paymentMethodsService.calculateProcessingFee(
      data.paymentMethodId,
      processedData.amount,
      data.companyId
    );

    // 🎯 Автоопределение статуса на основе типа платежного метода
    const initialStatus = this.determineInitialStatus(paymentMethodInfo.type);

    // 💾 Создание платежа
    const paymentData: CreatePaymentData = {
      ...processedData,
      status: initialStatus,
      gatewayFee: feeInfo.fee,
    };

    const payment = await this.paymentsDataService.create(paymentData);

    // 🔄 Автоматическая обработка для некоторых типов платежей
    if (PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_PROCESS_CASH_PAYMENTS && 
        paymentMethodInfo.type === 'cash') {
      await this.processPaymentAutomatically(payment.id, user);
    }

    // 📊 Audit логирование
    await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_RECORDED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'payment',
      entityId: payment.id,
      details: {
        invoiceNumber: invoiceInfo.invoiceNumber,
        amount: payment.amount,
        currency: payment.currency || PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY,
        paymentMethodType: paymentMethodInfo.type,
        status: payment.status,
      },
    });

    // 📧 Уведомления при автообновлении статуса инвойса
    if (PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_UPDATE_INVOICE_STATUS) {
      await this.updateInvoiceStatusIfNeeded(data.invoiceId, user);
    }

    this.logger.log(`Payment recorded: ${payment.id} for ${payment.amount} ${payment.currency || 'RUB'}`);

    return payment;
  }

  /**
   * ✏️ Обновление платежа с business логикой
   */
  async updatePayment(id: string, data: UpdatePaymentData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(`Updating payment ${id}`);

    const payment = await this.paymentsDataService.findById(id);
    if (!payment) {
      throw new Error(`Payment ${id} not found`);
    }

    // 🔄 Валидация изменения статуса
    if (data.status && data.status !== payment.status) {
      await this.validateStatusTransition(payment.status, data.status); // ✅ ИСПРАВЛЕНО
      
      // 🎯 Бизнес-логика для смены статуса
      await this.processStatusChange(payment, data.status, user);
    }

    const updatedPayment = await this.paymentsDataService.update(id, data);

    // 📊 Audit логирование
    await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_STATUS_CHANGED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'payment',
      entityId: id,
      details: {
        changes: this.detectChanges(payment, data),
        oldStatus: payment.status,
        newStatus: data.status,
      },
    });

    this.logger.log(`Payment ${id} updated`);

    return updatedPayment;
  }

  /**
   * 🔄 Обработка возврата платежа
   */
  async processRefund(paymentId: string, refundData: RefundData, user: UserWithCompany): Promise<Payment> {
    this.logger.log(`Processing refund for payment ${paymentId}, amount: ${refundData.amount}`);

    const payment = await this.paymentsDataService.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // 🔒 Валидация возможности возврата
    if (payment.status !== PaymentStatus.PROCESSED) { // ✅ ИСПРАВЛЕНО
      throw new Error(`Cannot refund payment ${paymentId} - current status: ${payment.status}`);
    }

    // 💰 Проверка суммы возврата
    const maxRefundAmount = parseFloat(payment.amount.toString());
    if (refundData.amount > maxRefundAmount) {
      throw new Error(`Refund amount ${refundData.amount} exceeds payment amount ${maxRefundAmount}`);
    }

    // 🔍 Проверка срока возврата
    const paymentDate = new Date(payment.paymentDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS) {
      throw new Error(`Cannot refund payment older than ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS} days`);
    }

    // 🎯 Определение типа возврата (полный/частичный)
    const isFullRefund = Math.abs(refundData.amount - maxRefundAmount) < 0.01;
    const newStatus = isFullRefund ? 
      PaymentStatus.REFUNDED : // ✅ ИСПРАВЛЕНО
      PaymentStatus.PARTIALLY_REFUNDED; // ✅ ИСПРАВЛЕНО

    // 💳 Проверка способа возврата
    const refundMethodId = refundData.refundMethodId || payment.paymentMethodId;
    const refundMethod = await this.paymentMethodRepository.findOne({
      where: { id: refundMethodId, companyId: payment.companyId }
    });

    if (!refundMethod || !refundMethod.supportsRefunds) {
      throw new Error(`Payment method ${refundMethodId} does not support refunds`);
    }

    // 💰 Проверка лимитов на крупные возвраты
    if (PAYMENTS_CONSTANTS.BUSINESS_RULES.REQUIRE_APPROVAL_FOR_LARGE_REFUNDS &&
        refundData.amount >= PAYMENTS_CONSTANTS.BUSINESS_RULES.LARGE_REFUND_THRESHOLD &&
        !['owner', 'admin'].includes(user.role)) {
      throw new Error(`Large refunds require owner or admin approval`);
    }

    // 🔄 Обновление статуса платежа
    const updatedPayment = await this.paymentsDataService.update(paymentId, {
      status: newStatus,
      notes: `${payment.notes || ''}\n[REFUND] ${refundData.reason}: ${refundData.amount} ${payment.currency || 'RUB'}${refundData.notes ? ` - ${refundData.notes}` : ''}`.trim(),
    });

    // 📊 Audit логирование
    await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_REFUNDED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'payment',
      entityId: paymentId,
      details: {
        refundAmount: refundData.amount,
        originalAmount: maxRefundAmount,
        refundType: isFullRefund ? 'full' : 'partial',
        reason: refundData.reason,
        refundMethodId,
      },
    });

    this.logger.log(`Refund processed: ${paymentId}, amount: ${refundData.amount}, type: ${isFullRefund ? 'full' : 'partial'}`);

    return updatedPayment;
  }

  /**
   * 💰 Расчет баланса компании
   */
  async calculateCompanyBalance(companyId: string): Promise<CompanyBalance> {
    this.logger.log(`Calculating balance for company ${companyId}`);

    const balance = await this.paymentsDataService.getCompanyBalance(companyId);

    // 📊 Audit логирование
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
    });

    return balance;
  }

  /**
   * 🚨 Обработка просроченных платежей
   */
  async processOverduePayments(companyId: string): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
  }> {
    this.logger.log(`Processing overdue payments for company ${companyId}`);

    const overduePayments = await this.paymentsDataService.findOverduePayments(companyId);
    
    let expired = 0;
    let cancelled = 0;

    for (const payment of overduePayments) {
      try {
        // 🕐 Автоматическая просрочка
        if (payment.status === PaymentStatus.PENDING) { // ✅ ИСПРАВЛЕНО
          await this.paymentsDataService.update(payment.id, {
            status: PaymentStatus.EXPIRED // ✅ ИСПРАВЛЕНО
          });
          expired++;

          // 📊 Audit логирование просрочки
          await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_STATUS_CHANGED, {
            companyId,
            entityType: 'payment',
            entityId: payment.id,
            details: {
              autoExpired: true,
              originalStatus: PaymentStatus.PENDING, // ✅ ИСПРАВЛЕНО
              newStatus: PaymentStatus.EXPIRED, // ✅ ИСПРАВЛЕНО
              timeoutMinutes: PAYMENTS_CONSTANTS.DEFAULTS.PAYMENT_TIMEOUT_MINUTES,
            },
          });
        }

        // 🗑️ Автоотмена критично просроченных платежей
        const hoursOverdue = Math.floor(
          (new Date().getTime() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60)
        );

        if (PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_EXPIRE_PENDING_PAYMENTS_HOURS > 0 &&
            hoursOverdue >= PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_EXPIRE_PENDING_PAYMENTS_HOURS * 2) {
          
          await this.paymentsDataService.update(payment.id, {
            status: PaymentStatus.CANCELED // ✅ ИСПРАВЛЕНО
          });
          cancelled++;

          this.logger.warn(`Auto-cancelled payment ${payment.id} after ${hoursOverdue} hours`);
        }

      } catch (error) {
        this.logger.error(`Failed to process overdue payment ${payment.id}:`, error);
      }
    }

    const result = {
      processed: overduePayments.length,
      expired,
      cancelled,
    };

    this.logger.log(`Overdue payments processed for company ${companyId}: ${JSON.stringify(result)}`);

    return result;
  }

  // ========== PRIVATE METHODS ==========

  /**
   * 💱 Обработка валютного обмена
   */
  private async processCurrencyExchange(data: CreatePaymentData, paymentMethod: any): Promise<CreatePaymentData> {
    const processedData = { ...data };

    // Устанавливаем валюту по умолчанию если не указана
    if (!processedData.currency) {
      processedData.currency = PAYMENTS_CONSTANTS.DEFAULTS.CURRENCY;
    }

    // Обработка конвертации валют
    if (PAYMENTS_CONSTANTS.BUSINESS_RULES.ENABLE_CURRENCY_CONVERSION && 
        data.originalCurrency && 
        data.originalAmount && 
        data.exchangeRate) {
      
      // Валидация курса обмена
      if (data.exchangeRate <= 0) {
        throw new Error('Exchange rate must be positive');
      }

      // Пересчет суммы
      const convertedAmount = data.originalAmount * data.exchangeRate;
      if (Math.abs(convertedAmount - data.amount) > 0.01) {
        this.logger.warn(`Currency conversion mismatch: expected ${convertedAmount}, got ${data.amount}`);
      }
    }

    return processedData;
  }

  /**
   * 🎯 Определение начального статуса платежа
   */
  private determineInitialStatus(paymentMethodType: string): PaymentStatus { // ✅ ИСПРАВЛЕНО
    switch (paymentMethodType) {
      case 'cash':
        return PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_PROCESS_CASH_PAYMENTS ? 
          PaymentStatus.PROCESSED : // ✅ ИСПРАВЛЕНО
          PaymentStatus.PENDING; // ✅ ИСПРАВЛЕНО
      
      case 'card':
      case 'digital_wallet':
        return PaymentStatus.PROCESSING; // ✅ ИСПРАВЛЕНО
      
      case 'bank_transfer':
      case 'wire_transfer':
        return PaymentStatus.PENDING; // ✅ ИСПРАВЛЕНО
      
      default:
        return PAYMENTS_CONSTANTS.DEFAULTS.STATUS;
    }
  }

  /**
   * 🔄 Автоматическая обработка платежа
   */
  private async processPaymentAutomatically(paymentId: string, user: UserWithCompany): Promise<void> {
    try {
      await this.paymentsDataService.update(paymentId, {
        status: PaymentStatus.PROCESSED // ✅ ИСПРАВЛЕНО
      });

      await this.auditService.log(PAYMENTS_CONSTANTS.AUDIT_ACTIONS.PAYMENT_PROCESSED, {
        userId: user.id,
        companyId: user.companyId,
        entityType: 'payment',
        entityId: paymentId,
        details: {
          autoProcessed: true,
          reason: 'Cash payment auto-processing',
        },
      });

    } catch (error) {
      this.logger.error(`Failed to auto-process payment ${paymentId}:`, error);
    }
  }

  /**
   * ✅ Валидация перехода статусов
   */
  private async validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): Promise<void> {
	// ✅ ПРАВИЛЬНАЯ ТИПИЗАЦИЯ - убираем приведение типов
	const allowedTransitions = PAYMENTS_CONSTANTS.STATUS_TRANSITIONS[currentStatus];
	
	if (!allowedTransitions || !(allowedTransitions as readonly PaymentStatus[]).includes(newStatus)) {
		throw new Error(`Cannot change payment status from ${currentStatus} to ${newStatus}`);
	}
  }

  /**
   * 🔄 Обработка смены статуса
   */
  private async processStatusChange(payment: Payment, newStatus: PaymentStatus, user: UserWithCompany): Promise<void> { // ✅ ИСПРАВЛЕНО
    switch (newStatus) {
      case PaymentStatus.PROCESSED: // ✅ ИСПРАВЛЕНО
        // Обновляем статус связанного инвойса если нужно
        if (PAYMENTS_CONSTANTS.BUSINESS_RULES.AUTO_UPDATE_INVOICE_STATUS) {
          await this.updateInvoiceStatusIfNeeded(payment.invoiceId, user);
        }
        break;

      case PaymentStatus.FAILED: // ✅ ИСПРАВЛЕНО
        // Логика обработки неуспешного платежа
        break;

      case PaymentStatus.DISPUTED: // ✅ ИСПРАВЛЕНО
        // Логика обработки спорного платежа
        break;
    }
  }

  /**
   * 📋 Обновление статуса инвойса при необходимости
   */
  private async updateInvoiceStatusIfNeeded(invoiceId: string, user: UserWithCompany): Promise<void> {
    try {
      // Получаем информацию об инвойсе и связанных платежах
      const invoiceInfo = await this.invoicesService.getInvoiceInfo(invoiceId);
      if (!invoiceInfo) return;

      // Проверяем общую сумму успешных платежей
      const successfulPayments = await this.paymentsDataService.findWithFilters({
        companyId: user.companyId,
        invoiceId,
        status: PaymentStatus.PROCESSED, // ✅ ИСПРАВЛЕНО
      });

      const totalPaid = successfulPayments[0].reduce((sum, payment) => 
        sum + parseFloat(payment.amount.toString()), 0);

      // Если инвойс полностью оплачен, обновляем его статус
      if (totalPaid >= invoiceInfo.totalAmount && invoiceInfo.status === 'issued') {
        await this.invoicesService.processPayment(invoiceId, totalPaid, user);
      }

    } catch (error) {
      this.logger.error(`Failed to update invoice status for ${invoiceId}:`, error);
    }
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: Payment, updates: UpdatePaymentData): Record<string, any> {
    const changes: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== original[key]) {
        changes[key] = {
          from: original[key],
          to: updates[key],
        };
      }
    });

    return changes;
  }
}
