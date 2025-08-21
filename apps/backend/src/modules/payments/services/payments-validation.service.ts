// src/modules/payments/services/payments-validation.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentsDataService } from './payments-data.service';
import { Payment } from '../../../database/entities';
import { 
  CreatePaymentData, 
  UpdatePaymentData, 
  RefundData,
  UserWithCompany,
  PaymentStatus,
  PaymentCurrency 
} from '../types/payments.types';
import { IPaymentsValidationService } from '../interfaces/payments.interface';
import { 
  PaymentNotFoundException,
  PaymentProcessingException,
  ValidationDataException,
  ResourceOwnershipException 
} from '../../../common/exceptions/domain.exceptions';
import { PAYMENTS_CONSTANTS } from '../constants/payments.constants';
import { InvoicesService } from '../../invoices/invoices.service';
import { PaymentMethodsService } from '../../payment-methods/payment-methods.service';

@Injectable()
export class PaymentsValidationService implements IPaymentsValidationService {
  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * ✅ Валидация данных для записи платежа
   */
  async validateRecordPaymentForUser(data: CreatePaymentData, user: UserWithCompany): Promise<void> {
    // 🔒 Базовая валидация безопасности
    this.validateUserCompanyAccess(user);
    
    // 🔒 Проверка принадлежности компании
    if (data.companyId !== user.companyId) {
      throw new ValidationDataException(
        'companyId',
        `Payment can only be recorded for user's company ${user.companyId}`
      );
    }

    // 💰 Валидация суммы платежа
    this.validatePaymentAmount(data.amount);

    // 💱 Валидация валюты
    this.validateCurrency(data.currency);

    // 📋 Проверка существования и принадлежности инвойса
    await this.validateInvoiceOwnership(data.invoiceId, user.companyId);

    // 💳 Проверка существования и принадлежности способа оплаты
    await this.validatePaymentMethodOwnership(data.paymentMethodId, user.companyId);

    // 🔍 Валидация ID транзакции
    if (data.transactionId) {
      this.validateTransactionId(data.transactionId);
      await this.validateTransactionIdUniqueness(data.transactionId, user.companyId);
    }

    // 📝 Валидация примечаний
    if (data.notes) {
      this.validateNotes(data.notes);
    }

    // 💱 Валидация валютного обмена
    if (data.originalCurrency || data.originalAmount || data.exchangeRate) {
      this.validateCurrencyExchange(data);
    }

    // 🌐 Валидация gateway данных
    if (data.gatewayTransactionId || data.gatewayResponse) {
      this.validateGatewayData(data);
    }
  }

  /**
   * ✅ Валидация данных для обновления платежа
   */
  async validateUpdateData(id: string, data: UpdatePaymentData): Promise<void> {
    // Проверяем существование платежа
    const payment = await this.validatePaymentExists(id);

    // 🔄 Валидация изменения статуса
    if (data.status && data.status !== payment.status) {
      this.validateStatusTransition(payment.status as PaymentStatus, data.status);
    }

    // 🔍 Валидация ID транзакции
    if (data.transactionId) {
      this.validateTransactionId(data.transactionId);
      // Проверяем уникальность только если ID изменился
      if (data.transactionId !== payment.transactionId) {
        await this.validateTransactionIdUniqueness(data.transactionId, payment.companyId);
      }
    }

    // 📝 Валидация примечаний
    if (data.notes) {
      this.validateNotes(data.notes);
    }

    // 🔒 Валидация изменений для финальных статусов
    this.validateFinalStatusChanges(payment, data);
  }

