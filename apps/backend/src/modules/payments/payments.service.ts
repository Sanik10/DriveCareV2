// path: apps/backend/src/modules/payments/payments.service.ts
import { Injectable, Logger } from '@nestjs/common';
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
import { PaymentFilter, CreatePaymentData, UserWithCompany, PaymentStatus } from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';
import { AuthRole } from '../auth/types/auth.types'
import { PaymentProcessingException } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly paymentsBusinessService: PaymentsBusinessService,
    private readonly paymentsValidationService: PaymentsValidationService,
    private readonly paymentsMapperService: PaymentsMapperService,
  ) {}

  /**
   * 💰 Запись платежа с полной business логикой
   */
  async recordPayment(recordPaymentDto: RecordPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for user ${user.id} in company ${user.companyId}`);

    // 🔥 Преобразуем RequestWithUser['user'] в UserWithCompany
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // 🔥 Преобразуем DTO в CreatePaymentData
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

    // Валидация данных с проверкой принадлежности
    await this.paymentsValidationService.validateRecordPaymentForUser(createPaymentData, userWithCompany);

    // Создание через бизнес-сервис
    const payment = await this.paymentsBusinessService.recordPaymentForCompany(createPaymentData, userWithCompany);

    this.logger.log(`Payment recorded: ${payment.id} for amount ${payment.amount} ${payment.currency || 'RUB'}`);

    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  /**
   * 🔒 Получение всех платежей с фильтрацией по принадлежности
   */
  async findAll(filter: PaymentFilter = {}, user: RequestWithUser['user']): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Finding payments with filters: ${JSON.stringify(filter)} for user ${user.id}`);

    // 🔒 КРИТИЧНО: Фильтрация по принадлежности
    const secureFilter: PaymentFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [payments, total] = await this.paymentsDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = Math.min(filter.limit || PAYMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const totalPages = Math.ceil(total / limit);

    // 📊 Получение дополнительной статистики для админки
    const statistics = user.role !== 'mechanic' 
      ? await this.paymentsDataService.getPaymentsStatistics(secureFilter.companyId!)
      : null;

    return {
      items: this.paymentsMapperService.mapArrayToResponseDto(payments),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      
      // 📊 Статистика (если доступна)
      totalAmount: statistics?.totalAmount || 0,
      successfulPayments: statistics?.byStatus?.processed || 0,
      failedPayments: statistics?.byStatus?.failed || 0,
      refundAmount: (statistics?.byStatus?.refunded || 0) + (statistics?.byStatus?.partially_refunded || 0),
    };
  }

  /**
   * 🔒 Получение платежа по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<PaymentResponseDto> {
    this.logger.log(`Finding payment: ${id}`);

    const payment = await this.paymentsValidationService.validatePaymentExists(id);

    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  /**
   * 🔒 Обновление платежа
   */
  async update(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment: ${id}`);

    // Валидация обновления
    await this.paymentsValidationService.validateUpdateData(id, updatePaymentDto);

    // 🔥 Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Обновление через бизнес-сервис
    const updatedPayment = await this.paymentsBusinessService.updatePayment(id, updatePaymentDto, userWithCompany);

    this.logger.log(`Payment updated: ${id}`);

    return this.paymentsMapperService.mapToResponseDto(updatedPayment);
  }

  /**
   * 🔄 Возврат платежа
   */
  async refundPayment(paymentId: string, refundPaymentDto: RefundPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    // Валидация возврата
    await this.paymentsValidationService.validateRefundData(paymentId, refundPaymentDto);

    // 🔥 Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Обработка возврата через бизнес-сервис
    const refundedPayment = await this.paymentsBusinessService.processRefund(paymentId, refundPaymentDto, userWithCompany);

    this.logger.log(`Refund processed for payment: ${paymentId}, amount: ${refundPaymentDto.amount}`);

    return this.paymentsMapperService.mapToResponseDto(refundedPayment);
  }

  /**
   * 📊 Получение статистики платежей
   */
  async getStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const statistics = await this.paymentsDataService.getPaymentsStatistics(companyId!);

    return this.paymentsMapperService.mapToStatisticsDto(statistics, companyId!);
  }

  /**
   * 💰 Получение баланса компании
   */
  async getCompanyBalance(user: RequestWithUser['user']): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const balance = await this.paymentsBusinessService.calculateCompanyBalance(companyId!);

    return await this.paymentsMapperService.mapToBalanceDto(balance);
  }

  /**
   * 🚨 Обработка просроченных платежей
   */
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

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Проверка существования платежа (для других модулей)
   */
  async exists(id: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findById(id);
    return !!payment;
  }

  /**
   * 🔗 Получение базовой информации о платеже (для других модулей)
   */
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

  /**
   * 🔗 Проверка принадлежности платежа компании (для других модулей)
   */
  async belongsToCompany(paymentId: string, companyId: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findByIdForCompany(paymentId, companyId);
    return !!payment;
  }

  /**
   * 📊 Получение количества платежей компании (для проверки лимитов)
   */
  async getPaymentsCountForCompany(companyId: string): Promise<number> {
    return this.paymentsDataService.getPaymentsCountForCompany(companyId);
  }

  /**
   * 📋 Получение платежей (алиас для findAll с фильтрацией)
   */
  async getPayments(filter: PaymentFilter): Promise<PaginatedPaymentsResponseDto> {
    // Создаем пользователя из companyId для совместимости
    const mockUser = {
      id: 'system-payment-user',
      email: 'system@payment.local',
      companyId: filter.companyId,
      role: 'company_admin' as AuthRole,
    } as RequestWithUser['user'];
    
    return this.findAll(filter, mockUser);
  }

  /**
   * 🔍 Получение платежа по ID (алиас для findOne)
   */
  async getPaymentById(id: string, _user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.findOne(id);
  }

  /**
   * ✏️ Обновление платежа (алиас для update)
   */
  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.update(id, updatePaymentDto, user);
  }

  /**
   * 📊 Получение статистики (алиас для getStatistics)
   */
  async getPaymentStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    return this.getStatistics(user);
  }

  /**
   * 🗑️ Удаление платежа
   */
  async deletePayment(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Deleting payment ${id} for user ${user.id}`);

    // Валидация существования и принадлежности
    const payment = await this.paymentsValidationService.validatePaymentOwnership(id, user.companyId!);

    // Запрещаем удаление финальных/критических статусов по 402‑ФЗ
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

    // Удаление
    await this.paymentsDataService.delete(id);

    this.logger.log(`Payment ${id} deleted`);
  }
}
