// src/modules/payments/interfaces/payments.interface.ts
import { Payment } from '../../../database/entities';
import { 
  CreatePaymentData, 
  UpdatePaymentData, 
  PaymentFilter,
  RefundData,
  UserWithCompany,
  PaymentStatistics,
  CompanyBalance 
} from '../types/payments.types';

/**
 * 🗄️ ИНТЕРФЕЙС DATA SERVICE
 */
export interface IPaymentsDataService {
  // Основные CRUD операции
  create(data: CreatePaymentData): Promise<Payment>;
  findAll(): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  findByIdForCompany(id: string, companyId: string): Promise<Payment | null>;
  findWithFilters(filter: PaymentFilter): Promise<[Payment[], number]>;
  update(id: string, data: UpdatePaymentData): Promise<Payment>;
  delete(id: string): Promise<void>;

  // Статистика и аналитика
  getPaymentsStatistics(companyId: string): Promise<PaymentStatistics>;
  getCompanyBalance(companyId: string): Promise<CompanyBalance>;
  getPaymentsCountForCompany(companyId: string): Promise<number>;

  // Специальные запросы
  findOverduePayments(companyId: string): Promise<Payment[]>;
  bulkUpdateStatus(paymentIds: string[], status: any): Promise<number>;
}

/**
 * 💼 ИНТЕРФЕЙС BUSINESS SERVICE
 */
export interface IPaymentsBusinessService {
  // Основная бизнес-логика
  recordPaymentForCompany(data: CreatePaymentData, user: UserWithCompany): Promise<Payment>;
  updatePayment(id: string, data: UpdatePaymentData, user: UserWithCompany): Promise<Payment>;
  processRefund(paymentId: string, refundData: RefundData, user: UserWithCompany): Promise<Payment>;

  // Финансовые расчеты
  calculateCompanyBalance(companyId: string): Promise<CompanyBalance>;

  // Автоматические процессы
  processOverduePayments(companyId: string): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
  }>;
}

/**
 * ✅ ИНТЕРФЕЙС VALIDATION SERVICE
 */
export interface IPaymentsValidationService {
  // Валидация создания
  validateRecordPaymentForUser(data: CreatePaymentData, user: UserWithCompany): Promise<void>;
  
  // Валидация обновления
  validateUpdateData(id: string, data: UpdatePaymentData): Promise<void>;
  
  // Валидация возврата
  validateRefundData(paymentId: string, refundData: RefundData): Promise<void>;

  // Валидация существования и принадлежности
  validatePaymentExists(id: string): Promise<Payment>;
  validatePaymentOwnership(paymentId: string, companyId: string): Promise<Payment>;

  // Валидация фильтров
  validatePaymentsFilter(filter: any): void;
}

/**
 * 🔄 ИНТЕРФЕЙС MAPPER SERVICE
 */
export interface IPaymentsMapperService {
  // Основной маппинг
  mapToResponseDto(payment: Payment): any;
  mapArrayToResponseDto(payments: Payment[]): any[];
  
  // Специализированный маппинг
  mapToPaginatedResponse(payments: Payment[], total: number, page: number, limit: number, additionalData?: any): any;
  mapToStatisticsDto(statistics: PaymentStatistics): any;
  mapToBalanceDto(balance: CompanyBalance): any;

  // Маппинг для других модулей
  mapToBasicInfo(payment: Payment): any;
  mapToExtendedInfo(payment: Payment): any;
  mapToSelectOption(payment: Payment): any;
  mapToSearchResult(payment: Payment): any;
  mapToFinancialReport(payment: Payment): any;
  mapToDashboardMetrics(payments: Payment[]): any;
}

/**
 * 🎯 ИНТЕРФЕЙС ГЛАВНОГО SERVICE (ORCHESTRATOR)
 */
export interface IPaymentsService {
  // API методы
  recordPayment(recordPaymentDto: any, user: any): Promise<any>;
  findAll(filter: PaymentFilter, user: any): Promise<any>;
  findOne(id: string): Promise<any>;
  update(id: string, updatePaymentDto: any, user: any): Promise<any>;
  refundPayment(paymentId: string, refundPaymentDto: any, user: any): Promise<any>;

  // Аналитика
  getStatistics(user: any): Promise<any>;
  getCompanyBalance(user: any): Promise<any>;
  processOverduePayments(user: any): Promise<any>;

  // Методы для других модулей
  exists(id: string): Promise<boolean>;
  getPaymentInfo(id: string): Promise<any>;
  belongsToCompany(paymentId: string, companyId: string): Promise<boolean>;
  getPaymentsCountForCompany(companyId: string): Promise<number>;
}

/**
 * 🔗 ИНТЕРФЕЙСЫ ДЛЯ ИНТЕГРАЦИИ С ДРУГИМИ МОДУЛЯМИ
 */

// Интерфейс для интеграции с Invoices
export interface IInvoiceIntegration {
  getInvoiceInfo(invoiceId: string): Promise<{
    id: string;
    invoiceNumber: string;
    companyId: string;
    status: string;
    totalAmount: number;
    remainingAmount: number;
  } | null>;
  