  /**
   * ✅ Валидация данных для возврата
   */
  async validateRefundData(paymentId: string, refundData: RefundData): Promise<void> {
    // Проверяем существование платежа
    const payment = await this.validatePaymentExists(paymentId);

    // 🔄 Проверка статуса платежа
    if (payment.status !== PaymentStatus.PROCESSED) {
      throw new PaymentProcessingException(
        `Cannot refund payment with status ${payment.status}. Only processed payments can be refunded.`
      );
    }

    // 💰 Валидация суммы возврата
    this.validateRefundAmount(refundData.amount, parseFloat(payment.amount.toString()));

    // 📝 Валидация причины возврата
    if (!refundData.reason || refundData.reason.trim().length < 3) {
      throw new ValidationDataException(
        'reason',
        'Refund reason must be at least 3 characters long'
      );
    }

    if (refundData.reason.length > PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException(
        'reason',
        `Refund reason cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} characters`
      );
    }

    // 📝 Валидация примечаний к возврату
    if (refundData.notes && refundData.notes.length > PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException(
        'notes',
        `Refund notes cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} characters`
      );
    }

    // 💳 Валидация способа возврата (если указан)
    if (refundData.refundMethodId) {
      await this.validatePaymentMethodOwnership(refundData.refundMethodId, payment.companyId);
    }

    // ⏰ Проверка срока возврата
    this.validateRefundTimeLimit(payment);
  }

  /**
   * ✅ Проверка существования платежа
   */
  async validatePaymentExists(id: string): Promise<Payment> {
    const payment = await this.paymentsDataService.findById(id);
    
    if (!payment) {
      throw new PaymentNotFoundException(id);
    }

    return payment;
  }

  /**
   * 🔒 Валидация принадлежности платежа компании
   */
  async validatePaymentOwnership(paymentId: string, companyId: string): Promise<Payment> {
    const payment = await this.paymentsDataService.findByIdForCompany(paymentId, companyId);
    
    if (!payment) {
      throw new ResourceOwnershipException('payment', paymentId);
    }

    return payment;
  }

  /**
   * 🔒 Валидация фильтра платежей
   */
  validatePaymentsFilter(filter: any): void {
    // Валидация пагинации
    if (filter.page && (filter.page < 1 || filter.page > 10000)) {
      throw new ValidationDataException('page', 'Page must be between 1 and 10000');
    }

    if (filter.limit && (filter.limit < 1 || filter.limit > PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS)) {
      throw new ValidationDataException('limit', `Limit must be between 1 and ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS}`);
    }

    // Валидация сумм
    if (filter.amountFrom && filter.amountFrom < 0) {
      throw new ValidationDataException('amountFrom', 'Amount from cannot be negative');
    }

    if (filter.amountTo && filter.amountTo < 0) {
      throw new ValidationDataException('amountTo', 'Amount to cannot be negative');
    }

    if (filter.amountFrom && filter.amountTo && filter.amountFrom > filter.amountTo) {
      throw new ValidationDataException('amountRange', 'Amount from cannot be greater than amount to');
    }

    // Валидация дат
    if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
      throw new ValidationDataException('dateRange', 'Date from cannot be later than date to');
    }

    // Валидация статуса
    if (filter.status && !Object.values(PaymentStatus).includes(filter.status)) {
      throw new ValidationDataException('status', 'Invalid payment status');
    }

