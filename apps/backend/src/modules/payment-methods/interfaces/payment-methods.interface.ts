// src/modules/payment-methods/interfaces/payment-methods.interface.ts
import { PaymentMethodsFilter, PaymentMethodStats, BulkUpdateResult, UserWithCompany, PaymentProcessingResult, IntegrationTestResult } from '../types/payment-methods.types';
import { PaymentMethod } from '../../../database/entities';
import { CreatePaymentMethodDto } from '../dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from '../dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from '../dto/response/paginated-payment-methods-response.dto';

export interface IPaymentMethodsService {
  findAllForUser(user: UserWithCompany, filter: PaymentMethodsFilter): Promise<PaginatedPaymentMethodsResponseDto>;
  findOne(id: string): Promise<PaymentMethodResponseDto>;
  createForUser(dto: CreatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto>;
  update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethodResponseDto>;
  remove(id: string): Promise<void>;
  toggleStatus(id: string): Promise<PaymentMethodResponseDto>;
  bulkUpdate(paymentMethodIds: string[], updates: UpdatePaymentMethodDto, user: UserWithCompany): Promise<BulkUpdateResult>;
  getStats(user: UserWithCompany): Promise<PaymentMethodStats>;
  testIntegration(id: string, user: UserWithCompany): Promise<IntegrationTestResult>;
}

export interface IPaymentMethodsDataService {
  findWithFilters(filter: PaymentMethodsFilter): Promise<[PaymentMethod[], number]>;
  findById(id: string): Promise<PaymentMethod | null>;
  findActiveByCompany(companyId: string): Promise<PaymentMethod[]>;
  create(dto: CreatePaymentMethodDto, companyId: string): Promise<PaymentMethod>;
  update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod>;
  remove(id: string): Promise<void>;
  toggleStatus(id: string): Promise<PaymentMethod>;
  bulkUpdate(paymentMethodIds: string[], updates: Partial<UpdatePaymentMethodDto>): Promise<number>;
  getPaymentMethodsStats(companyId: string): Promise<PaymentMethodStats>;
}

export interface IPaymentMethodsValidationService {
  validatePaymentMethodOwnership(paymentMethodId: string, companyId: string): Promise<PaymentMethod>;
  validateCreatePaymentMethodData(dto: CreatePaymentMethodDto, companyId: string): Promise<void>;
  validateUpdatePaymentMethodData(paymentMethodId: string, dto: UpdatePaymentMethodDto, companyId: string): Promise<PaymentMethod>;
  validatePaymentMethodAvailability(paymentMethodId: string, companyId: string): Promise<PaymentMethod>;
  validateBulkPaymentMethodsOwnership(paymentMethodIds: string[], companyId: string): Promise<PaymentMethod[]>;
  validateIntegrationConfig(dto: CreatePaymentMethodDto | UpdatePaymentMethodDto): Promise<void>;
}

export interface IPaymentMethodsMapperService {
  mapToResponseDto(paymentMethod: PaymentMethod): PaymentMethodResponseDto;
  mapArrayToResponseDto(paymentMethods: PaymentMethod[]): PaymentMethodResponseDto[];
  mapToPaginatedResponse(paymentMethods: PaymentMethod[], total: number, page: number, limit: number): PaginatedPaymentMethodsResponseDto;
}

export interface IPaymentProcessor {
  processPayment(paymentMethodId: string, amount: number, metadata?: any): Promise<PaymentProcessingResult>;
  processRefund(transactionId: string, amount: number): Promise<PaymentProcessingResult>;
  setupInstallments(paymentMethodId: string, amount: number, periods: number): Promise<any>;
  testConnection(paymentMethodId: string): Promise<IntegrationTestResult>;
}
