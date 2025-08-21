// src/modules/invoices/services/invoices-business.service.ts (✅ ПОЛНОСТЬЮ ИСПРАВЛЕН)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, Order, Payment } from '../../../database/entities';
import { InvoicesDataService } from './invoices-data.service';
import { CreateInvoiceData, UpdateInvoiceData, InvoiceStatus, UserWithCompany, InvoiceCalculationResult } from '../types/invoices.types';
import { INVOICES_CONSTANTS } from '../constants/invoices.constants';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { PaymentStatus } from '../../payments/types/payments.types';

@Injectable()
export class InvoicesBusinessService {
  private readonly logger = new Logger(InvoicesBusinessService.name);

  constructor(
    private readonly invoicesDataService: InvoicesDataService,
    private readonly auditService: AuditService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * 🎯 Создание счета для компании с полной business логикой
   */
  async createInvoiceForCompany(data: CreateInvoiceData, companyId: string, user: UserWithCompany): Promise<Invoice> {
    this.logger.log(`Creating invoice for company ${companyId} from order ${data.orderId}`);

    // 🔒 ✅ ИСПРАВЛЕНИЕ 2: Используем checkOrderLimit (метод checkInvoiceLimit не существует)
    const currentCount = await this.invoicesDataService.getInvoicesCountForCompany(companyId);
    const limitCheck = await this.subscriptionLimitsService.checkOrderLimit(companyId, currentCount, 1);
    this.logger.debug('Using checkOrderLimit for invoice limits - consider implementing dedicated checkInvoiceLimit');
    
    if (!limitCheck.allowed) {
      throw new Error(`Превышен лимит счетов: ${currentCount}/${limitCheck.limit}`);
    }

    // 🧮 Автоматические расчеты
    const calculatedData = await this.calculateInvoiceAmounts(data);

    // 📋 Генерация номера счета если не указан
    if (!calculatedData.invoiceNumber) {
      calculatedData.invoiceNumber = await this.invoicesDataService.generateInvoiceNumber(companyId);
    }

    // 📅 Установка срока платежа если не указан
    if (!calculatedData.issueDate) {
      calculatedData.issueDate = new Date();
    }

    // 💾 Создание счета
    const invoice = await this.invoicesDataService.create({
      ...calculatedData,
      companyId,
    });

    // 📊 Audit логирование
    await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.CREATED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'invoice',
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        orderId: data.orderId,
        amount: invoice.totalAmount,
      },
    });

    this.logger.log(`Invoice created: ${invoice.invoiceNumber} for ${invoice.totalAmount} ₽`);

    return invoice;
  }

  /**
   * 🎯 Создание счета из заказа (smart generation)
   */
  async createInvoiceFromOrder(orderId: string, companyId: string, user: UserWithCompany, options?: {
    paymentTermsDays?: number;
    discountPercent?: number;
    notes?: string;
  }): Promise<Invoice> {
    this.logger.log(`Creating invoice from order ${orderId} for company ${companyId}`);

    // 🔍 Получение заказа через OrderRepository напрямую
    const order = await this.orderRepository.findOne({
      where: { id: orderId, companyId },
      relations: ['orderServices', 'orderParts', 'customer', 'vehicle'],
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found for company ${companyId}`);
    }

    // Проверка статуса заказа
    if (order.status !== 'completed') { // TODO: Использовать OrderStatus.COMPLETED когда будет доступен
      throw new Error(`Cannot create invoice for order ${order.orderNumber} - order must be completed first`);
    }

    // 🔍 Проверка что счет еще не создан
    const existingInvoice = await this.invoicesDataService.findByOrderIdForCompany(orderId, companyId);
    if (existingInvoice) {
      throw new Error(`Invoice ${existingInvoice.invoiceNumber} already exists for order ${order.orderNumber}`);
    }

    // 💰 Интеллектуальный расчет сумм из заказа
    let amount = parseFloat(order.totalAmount.toString());
    
    // Применение скидки
    if (options?.discountPercent && options.discountPercent > 0) {
      const discountAmount = (amount * options.discountPercent) / 100;
      amount = amount - discountAmount;
    }

    // 📅 Расчет срока оплаты
    const paymentTermsDays = options?.paymentTermsDays || INVOICES_CONSTANTS.DEFAULTS.PAYMENT_TERMS_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    // 🎯 Создание данных счета с умными примечаниями
    const smartNotes = options?.notes || this.generateSmartNotes(order, options);

    const invoiceData: CreateInvoiceData = {
      companyId,
      orderId,
      amount,
      dueDate,
      notes: smartNotes,
    };

    // 🎯 Создание счета
    const invoice = await this.createInvoiceForCompany(invoiceData, companyId, user);

    // 📊 Дополнительный audit
    await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.AUTO_GENERATED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'invoice',
      entityId: invoice.id,
      details: {
        generatedFromOrder: order.orderNumber,
        originalAmount: parseFloat(order.totalAmount.toString()),
        finalAmount: invoice.totalAmount,
        discountApplied: options?.discountPercent || 0,
        paymentTerms: paymentTermsDays,
        autoGenerated: true,
      },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} auto-generated from order ${order.orderNumber}`);

    return invoice;
  }

  /**
   * ✏️ Обновление счета с business логикой
   */
  async updateInvoice(id: string, data: UpdateInvoiceData, user: UserWithCompany): Promise<Invoice> {
    this.logger.log(`Updating invoice ${id}`);

    // 🧮 Пересчет сумм если изменились базовые данные
    let updateData = { ...data };
    if (data.amount !== undefined || data.taxAmount !== undefined) {
      const calculationResult = this.calculateAmountsFromData({
        amount: data.amount || 0,
        taxAmount: data.taxAmount,
      });
      updateData = { ...updateData, ...calculationResult };
    }

    const updatedInvoice = await this.invoicesDataService.update(id, updateData);

    // 📊 Audit логирование
    await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.UPDATED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'invoice',
      entityId: id,
      details: {
        updatedFields: Object.keys(data),
        changes: data,
      },
    });

    this.logger.log(`Invoice ${updatedInvoice.invoiceNumber} updated`);

    return updatedInvoice;
  }

  /**
   * 🔄 Изменение статуса счета с бизнес-логикой
   */
  async changeInvoiceStatus(id: string, newStatus: InvoiceStatus, user: UserWithCompany): Promise<Invoice> {
    this.logger.log(`Changing invoice ${id} status to ${newStatus}`);

    const invoice = await this.invoicesDataService.findById(id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }

    // 🔒 Проверка возможности изменения статуса
    const allowedTransitions = INVOICES_CONSTANTS.STATUS_TRANSITIONS[invoice.status as keyof typeof INVOICES_CONSTANTS.STATUS_TRANSITIONS];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new Error(`Cannot change invoice status from ${invoice.status} to ${newStatus}`);
    }

    // 🎯 Изменение статуса
    const updatedInvoice = await this.invoicesDataService.update(id, { status: newStatus });

    // 📊 Audit логирование
    await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.STATUS_CHANGED, {
      userId: user.id,
      companyId: user.companyId,
      entityType: 'invoice',
      entityId: id,
      details: {
        fromStatus: invoice.status,
        toStatus: newStatus,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    this.logger.log(`Invoice ${updatedInvoice.invoiceNumber} status changed: ${invoice.status} → ${newStatus}`);

    return updatedInvoice;
  }

  /**
   * ❌ Отмена счета
   */
  async cancelInvoice(id: string, user: UserWithCompany): Promise<Invoice> {
    this.logger.log(`Canceling invoice ${id}`);

    const invoice = await this.invoicesDataService.findById(id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new Error(`Cannot cancel invoice ${invoice.invoiceNumber} - current status: ${invoice.status}`);
    }

    // 🔍 ✅ ИСПРАВЛЕНИЕ 3: Используем PaymentStatus.PROCESSED вместо строки
    const payments = await this.paymentRepository.find({
      where: { 
        invoiceId: id, 
        status: PaymentStatus.PROCESSED
      },
    });

    if (payments.length > 0) {
      throw new Error(`Cannot cancel invoice ${invoice.invoiceNumber} - payments have been received`);
    }

    return this.changeInvoiceStatus(id, InvoiceStatus.CANCELED, user);
  }

  /**
   * 💰 Обработка получения платежа
   */
  async processPaymentReceived(invoiceId: string, paymentAmount: number, user: UserWithCompany): Promise<Invoice> {
    this.logger.log(`Processing payment ${paymentAmount} for invoice ${invoiceId}`);

    const invoice = await this.invoicesDataService.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new Error(`Cannot process payment for invoice ${invoice.invoiceNumber} - status: ${invoice.status}`);
    }

    // 🧮 ✅ ИСПРАВЛЕНИЕ 4: Используем PaymentStatus.PROCESSED вместо строки
    const currentPayments = await this.paymentRepository.find({
      where: { 
        invoiceId, 
        status: PaymentStatus.PROCESSED
      },
    });

    const totalPaid = currentPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount.toString()), 0) + paymentAmount;

    const invoiceTotal = parseFloat(invoice.totalAmount.toString());

    // 🎯 Автоматическое изменение статуса если оплачен полностью
    if (INVOICES_CONSTANTS.BUSINESS_RULES.AUTO_MARK_PAID_ON_FULL_PAYMENT && totalPaid >= invoiceTotal) {
      await this.changeInvoiceStatus(invoiceId, InvoiceStatus.PAID, user);
      
      // 📊 Дополнительный audit
      await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.PAID, {
        userId: user.id,
        companyId: user.companyId,
        entityType: 'invoice',
        entityId: invoiceId,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoiceTotal,
          totalPaid,
          lastPaymentAmount: paymentAmount,
        },
      });
    }

    return this.invoicesDataService.findById(invoiceId)!;
  }

  /**
   * 🔍 Получение просроченных счетов с уведомлениями
   */
  async processOverdueInvoices(companyId: string): Promise<{
    overdue: Invoice[];
    warnings: Invoice[];
    processed: number;
  }> {
    this.logger.log(`Processing overdue invoices for company ${companyId}`);

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(now.getDate() + INVOICES_CONSTANTS.BUSINESS_RULES.OVERDUE_WARNING_DAYS);

    // 🔍 Просроченные счета
    const overdueInvoices = await this.invoicesDataService.findOverdueInvoices(companyId);
    
    // 🔍 Счета близкие к просрочке
    const warningInvoices = await this.invoicesDataService.findWithFilters({
      companyId,
      status: InvoiceStatus.ISSUED,
      dueDateFrom: now,
      dueDateTo: warningDate,
    });

    let processed = 0;

    // 🚨 Обработка просроченных счетов
    for (const invoice of overdueInvoices) {
      const daysPastDue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      
      // 📊 Логирование просрочки
      await this.auditService.log(INVOICES_CONSTANTS.AUDIT_ACTIONS.OVERDUE_DETECTED, {
        userId: 'system',
        companyId,
        entityType: 'invoice',
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate,
          daysPastDue,
          amount: invoice.totalAmount,
        },
      });

      // 🔄 Автоотмена после критического срока
      if (INVOICES_CONSTANTS.BUSINESS_RULES.AUTO_CANCEL_OVERDUE_DAYS > 0 && 
          daysPastDue >= INVOICES_CONSTANTS.BUSINESS_RULES.AUTO_CANCEL_OVERDUE_DAYS) {
        try {
          await this.invoicesDataService.update(invoice.id, { status: InvoiceStatus.CANCELED });
          this.logger.warn(`Auto-canceled invoice ${invoice.invoiceNumber} after ${daysPastDue} days overdue`);
        } catch (error) {
          this.logger.error(`Failed to auto-cancel invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      processed++;
    }

    return {
      overdue: overdueInvoices,
      warnings: warningInvoices[0] || [],
      processed,
    };
  }

  // ========== PRIVATE METHODS ==========

  /**
   * 🧮 Автоматический расчет сумм счета
   */
  private async calculateInvoiceAmounts(data: CreateInvoiceData): Promise<CreateInvoiceData> {
    const result: InvoiceCalculationResult = this.calculateAmountsFromData({
      amount: data.amount,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
    });

    return {
      ...data,
      ...result,
    };
  }

  /**
   * 🧮 Расчет сумм на основе данных
   */
  private calculateAmountsFromData(data: {
    amount: number;
    taxAmount?: number;
    totalAmount?: number;
  }): InvoiceCalculationResult {
    const amount = data.amount;
    
    // Расчет налога если не указан
    const taxAmount = data.taxAmount !== undefined 
      ? data.taxAmount 
      : amount * INVOICES_CONSTANTS.DEFAULTS.TAX_RATE;
    
    // Расчет общей суммы если не указана
    const totalAmount = data.totalAmount !== undefined 
      ? data.totalAmount 
      : amount + taxAmount;

    // Расчет процента налога
    const taxPercentage = amount > 0 ? (taxAmount / amount) * 100 : 0;

    return {
      amount,
      taxAmount: Math.round(taxAmount * 100) / 100, // Округление до копеек
      totalAmount: Math.round(totalAmount * 100) / 100,
      taxPercentage: Math.round(taxPercentage * 100) / 100,
    };
  }

  /**
   * 🤖 Генерация умных примечаний для автосчетов
   */
  private generateSmartNotes(order: any, options?: { discountPercent?: number }): string {
    let notes = `Счет за выполненные работы по заказу ${order.orderNumber}`;
    
    // Добавляем информацию о скидке
    if (options?.discountPercent && options.discountPercent > 0) {
      notes += `. Применена скидка ${options.discountPercent}%`;
    }
    
    // Добавляем информацию о клиенте если есть
    if (order.customer) {
      const customerName = order.customer.companyName || 
        `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim();
      if (customerName) {
        notes += `. Клиент: ${customerName}`;
      }
    }
    
    // Добавляем информацию об автомобиле если есть
    if (order.vehicle) {
      const vehicleInfo = `${order.vehicle.licensePlate || 'б/н'}`;
      notes += `. ТС: ${vehicleInfo}`;
    }
    
    return notes;
  }
}