  belongsToCompany(invoiceId: string, companyId: string): Promise<boolean>;
  processPayment(invoiceId: string, amount: number, user: UserWithCompany): Promise<any>;
}

// Интерфейс для интеграции с PaymentMethods
export interface IPaymentMethodIntegration {
  getPaymentMethodForPayment(paymentMethodId: string, companyId: string): Promise<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
  }>;
  
  existsInCompany(paymentMethodId: string, companyId: string): Promise<boolean>;
  
  calculateProcessingFee(paymentMethodId: string, amount: number, companyId: string): Promise<{
    amount: number;
    fee: number;
    totalAmount: number;
    feePercentage: number;
  }>;
}

// Интерфейс для интеграции с Subscriptions
export interface ISubscriptionIntegration {
  checkOrderLimit(companyId: string, currentCount: number, increment?: number): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number | null;
    limitType: string;
  }>;
}

/**
 * 🌐 ИНТЕРФЕЙСЫ ДЛЯ GATEWAY ИНТЕГРАЦИИ
 */

// Базовый интерфейс платежного шлюза
export interface IPaymentGateway {
  processPayment(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
  refundPayment(data: RefundGatewayRequest): Promise<PaymentGatewayResponse>;
  getTransactionStatus(transactionId: string): Promise<PaymentGatewayStatus>;
  validateWebhook(data: any, signature: string): boolean;
}

// Данные для запроса к шлюзу
export interface PaymentGatewayRequest {
  amount: number;
  currency: string;
  description: string;
  paymentMethodId: string;
  customerId?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  webhookUrl?: string;
}

// Ответ от платежного шлюза
export interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  status: string;
  amount: number;
  currency: string;
  fee?: number;
  paymentUrl?: string;
  qrCode?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  gatewayResponse?: Record<string, any>;
  timestamp: Date;
}

// Данные для возврата через шлюз
export interface RefundGatewayRequest {
  originalTransactionId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}

// Статус транзакции в шлюзе
export interface PaymentGatewayStatus {
  transactionId: string;
  gatewayTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 📊 ИНТЕРФЕЙСЫ ДЛЯ ОТЧЕТНОСТИ
 */

// Интерфейс для генерации отчетов
export interface IPaymentReportsService {
  generateDailyReport(companyId: string, date: Date): Promise<DailyPaymentReport>;
  generateMonthlyReport(companyId: string, year: number, month: number): Promise<MonthlyPaymentReport>;
  generateCustomReport(companyId: string, filter: PaymentReportFilter): Promise<CustomPaymentReport>;
  exportToExcel(companyId: string, filter: PaymentReportFilter): Promise<Buffer>;
  exportToPdf(companyId: string, filter: PaymentReportFilter): Promise<Buffer>;
}

// Фильтр для отчетов
export interface PaymentReportFilter {
  dateFrom: Date;
  dateTo: Date;
  paymentMethods?: string[];
  statuses?: string[];
  currencies?: string[];
  includeRefunds?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'payment_method' | 'currency';
}

// Дневной отчет
export interface DailyPaymentReport {
  date: Date;
  companyId: string;
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  refundAmount: number;
  byPaymentMethod: Record<string, { count: number; amount: number }>;
  byCurrency: Record<string, { count: number; amount: number }>;
  hourlyDistribution: Array<{ hour: number; count: number; amount: number }>;
}

// Месячный отчет
export interface MonthlyPaymentReport {
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalPayments: number;
    totalAmount: number;
    avgDailyAmount: number;
    successRate: number;
    refundRate: number;
    topPaymentMethod: string;
    topCurrency: string;
  };
  dailyBreakdown: DailyPaymentReport[];
  trends: {
    weekOverWeekGrowth: number;
    monthOverMonthGrowth: number;
  };
}

// Кастомный отчет
export interface CustomPaymentReport {
  companyId: string;
  filter: PaymentReportFilter;
  generatedAt: Date;
  summary: {
    totalPayments: number;
    totalAmount: number;
    uniqueInvoices: number;
    uniqueCustomers: number;
    avgPaymentAmount: number;
    successRate: number;
  };
  breakdown: Array<{
    period: string;
    count: number;
    amount: number;
    successRate: number;
  }>;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  topCurrencies: Array<{
    currency: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

/**
 * 🔔 ИНТЕРФЕЙСЫ ДЛЯ УВЕДОМЛЕНИЙ
 */

// Интерфейс для уведомлений о платежах
export interface IPaymentNotificationsService {
  sendPaymentConfirmation(paymentId: string): Promise<void>;
  sendRefundNotification(paymentId: string, refundAmount: number): Promise<void>;
  sendOverduePaymentAlert(companyId: string, overduePayments: Payment[]): Promise<void>;
  sendDailyPaymentSummary(companyId: string): Promise<void>;
  sendLowBalanceAlert(companyId: string, currentBalance: number): Promise<void>;
}

// Данные для уведомления
export interface PaymentNotificationData {
  type: 'payment_received' | 'payment_failed' | 'refund_processed' | 'payment_overdue' | 'balance_low';
  paymentId?: string;
  companyId: string;
  amount?: number;
  currency?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sendAt?: Date;
}