    // Валидация поискового запроса
    if (filter.search && filter.search.length > 255) {
      throw new ValidationDataException('search', 'Search query too long (max 255 characters)');
    }
  }

  // ========== PRIVATE VALIDATION METHODS ==========

  /**
   * 🔒 Валидация доступа пользователя к компании
   */
  private validateUserCompanyAccess(user: UserWithCompany): void {
    if (!user.companyId) {
      throw new ValidationDataException(
        'companyAccess',
        'User must belong to a company to record payments'
      );
    }

    if (!PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT.includes(user.role)) {
      throw new ValidationDataException(
        'roleAccess',
        `Role ${user.role} is not allowed to record payments`
      );
    }
  }

  /**
   * 💰 Валидация суммы платежа
   */
  private validatePaymentAmount(amount: number): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationDataException('amount', 'Payment amount must be a valid number');
    }

    if (amount < PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN) {
      throw new ValidationDataException(
        'amount',
        `Payment amount must be at least ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN}`
      );
    }

    if (amount > PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX) {
      throw new ValidationDataException(
        'amount',
        `Payment amount cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX}`
      );
    }

    // Проверка на разумное количество десятичных знаков
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new ValidationDataException(
        'amount',
        'Payment amount cannot have more than 2 decimal places'
      );
    }
  }

  /**
   * 💱 Валидация валюты
   */
  private validateCurrency(currency?: PaymentCurrency): void {
    if (currency && !Object.values(PaymentCurrency).includes(currency)) {
      throw new ValidationDataException('currency', 'Invalid currency code');
    }
  }

  /**
   * 🔍 Валидация ID транзакции
   */
  private validateTransactionId(transactionId: string): void {
    if (transactionId.length < PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MIN_LENGTH) {
      throw new ValidationDataException(
        'transactionId',
        `Transaction ID must be at least ${PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MIN_LENGTH} characters`
      );
    }

    if (transactionId.length > PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH) {
      throw new ValidationDataException(
        'transactionId',
        `Transaction ID cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH} characters`
      );
    }

    if (!PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.PATTERN.test(transactionId)) {
      throw new ValidationDataException(
        'transactionId',
        'Transaction ID contains invalid characters. Only letters, numbers, hyphens and underscores are allowed'
      );
    }
  }

  /**
   * 🔍 Проверка уникальности ID транзакции
   */
  private async validateTransactionIdUniqueness(transactionId: string, companyId: string): Promise<void> {
    const [existingPayments] = await this.paymentsDataService.findWithFilters({
      companyId,
      search: transactionId,
      limit: 1,
    });

    const existingPayment = existingPayments.find(p => p.transactionId === transactionId);
    if (existingPayment) {
      throw new ValidationDataException(
        'transactionId',
        `Transaction ID ${transactionId} already exists in company ${companyId}`
      );
    }
  }

  /**
   * 📝 Валидация примечаний
   */
  private validateNotes(notes: string): void {
    if (notes.length > PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException(
        'notes',
        `Notes cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} characters`
      );
    }
  }

  /**
   * 📋 Валидация принадлежности инвойса
   */
  private async validateInvoiceOwnership(invoiceId: string, companyId: string): Promise<void> {
    const belongsToCompany = await this.invoicesService.belongsToCompany(invoiceId, companyId);
    
    if (!belongsToCompany) {
      throw new ResourceOwnershipException('invoice', invoiceId);
    }
  }

  /**
   * 💳 Валидация принадлежности способа оплаты
   */
  private async validatePaymentMethodOwnership(paymentMethodId: string, companyId: string): Promise<void> {
    const belongsToCompany = await this.paymentMethodsService.existsInCompany(paymentMethodId, companyId);
    
    if (!belongsToCompany) {
      throw new ResourceOwnershipException('payment_method', paymentMethodId);
    }
  }

  /**
   * 💱 Валидация валютного обмена
   */
  private validateCurrencyExchange(data: CreatePaymentData): void {
    const { originalCurrency, originalAmount, exchangeRate, amount, currency } = data;

    // Если указаны данные обмена, все поля должны быть заполнены
    if ((originalCurrency || originalAmount || exchangeRate) && 
        (!originalCurrency || !originalAmount || !exchangeRate)) {
      throw new ValidationDataException(
        'currencyExchange',
        'For currency exchange, all fields (originalCurrency, originalAmount, exchangeRate) must be provided'
      );
    }

    if (originalCurrency && originalAmount && exchangeRate) {
      // Валидация курса обмена
      if (exchangeRate <= 0) {
        throw new ValidationDataException('exchangeRate', 'Exchange rate must be positive');
      }

      if (exchangeRate > 1000000) {
        throw new ValidationDataException('exchangeRate', 'Exchange rate seems unrealistic (> 1,000,000)');
      }

      // Валидация оригинальной суммы
      if (originalAmount < PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN) {
        throw new ValidationDataException('originalAmount', 'Original amount is too small');
      }

      // Проверка расчета
      const expectedAmount = originalAmount * exchangeRate;
      if (Math.abs(expectedAmount - amount) > 0.01) {
        throw new ValidationDataException(
          'currencyExchange',
          `Amount mismatch: expected ${expectedAmount.toFixed(2)}, got ${amount}`
        );
      }

      // Валидация валют
      this.validateCurrency(originalCurrency);
      if (originalCurrency === currency) {
        throw new ValidationDataException(
          'currencyExchange',
          'Original currency cannot be the same as target currency'
        );
      }
    }
  }

  /**
   * 🌐 Валидация gateway данных
   */
  private validateGatewayData(data: CreatePaymentData): void {
    if (data.gatewayTransactionId && data.gatewayTransactionId.length > 255) {
      throw new ValidationDataException(
        'gatewayTransactionId',
        'Gateway transaction ID is too long (max 255 characters)'
      );
    }

    if (data.gatewayFee && data.gatewayFee < 0) {
      throw new ValidationDataException('gatewayFee', 'Gateway fee cannot be negative');
    }

    if (data.gatewayResponse && typeof data.gatewayResponse !== 'object') {
      throw new ValidationDataException('gatewayResponse', 'Gateway response must be an object');
    }
  }

  /**
   * 🔄 Валидация перехода статусов
   */
  private validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): void {
    // ✅ ПРАВИЛЬНАЯ ТИПИЗАЦИЯ allowedTransitions
    const allowedTransitions = (PAYMENTS_CONSTANTS.STATUS_TRANSITIONS as Record<PaymentStatus, PaymentStatus[]>)[currentStatus];
    
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new PaymentProcessingException(
        `Cannot change payment status from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * 🔒 Валидация изменений для финальных статусов
   */
  private validateFinalStatusChanges(payment: Payment, data: UpdatePaymentData): void {
    const finalStatuses = [
      PaymentStatus.PROCESSED,
      PaymentStatus.REFUNDED,
      PaymentStatus.CANCELED,
      PaymentStatus.CHARGEBACK
    ];

    if (finalStatuses.includes(payment.status as PaymentStatus)) {
      const allowedFields = ['notes', 'safeMetadata'];
      const attemptedChanges = Object.keys(data).filter(key => !allowedFields.includes(key));
      
      if (attemptedChanges.length > 0) {
        throw new PaymentProcessingException(
          `Cannot modify fields [${attemptedChanges.join(', ')}] for payment with final status ${payment.status}`
        );
      }
    }
  }

  /**
   * 💰 Валидация суммы возврата
   */
  private validateRefundAmount(refundAmount: number, paymentAmount: number): void {
    if (refundAmount < PAYMENTS_CONSTANTS.VALIDATION.REFUND.MIN_AMOUNT) {
      throw new ValidationDataException(
        'refundAmount',
        `Refund amount must be at least ${PAYMENTS_CONSTANTS.VALIDATION.REFUND.MIN_AMOUNT}`
      );
    }

    if (refundAmount > paymentAmount) {
      throw new ValidationDataException(
        'refundAmount',
        `Refund amount ${refundAmount} cannot exceed payment amount ${paymentAmount}`
      );
    }

    const maxRefundPercentage = PAYMENTS_CONSTANTS.VALIDATION.REFUND.MAX_PERCENTAGE;
    const maxRefundAmount = (paymentAmount * maxRefundPercentage) / 100;
    
    if (refundAmount > maxRefundAmount) {
      throw new ValidationDataException(
        'refundAmount',
        `Refund amount cannot exceed ${maxRefundPercentage}% of payment amount`
      );
    }
  }

  /**
   * ⏰ Проверка срока возврата
   */
  private validateRefundTimeLimit(payment: Payment): void {
    const paymentDate = new Date(payment.paymentDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS) {
      throw new PaymentProcessingException(
        `Cannot refund payment older than ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS} days. Payment is ${daysDiff} days old.`
      );
    }
  }
}
