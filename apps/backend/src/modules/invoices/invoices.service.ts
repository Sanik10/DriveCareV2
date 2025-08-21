// src/modules/invoices/invoices.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InvoicesDataService } from './services/invoices-data.service';
import { InvoicesBusinessService } from './services/invoices-business.service';
import { InvoicesValidationService } from './services/invoices-validation.service';
import { InvoicesMapperService } from './services/invoices-mapper.service';
import { CreateInvoiceDto, CreateInvoiceFromOrderDto } from './dto/request/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/request/update-invoice.dto';
import { InvoiceResponseDto } from './dto/response/invoice-response.dto';
import { PaginatedInvoicesResponseDto } from './dto/response/paginated-invoices-response.dto';
import {
  InvoiceFilter,
  InvoiceStatus,
  CreateInvoiceData,
  UserWithCompany,
  InvoiceStatistics,
  OverdueInvoicesReport,
} from './types/invoices.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { INVOICES_CONSTANTS } from './constants/invoices.constants';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesDataService: InvoicesDataService,
    private readonly invoicesBusinessService: InvoicesBusinessService,
    private readonly invoicesValidationService: InvoicesValidationService,
    private readonly invoicesMapperService: InvoicesMapperService,
  ) {}

  async createForUser(dto: CreateInvoiceDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Creating invoice for user ${user.id} in company ${user.companyId}`);

    const createData: CreateInvoiceData = {
      ...dto,
      companyId: dto.companyId || user.companyId!,
      dueDate: new Date(dto.dueDate),
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
    };

    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    await this.invoicesValidationService.validateCreateDataForUser(createData, userWithCompany);

    const invoice = await this.invoicesBusinessService.createInvoiceForCompany(createData, user.companyId!, userWithCompany);

    return this.invoicesMapperService.mapToResponseDto(invoice, this.effectiveRole(user.role));
  }

  async createFromOrder(dto: CreateInvoiceFromOrderDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Creating invoice from order ${dto.orderId} for user ${user.id}`);

    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const invoice = await this.invoicesBusinessService.createInvoiceFromOrder(
      dto.orderId,
      user.companyId!,
      userWithCompany,
      {
        paymentTermsDays: dto.paymentTermsDays,
        discountPercent: dto.discountPercent,
        notes: dto.notes,
      },
    );

    return this.invoicesMapperService.mapToResponseDto(invoice, this.effectiveRole(user.role));
  }

  async findAll(filter: InvoiceFilter = {}, user: RequestWithUser['user']): Promise<PaginatedInvoicesResponseDto> {
    this.logger.log(`Finding invoices with filters: ${JSON.stringify(filter)} for user ${user.id}`);

    const secureFilter: InvoiceFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [invoices, total] = await this.invoicesDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = Math.min(filter.limit || INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE, INVOICES_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const totalPages = Math.ceil(total / limit);

    const statistics =
      user.role !== 'mechanic' ? await this.invoicesDataService.getInvoicesStatistics(secureFilter.companyId!) : null;

    const items = this.invoicesMapperService.mapArrayToResponseDto(invoices, this.effectiveRole(user.role));

    const response: PaginatedInvoicesResponseDto = {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalAmount: statistics?.totalAmount || 0,
      paidAmount: statistics?.paidAmount || 0,
      pendingAmount: statistics?.pendingAmount || 0,
      overdueCount: statistics?.overdueCount || 0,
      averageAmount: statistics ? Math.round((statistics.totalAmount / (statistics.total || 1)) * 100) / 100 : 0,
      overduePercentage: statistics ? Math.round(((statistics.overdueCount / (statistics.total || 1)) * 100) * 100) / 100 : 0,
    };

    return plainToInstance(PaginatedInvoicesResponseDto, response, { groups: [this.effectiveRole(user.role)] });
  }

  async findOne(id: string, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    const invoice = await this.invoicesValidationService.validateInvoiceExists(id);
    if (user.role !== 'superadmin' && invoice.companyId !== user.companyId) {
      throw new Error('Access denied: Invoice belongs to different company');
    }
    return this.invoicesMapperService.mapToResponseDto(invoice, this.effectiveRole(user.role));
  }

  async update(id: string, dto: UpdateInvoiceDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Updating invoice: ${id}`);

    const updateData = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    await this.invoicesValidationService.validateUpdateDataForUser(id, updateData, userWithCompany);

    const updated = await this.invoicesBusinessService.updateInvoice(id, updateData, userWithCompany);

    return this.invoicesMapperService.mapToResponseDto(updated, this.effectiveRole(user.role));
  }

  async updateStatus(id: string, status: InvoiceStatus, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Updating invoice status: ${id} → ${status}`);

    const invoice = await this.invoicesValidationService.validateInvoiceExists(id);
    this.invoicesValidationService.validateStatusTransition(invoice.status as InvoiceStatus, status);

    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const updated = await this.invoicesBusinessService.changeInvoiceStatus(id, status, userWithCompany);

    return this.invoicesMapperService.mapToResponseDto(updated, this.effectiveRole(user.role));
  }

  async cancel(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Canceling invoice: ${id}`);

    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    await this.invoicesValidationService.validateInvoiceCancellationForUser(id, userWithCompany);
    await this.invoicesBusinessService.cancelInvoice(id, userWithCompany);
  }

  async processPayment(invoiceId: string, paymentAmount: number, user: UserWithCompany): Promise<InvoiceResponseDto> {
    this.logger.log(`Processing payment ${paymentAmount} for invoice ${invoiceId}`);
    const updated = await this.invoicesBusinessService.processPaymentReceived(invoiceId, paymentAmount, user);
    return this.invoicesMapperService.mapToResponseDto(updated);
  }

  async getStatistics(user: RequestWithUser['user']): Promise<InvoiceStatistics & { averagePaymentTime: number }> {
    this.logger.log(`Getting invoice statistics for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const statistics = await this.invoicesDataService.getInvoicesStatistics(companyId!);
    const averagePaymentTime = 15; // заглушка

    return { ...statistics, averagePaymentTime };
  }

  async exists(id: string): Promise<boolean> {
    const invoice = await this.invoicesDataService.findById(id);
    return !!invoice;
  }

  async getInvoiceInfo(id: string): Promise<{
    id: string;
    invoiceNumber: string;
    companyId: string;
    status: string;
    orderId: string;
    totalAmount: number;
    remainingAmount: number;
  } | null> {
    const invoice = await this.invoicesDataService.findById(id);
    return invoice ? this.invoicesMapperService.mapToBasicInfo(invoice) : null;
  }

  async belongsToCompany(invoiceId: string, companyId: string): Promise<boolean> {
    const invoice = await this.invoicesDataService.findByIdForCompany(invoiceId, companyId);
    return !!invoice;
  }

  async getInvoicesCountForCompany(companyId: string): Promise<number> {
    return this.invoicesDataService.getInvoicesCountForCompany(companyId);
  }

  async getOverdueInvoices(user: RequestWithUser['user']): Promise<OverdueInvoicesReport> {
    this.logger.log(`Getting overdue invoices for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const overdueInvoices = await this.invoicesDataService.findOverdueInvoices(companyId!);

    const byCustomerMap = new Map<string, any>();
    let totalAmount = 0;

    for (const invoice of overdueInvoices) {
      totalAmount += parseFloat(invoice.totalAmount.toString());
      const customerId = (invoice as any).order?.customerId || 'unknown';

      if (!byCustomerMap.has(customerId)) {
        byCustomerMap.set(customerId, {
          customerId,
          customerName: 'Unknown Customer',
          count: 0,
          totalAmount: 0,
          oldestInvoiceDate: invoice.dueDate,
        });
      }

      const customerData = byCustomerMap.get(customerId);
      customerData.count += 1;
      customerData.totalAmount += parseFloat(invoice.totalAmount.toString());
      if (new Date(invoice.dueDate) < new Date(customerData.oldestInvoiceDate)) {
        customerData.oldestInvoiceDate = invoice.dueDate;
      }
    }

    return {
      totalOverdue: overdueInvoices.length,
      totalAmount,
      byCustomer: Array.from(byCustomerMap.values()),
    };
  }

  async search(query: string, user: RequestWithUser['user']): Promise<InvoiceResponseDto[]> {
    this.logger.log(`Searching invoices with query: "${query}" for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const searchFilter: InvoiceFilter = {
      companyId: companyId!,
      search: query,
      limit: 50,
    };

    const [invoices] = await this.invoicesDataService.findWithFilters(searchFilter);
    return this.invoicesMapperService.mapArrayToResponseDto(invoices, this.effectiveRole(user.role));
  }

  async getForSelect(user: RequestWithUser['user'], options?: { status?: InvoiceStatus }) {
    this.logger.log(`Getting invoices for select for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const filter: InvoiceFilter = {
      companyId: companyId!,
      status: options?.status,
      limit: 100,
      sortField: 'invoiceNumber',
      sortOrder: 'desc',
    };

    const [invoices] = await this.invoicesDataService.findWithFilters(filter);

    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      dueDate: invoice.dueDate,
      label: `${invoice.invoiceNumber} (${invoice.totalAmount} ₽)`,
      value: invoice.id,
    }));
  }

  private effectiveRole(role: string): any {
    return role === 'superadmin' ? 'company_admin' : role;
  }
}
