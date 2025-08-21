// src/modules/payments/interfaces/payments.interface.ts
import { EntityManager } from 'typeorm';
import { Payment } from '../../../database/entities';
import {
  CompanyBalance,
  CreatePaymentData,
  PaymentFilter,
  PaymentStatistics,
  RefundData,
  UpdatePaymentData,
  UserWithCompany,
} from '../types/payments.types';

export interface IPaymentsDataService {
  create(data: CreatePaymentData): Promise<Payment>;
  findAll(): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  findByIdForCompany(id: string, companyId: string): Promise<Payment | null>;
  findWithFilters(filter: PaymentFilter): Promise<[Payment[], number]>;
  update(id: string, data: UpdatePaymentData): Promise<Payment>;
  delete(id: string): Promise<void>;

  // Транзакционные (добавлены)
  createWithTransaction(data: CreatePaymentData, manager: EntityManager): Promise<Payment>;
  findByIdWithTransaction(id: string, manager: EntityManager): Promise<Payment | null>;
  updateWithTransaction(id: string, data: UpdatePaymentData, manager: EntityManager): Promise<Payment>;

  // Аналитика
  getPaymentsStatistics(companyId: string): Promise<PaymentStatistics>;
  getCompanyBalance(companyId: string): Promise<CompanyBalance>;
  getPaymentsCountForCompany(companyId: string): Promise<number>;

  // Спец-запросы
  findOverduePayments(companyId: string): Promise<Payment[]>;
  bulkUpdateStatus(paymentIds: string[], status: any): Promise<number>;
}

export interface IPaymentsBusinessService {
  recordPaymentForCompany(data: CreatePaymentData, user: UserWithCompany): Promise<Payment>;
  updatePayment(id: string, data: UpdatePaymentData, user: UserWithCompany): Promise<Payment>;
  processRefund(paymentId: string, refundData: RefundData, user: UserWithCompany): Promise<Payment>;
  calculateCompanyBalance(companyId: string): Promise<CompanyBalance>;
  processOverduePayments(companyId: string): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
  }>;
}

export interface IPaymentsValidationService {
  validateRecordPaymentForUser(data: CreatePaymentData, user: UserWithCompany): Promise<void>;
  validateUpdateData(id: string, data: UpdatePaymentData): Promise<void>;
  validateRefundData(paymentId: string, refundData: RefundData): Promise<void>;
  validatePaymentExists(id: string): Promise<Payment>;
  validatePaymentOwnership(paymentId: string, companyId: string): Promise<Payment>;
  validatePaymentsFilter(filter: any): void;
}

export interface IPaymentsMapperService {
  mapToResponseDto(payment: Payment): any;
  mapArrayToResponseDto(payments: Payment[]): any[];
  mapToPaginatedResponse(
    payments: Payment[],
    total: number,
    page: number,
    limit: number,
    additionalData?: any,
  ): any;
  mapToStatisticsDto(statistics: PaymentStatistics, companyId: string): any; // обновлено
  mapToBalanceDto(balance: CompanyBalance): any;
  mapToBasicInfo(payment: Payment): any;
  mapToExtendedInfo(payment: Payment): any;
}

export interface IPaymentsService {
  recordPayment(recordPaymentDto: any, user: any): Promise<any>;
  getPayments(filter: PaymentFilter): Promise<any>;
  getPaymentById(id: string, user: any): Promise<any>;
  updatePayment(id: string, updatePaymentDto: any, user: any): Promise<any>;
  refundPayment(paymentId: string, refundPaymentDto: any, user: any): Promise<any>;
  getPaymentStatistics(user: any): Promise<any>;
  getCompanyBalance(user: any): Promise<any>;
  processOverduePayments(user: any): Promise<any>;
}
