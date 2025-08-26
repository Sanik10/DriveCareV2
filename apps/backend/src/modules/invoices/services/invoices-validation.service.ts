// path: apps/backend/src/modules/invoices/services/invoices-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InvoicesDataService } from './invoices-data.service';
import { CreateInvoiceData, UpdateInvoiceData, UserWithCompany, InvoiceStatus } from '../types/invoices.types';
import { INVOICES_CONSTANTS } from '../constants/invoices.constants';
import { ResourceOwnershipException, ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { Invoice } from '../../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRole } from '../../auth/types/auth.types';
import { PaymentStatus } from '../../payments/types/payments.types';
import { InvoiceFiscalizationStatus } from '../../../database/entities/invoice.entity';

@Injectable()
export class InvoicesValidationService {
  constructor(
    private readonly invoicesDataService: InvoicesDataService,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async validateCreateDataForUser(data: CreateInvoiceData, user: UserWithCompany): Promise<void> {
    if (user.role !== 'superadmin' && data.companyId !== user.companyId) {
      throw new ResourceOwnershipException('company', data.companyId);
    }

    const canCreate: AuthRole[] = ['company_owner', 'company_admin', 'manager'];
    if (!canCreate.includes(user.role as AuthRole)) {
      throw new ValidationDataException('role', `Роль ${user.role} не может создавать счета`);
    }

    await this.validateBusinessData(data);
    await this.validateOrderOwnership(data.orderId, data.companyId);
  }

  async validateUpdateDataForUser(id: string, data: UpdateInvoiceData, user: UserWithCompany): Promise<void> {
    const invoice = await this.validateInvoiceExists(id);

    if (user.role !== 'superadmin' && invoice.companyId !== user.companyId) {
      throw new ResourceOwnershipException('invoice', id);
    }

    const canUpdate: AuthRole[] = ['company_owner', 'company_admin', 'manager'];
    if (!canUpdate.includes(user.role as AuthRole)) {
      throw new ValidationDataException('role', `Роль ${user.role} не может редактировать счета`);
    }

    if (!INVOICES_CONSTANTS.BUSINESS_RULES.ALLOW_EDIT_PAID_INVOICES && invoice.status === InvoiceStatus.PAID) {
      throw new ValidationDataException('status', 'Нельзя редактировать оплаченный счет');
    }

    if (invoice.status === InvoiceStatus.CANCELED) {
      throw new ValidationDataException('status', 'Нельзя редактировать отмененный счет');
    }

    // 402-ФЗ/54-ФЗ: запрет изменения первичных реквизитов после получения платежей или фискализации
    const hasProcessed = await this.hasProcessedPayments(id);
    const fiscalized = invoice.fiscalizationStatus === InvoiceFiscalizationStatus.DONE;

    if (hasProcessed || fiscalized) {
      // Используем строковые ключи с безопасной проверкой, чтобы не зависеть от точной формы UpdateInvoiceData
      const restrictedFields = [
        'amount',
        'taxAmount',
        'totalAmount',
        'dueDate',
        'issueDate',
        'invoiceNumber',
        'orderId',
        'companyId',
      ] as const;

      const touchedRestricted = restrictedFields.some((f) => (data as any)[f] !== undefined);

      if (touchedRestricted) {
        throw new ValidationDataException(
          'update',
          'Нельзя изменять первичные реквизиты счета после получения платежей/фискализации. Разрешены только безопасные поля (например, notes).',
        );
      }
    }

    this.validateUpdateFields(data);
  }

  async validateStatusChangeForUser(id: string, newStatus: InvoiceStatus, user: UserWithCompany): Promise<Invoice> {
    const invoice = await this.validateInvoiceExists(id);

    if (user.role !== 'superadmin' && invoice.companyId !== user.companyId) {
      throw new ResourceOwnershipException('invoice', id);
    }

    const canChange: AuthRole[] = ['company_owner', 'company_admin', 'manager', 'superadmin' as AuthRole];
    if (!canChange.includes(user.role as AuthRole)) {
      throw new ValidationDataException('role', `Роль ${user.role} не может изменять статус счетов`);
    }

    // 54-ФЗ/402-ФЗ: нельзя отменить счет при наличии принятых платежей
    if (newStatus === InvoiceStatus.CANCELED) {
      const hasProcessed = await this.hasProcessedPayments(id);
      if (hasProcessed) {
        throw new ValidationDataException('status', 'Нельзя отменить счет с принятыми платежами');
      }
    }

    this.validateStatusTransition(invoice.status, newStatus);
    return invoice;
  }

  async validateInvoiceOwnership(invoiceId: string, userCompanyId: string): Promise<Invoice> {
    const invoice = await this.invoicesDataService.findByIdForCompany(invoiceId, userCompanyId);
    if (!invoice) {
      throw new ResourceOwnershipException('invoice', invoiceId);
    }
    return invoice;
  }

  async validateInvoiceExists(id: string): Promise<Invoice> {
    const invoice = await this.invoicesDataService.findById(id);
    if (!invoice) {
      throw new ValidationDataException('id', `Счет с ID ${id} не найден`);
    }
    return invoice;
  }

  validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): void {
    const allowed = INVOICES_CONSTANTS.STATUS_TRANSITIONS[currentStatus as keyof typeof INVOICES_CONSTANTS.STATUS_TRANSITIONS];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new ValidationDataException('status', `Невозможно изменить статус с "${currentStatus}" на "${newStatus}"`);
    }
  }

  async validateInvoiceCancellationForUser(id: string, user: UserWithCompany): Promise<void> {
    const invoice = await this.validateInvoiceExists(id);

    if (user.role !== 'superadmin' && invoice.companyId !== user.companyId) {
      throw new ResourceOwnershipException('invoice', id);
    }

    const canCancel: AuthRole[] = ['company_owner', 'company_admin', 'manager', 'superadmin' as AuthRole];
    if (!canCancel.includes(user.role as AuthRole)) {
      throw new ValidationDataException('role', `Роль ${user.role} не может отменять счета`);
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ValidationDataException('status', `Нельзя отменить счет со статусом "${invoice.status}"`);
    }

    const paymentsCount = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.payments', 'payment')
      .where('invoice.id = :invoiceId', { invoiceId: id })
      .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
      .getCount();

    if (paymentsCount > 0) {
      throw new ValidationDataException('payments', 'Нельзя отменить счет с принятыми платежами');
    }
  }

  private async validateBusinessData(data: CreateInvoiceData): Promise<void> {
    if (data.amount < INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN) {
      throw new ValidationDataException('amount', `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}`);
    }
    if (data.amount > INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX) {
      throw new ValidationDataException('amount', `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}`);
    }

    const now = new Date();
    const minDue = new Date();
    minDue.setDate(now.getDate() + INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW);
    const maxDue = new Date();
    maxDue.setDate(now.getDate() + INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW);

    if (data.dueDate < minDue) {
      throw new ValidationDataException('dueDate', `Срок оплаты раньше допустимого`);
    }
    if (data.dueDate > maxDue) {
      throw new ValidationDataException('dueDate', `Срок оплаты позже допустимого`);
    }

    if (data.invoiceNumber) {
      await this.validateInvoiceNumber(data.invoiceNumber, data.companyId);
    }

    if (data.notes) {
      this.validateNotesForXSS(data.notes);
    }
  }

  private validateNotesForXSS(notes: string): void {
    const danger = [/<script/i, /javascript:/i, /onclick/i, /onerror/i, /onload/i, /<iframe/i, /<object/i, /<embed/i];
    if (danger.some((p) => p.test(notes))) {
      throw new ValidationDataException('notes', 'Примечания содержат недопустимые символы или код');
    }
    if (notes.length > INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH) {
      throw new ValidationDataException('notes', `Примечания не должны превышать ${INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`);
    }
    if (!INVOICES_CONSTANTS.VALIDATION.NOTES.SAFE_PATTERN.test(notes)) {
      throw new ValidationDataException('notes', 'Примечания содержат недопустимые символы');
    }
  }

  private async validateOrderOwnership(_orderId: string, _companyId: string): Promise<void> {
    // При необходимости включим реальную проверку через OrdersService/Repository
    return;
  }

  private validateUpdateFields(data: UpdateInvoiceData): void {
    if (data.amount !== undefined) {
      if (data.amount < INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN) {
        throw new ValidationDataException('amount', `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}`);
      }
      if (data.amount > INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX) {
        throw new ValidationDataException('amount', `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}`);
      }
    }

    if (data.dueDate) {
      const due = new Date(data.dueDate);
      const now = new Date();
      if (due <= now) {
        throw new ValidationDataException('dueDate', 'Срок оплаты должен быть в будущем');
      }
    }

    if (data.notes) {
      this.validateNotesForXSS(data.notes);
    }
  }

  async validateInvoiceNumber(invoiceNumber: string, companyId: string, excludeId?: string): Promise<void> {
    if (/<script|javascript:|onclick|onerror/i.test(invoiceNumber)) {
      throw new ValidationDataException('invoiceNumber', 'Номер счета содержит недопустимые символы');
    }
    if (!INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN.test(invoiceNumber)) {
      throw new ValidationDataException('invoiceNumber', 'Номер счета должен соответствовать формату INV-YYYY-NNNNN');
    }

    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceNumber = :invoiceNumber', { invoiceNumber });

    if (excludeId) qb.andWhere('invoice.id != :excludeId', { excludeId });

    const exists = await qb.getOne();
    if (exists) {
      throw new ValidationDataException('invoiceNumber', `Счет с номером "${invoiceNumber}" уже существует`);
    }
  }

  private async hasProcessedPayments(invoiceId: string): Promise<boolean> {
    const count = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.payments', 'payment')
      .where('invoice.id = :invoiceId', { invoiceId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PROCESSED })
      .getCount();

    return count > 0;
  }
}
