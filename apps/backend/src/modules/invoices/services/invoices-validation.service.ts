// src/modules/invoices/services/invoices-validation.service.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { Injectable } from '@nestjs/common';
import { InvoicesDataService } from './invoices-data.service';
import { CreateInvoiceData, UpdateInvoiceData, UserWithCompany, InvoiceStatus } from '../types/invoices.types';
import { INVOICES_CONSTANTS } from '../constants/invoices.constants';
import { ResourceOwnershipException, ValidationDataException, CompanyNotFoundException } from '../../../common/exceptions/domain.exceptions';
import { Invoice } from '../../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRole } from '../../auth/types/auth.types'; // 🔥 ДОБАВЛЕН ИМПОРТ

@Injectable()
export class InvoicesValidationService {
  constructor(
    private readonly invoicesDataService: InvoicesDataService,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * 🔒 Валидация данных создания счета с проверкой принадлежности
   */
  async validateCreateDataForUser(data: CreateInvoiceData, user: UserWithCompany): Promise<void> {
    // 🔒 Проверка принадлежности компании
    if (user.role !== 'superadmin' && data.companyId !== user.companyId) {
      throw new ResourceOwnershipException('company', data.companyId);
    }

    // 🔒 ИСПРАВЛЕНО: Проверка прав на создание с правильными типами
    const canCreateRoles: AuthRole[] = ['owner', 'admin', 'manager'];
    if (!canCreateRoles.includes(user.role as AuthRole)) {
      throw new ValidationDataException('role', `Роль ${user.role} не может создавать счета`);
    }

    // 🔍 Валидация бизнес-данных
    await this.validateBusinessData(data);

    // 🔍 Проверка принадлежности заказа
    await this.validateOrderOwnership(data.orderId, data.companyId);
  }

  /**
   * 🔒 Валидация данных обновления
   */
  async validateUpdateData(id: string, data: UpdateInvoiceData): Promise<void> {
    // 🔍 Проверка существования счета
    const invoice = await this.validateInvoiceExists(id);

    // 🔒 Проверка возможности редактирования
    if (!INVOICES_CONSTANTS.BUSINESS_RULES.ALLOW_EDIT_PAID_INVOICES && invoice.status === InvoiceStatus.PAID) {
      throw new ValidationDataException('status', 'Нельзя редактировать оплаченный счет');
    }

    if (invoice.status === InvoiceStatus.CANCELED) {
      throw new ValidationDataException('status', 'Нельзя редактировать отмененный счет');
    }

    // 🔍 Валидация обновляемых данных
    this.validateUpdateFields(data);
  }

  /**
   * 🔒 Проверка принадлежности счета компании пользователя
   */
  async validateInvoiceOwnership(invoiceId: string, userCompanyId: string): Promise<Invoice> {
    const invoice = await this.invoicesDataService.findByIdForCompany(invoiceId, userCompanyId);
    
    if (!invoice) {
      throw new ResourceOwnershipException('invoice', invoiceId);
    }
    
    return invoice;
  }

  /**
   * 🔍 Проверка существования счета
   */
  async validateInvoiceExists(id: string): Promise<Invoice> {
    const invoice = await this.invoicesDataService.findById(id);
    
    if (!invoice) {
      throw new ValidationDataException('id', `Счет с ID ${id} не найден`);
    }
    
    return invoice;
  }

  /**
   * 🔄 ИСПРАВЛЕНО: Валидация перехода статуса
   */
  validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): void {
    const allowedTransitions = INVOICES_CONSTANTS.STATUS_TRANSITIONS[currentStatus as keyof typeof INVOICES_CONSTANTS.STATUS_TRANSITIONS];
    
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ValidationDataException(
        'status', 
        `Невозможно изменить статус с "${currentStatus}" на "${newStatus}"`
      );
    }
  }

  /**
   * ❌ Валидация возможности отмены счета
   */
  async validateInvoiceCancellation(id: string): Promise<void> {
    const invoice = await this.validateInvoiceExists(id);
    
    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ValidationDataException(
        'status', 
        `Нельзя отменить счет со статусом "${invoice.status}"`
      );
    }

    // 🔍 Проверка наличия платежей
    const paymentsCount = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.payments', 'payment')
      .where('invoice.id = :invoiceId', { invoiceId: id })
      .andWhere('payment.status = :paymentStatus', { paymentStatus: 'processed' })
      .getCount();

    if (paymentsCount > 0) {
      throw new ValidationDataException(
        'payments', 
        'Нельзя отменить счет с принятыми платежами'
      );
    }
  }

  // Остальные методы остаются без изменений...
  
  /**
   * 🎯 Валидация номера счета
   */
  async validateInvoiceNumber(invoiceNumber: string, companyId: string, excludeId?: string): Promise<void> {
    // 🔍 Проверка формата
    if (!INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN.test(invoiceNumber)) {
      throw new ValidationDataException(
        'invoiceNumber', 
        `Номер счета должен соответствовать формату ${INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN.source}`
      );
    }

    // 🔍 Проверка уникальности в рамках компании
    const query = this.invoiceRepository.createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceNumber = :invoiceNumber', { invoiceNumber });

    if (excludeId) {
      query.andWhere('invoice.id != :excludeId', { excludeId });
    }

    const existingInvoice = await query.getOne();
    
    if (existingInvoice) {
      throw new ValidationDataException(
        'invoiceNumber', 
        `Счет с номером "${invoiceNumber}" уже существует`
      );
    }
  }

  // Остальные private методы остаются без изменений...
  
  /**
   * 🔍 Валидация бизнес-данных
   */
  private async validateBusinessData(data: CreateInvoiceData): Promise<void> {
    // 💰 Валидация суммы
    if (data.amount < INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN) {
      throw new ValidationDataException(
        'amount', 
        `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}`
      );
    }

    if (data.amount > INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX) {
      throw new ValidationDataException(
        'amount', 
        `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}`
      );
    }

    // 📅 Валидация срока оплаты
    const now = new Date();
    const minDueDate = new Date();
    minDueDate.setDate(now.getDate() + INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW);
    
    const maxDueDate = new Date();
    maxDueDate.setDate(now.getDate() + INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW);

    if (data.dueDate < minDueDate) {
      throw new ValidationDataException(
        'dueDate', 
        `Срок оплаты не может быть раньше чем через ${INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW} дней`
      );
    }

    if (data.dueDate > maxDueDate) {
      throw new ValidationDataException(
        'dueDate', 
        `Срок оплаты не может быть позже чем через ${INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW} дней`
      );
    }

    // 🔍 Валидация номера счета если указан
    if (data.invoiceNumber) {
      await this.validateInvoiceNumber(data.invoiceNumber, data.companyId);
    }

    // 📝 Валидация примечаний
    if (data.notes && data.notes.length > INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException(
        'notes', 
        `Примечания не должны превышать ${INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
      );
    }
  }

  /**
   * 🔒 Проверка принадлежности заказа компании
   */
  private async validateOrderOwnership(orderId: string, companyId: string): Promise<void> {
    // Этот метод будет использовать OrdersService для проверки
    // Пока заглушка - в реальном проекте нужна интеграция с Orders модулем
    
    // const order = await this.ordersService.getOrderInfo(orderId);
    // if (!order || order.companyId !== companyId) {
    //   throw new ResourceOwnershipException('order', orderId);
    // }
  }

  /**
   * 🔍 Валидация полей обновления
   */
  private validateUpdateFields(data: UpdateInvoiceData): void {
    // 💰 Валидация суммы
    if (data.amount !== undefined) {
      if (data.amount < INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN) {
        throw new ValidationDataException(
          'amount', 
          `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}`
        );
      }

      if (data.amount > INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX) {
        throw new ValidationDataException(
          'amount', 
          `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}`
        );
      }
    }

    // 📅 Валидация срока оплаты
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      const now = new Date();
      
      if (dueDate <= now) {
        throw new ValidationDataException(
          'dueDate', 
          'Срок оплаты должен быть в будущем'
        );
      }
    }

    // 📝 Валидация примечаний
    if (data.notes && data.notes.length > INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException(
        'notes', 
        `Примечания не должны превышать ${INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
      );
    }
  }
}
