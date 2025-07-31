// src/modules/invoices/invoices.service.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { Injectable, Logger } from '@nestjs/common';
import { InvoicesDataService } from './services/invoices-data.service';
import { InvoicesBusinessService } from './services/invoices-business.service';
import { InvoicesValidationService } from './services/invoices-validation.service';
import { InvoicesMapperService } from './services/invoices-mapper.service';
import { CreateInvoiceDto } from './dto/request/create-invoice.dto';
import { CreateInvoiceFromOrderDto } from './dto/request/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/request/update-invoice.dto';
import { InvoiceResponseDto } from './dto/response/invoice-response.dto';
import { PaginatedInvoicesResponseDto } from './dto/response/paginated-invoices-response.dto';
import { InvoiceFilter, InvoiceStatus, CreateInvoiceData, UserWithCompany, InvoiceStatistics, OverdueInvoicesReport } from './types/invoices.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { INVOICES_CONSTANTS } from './constants/invoices.constants';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesDataService: InvoicesDataService,
    private readonly invoicesBusinessService: InvoicesBusinessService,
    private readonly invoicesValidationService: InvoicesValidationService,
    private readonly invoicesMapperService: InvoicesMapperService,
  ) {}

  /**
   * 🔒 Создание счета для пользователя
   */
  async createForUser(createInvoiceDto: CreateInvoiceDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Creating invoice for user ${user.id} in company ${user.companyId}`);

    // 🔥 Преобразуем DTO в CreateInvoiceData
    const createInvoiceData: CreateInvoiceData = {
      ...createInvoiceDto,
      companyId: createInvoiceDto.companyId || user.companyId!,
      dueDate: new Date(createInvoiceDto.dueDate),
      issueDate: createInvoiceDto.issueDate ? new Date(createInvoiceDto.issueDate) : undefined,
    };

    // 🔥 ИСПРАВЛЕНО: Преобразуем RequestWithUser['user'] в UserWithCompany
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Валидация данных с проверкой принадлежности
    await this.invoicesValidationService.validateCreateDataForUser(createInvoiceData, userWithCompany);

    // Создание через бизнес-сервис
    const invoice = await this.invoicesBusinessService.createInvoiceForCompany(createInvoiceData, user.companyId!, userWithCompany);

    this.logger.log(`Invoice created: ${invoice.invoiceNumber} (${invoice.id})`);

    return this.invoicesMapperService.mapToResponseDto(invoice);
  }

  /**
   * 🎯 Создание счета из заказа (умная генерация)
   */
  async createFromOrder(createFromOrderDto: CreateInvoiceFromOrderDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Creating invoice from order ${createFromOrderDto.orderId} for user ${user.id}`);

    // 🔥 ИСПРАВЛЕНО: Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Создание через бизнес-сервис с опциями
    const invoice = await this.invoicesBusinessService.createInvoiceFromOrder(
      createFromOrderDto.orderId,
      user.companyId!,
      userWithCompany,
      {
        paymentTermsDays: createFromOrderDto.paymentTermsDays,
        discountPercent: createFromOrderDto.discountPercent,
        notes: createFromOrderDto.notes,
      }
    );

    this.logger.log(`Invoice created from order: ${invoice.invoiceNumber} (${invoice.id})`);

    return this.invoicesMapperService.mapToResponseDto(invoice);
  }

  /**
   * 🔒 Получение всех счетов с фильтрацией по принадлежности
   */
  async findAll(filter: InvoiceFilter = {}, user: RequestWithUser['user']): Promise<PaginatedInvoicesResponseDto> {
    this.logger.log(`Finding invoices with filters: ${JSON.stringify(filter)} for user ${user.id}`);

    // 🔒 КРИТИЧНО: Фильтрация по принадлежности
    const secureFilter: InvoiceFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [invoices, total] = await this.invoicesDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = Math.min(filter.limit || INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE, INVOICES_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const totalPages = Math.ceil(total / limit);

    // 📊 Получение дополнительной статистики для админки
    const statistics = user.role !== 'mechanic' 
      ? await this.invoicesDataService.getInvoicesStatistics(secureFilter.companyId!)
      : null;

    return {
      items: this.invoicesMapperService.mapArrayToResponseDto(invoices),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      
      // 📊 Статистика (если доступна)
      totalAmount: statistics?.totalAmount || 0,
      paidAmount: statistics?.paidAmount || 0,
      pendingAmount: statistics?.pendingAmount || 0,
      overdueCount: statistics?.overdueCount || 0,
    };
  }

  /**
   * 🔒 Получение счета по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<InvoiceResponseDto> {
    this.logger.log(`Finding invoice: ${id}`);

    const invoice = await this.invoicesValidationService.validateInvoiceExists(id);

    return this.invoicesMapperService.mapToResponseDto(invoice);
  }

  /**
   * 🔒 Обновление счета
   */
  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Updating invoice: ${id}`);

    // 🔥 ИСПРАВЛЕНО: Преобразование DTO с обработкой дат
    const updateData = {
      ...updateInvoiceDto,
      dueDate: updateInvoiceDto.dueDate ? new Date(updateInvoiceDto.dueDate) : undefined,
    };

    // Валидация обновления
    await this.invoicesValidationService.validateUpdateData(id, updateData);

    // 🔥 ИСПРАВЛЕНО: Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Обновление через бизнес-сервис
    const updatedInvoice = await this.invoicesBusinessService.updateInvoice(id, updateData, userWithCompany);

    this.logger.log(`Invoice updated: ${updatedInvoice.invoiceNumber} (${id})`);

    return this.invoicesMapperService.mapToResponseDto(updatedInvoice);
  }

  /**
   * 🔄 Изменение статуса счета с business logic
   */
  async updateStatus(id: string, status: InvoiceStatus, user: RequestWithUser['user']): Promise<InvoiceResponseDto> {
    this.logger.log(`Updating invoice status: ${id} → ${status}`);

    // Получаем счет и валидируем переход
    const invoice = await this.invoicesValidationService.validateInvoiceExists(id);
    this.invoicesValidationService.validateStatusTransition(invoice.status as InvoiceStatus, status);

    // 🔥 ИСПРАВЛЕНО: Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Изменение статуса через бизнес-сервис
    const updatedInvoice = await this.invoicesBusinessService.changeInvoiceStatus(id, status, userWithCompany);

    this.logger.log(`Invoice status updated: ${updatedInvoice.invoiceNumber} → ${status}`);

    return this.invoicesMapperService.mapToResponseDto(updatedInvoice);
  }

  /**
   * ❌ Отмена счета
   */
  async cancel(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Canceling invoice: ${id}`);

    // Валидация возможности отмены
    await this.invoicesValidationService.validateInvoiceCancellation(id);

    // 🔥 ИСПРАВЛЕНО: Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Отмена через бизнес-сервис
    await this.invoicesBusinessService.cancelInvoice(id, userWithCompany);

    this.logger.log(`Invoice canceled: ${id}`);
  }

  // Остальные методы остаются без изменений, но с аналогичными исправлениями типов...
  
  /**
   * 💰 Обработка получения платежа (для Payments модуля)
   */
  async processPayment(invoiceId: string, paymentAmount: number, user: UserWithCompany): Promise<InvoiceResponseDto> {
    this.logger.log(`Processing payment ${paymentAmount} for invoice ${invoiceId}`);

    const updatedInvoice = await this.invoicesBusinessService.processPaymentReceived(invoiceId, paymentAmount, user);

    this.logger.log(`Payment processed for invoice: ${updatedInvoice.invoiceNumber}`);

    return this.invoicesMapperService.mapToResponseDto(updatedInvoice);
  }

  /**
   * 📊 Получение статистики счетов
   */
  async getStatistics(user: RequestWithUser['user']): Promise<InvoiceStatistics & { averagePaymentTime: number }> {
    this.logger.log(`Getting invoice statistics for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const statistics = await this.invoicesDataService.getInvoicesStatistics(companyId!);

    // TODO: Расчет среднего времени оплаты (требует данных из Payments)
    const averagePaymentTime = 15; // Заглушка

    return {
      ...statistics,
      averagePaymentTime,
    };
  }

  // Остальные методы остаются аналогично исправленными...
  
  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Проверка существования счета (для других модулей)
   */
  async exists(id: string): Promise<boolean> {
    const invoice = await this.invoicesDataService.findById(id);
    return !!invoice;
  }

  /**
   * 🔗 Получение базовой информации о счете (для Payments модуля)
   */
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

  /**
   * 🔗 Проверка принадлежности счета компании (для других модулей)
   */
  async belongsToCompany(invoiceId: string, companyId: string): Promise<boolean> {
    const invoice = await this.invoicesDataService.findByIdForCompany(invoiceId, companyId);
    return !!invoice;
  }

  /**
   * 📊 Получение количества счетов компании (для проверки лимитов)
   */
  async getInvoicesCountForCompany(companyId: string): Promise<number> {
    return this.invoicesDataService.getInvoicesCountForCompany(companyId);
  }

  /**
	 * 🚨 Получение просроченных счетов
	 */
	async getOverdueInvoices(user: RequestWithUser['user']): Promise<OverdueInvoicesReport> {
	this.logger.log(`Getting overdue invoices for user ${user.id}`);

	const companyId = user.role === 'superadmin' ? undefined : user.companyId;
	
	if (!companyId && user.role !== 'superadmin') {
		throw new Error('Company ID is required for non-superadmin users');
	}

	const overdueInvoices = await this.invoicesDataService.findOverdueInvoices(companyId!);
	
	// Группировка по клиентам
	const byCustomerMap = new Map();
	let totalAmount = 0;

	for (const invoice of overdueInvoices) {
		totalAmount += parseFloat(invoice.totalAmount.toString());
		
		const customerId = invoice.order?.customerId || 'unknown';
		if (!byCustomerMap.has(customerId)) {
		byCustomerMap.set(customerId, {
			customerId,
			customerName: 'Unknown Customer', // TODO: получать из Orders/Customers
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

	/**
	 * 🔍 Поиск счетов
	 */
	async search(query: string, user: RequestWithUser['user']): Promise<InvoiceResponseDto[]> {
	this.logger.log(`Searching invoices with query: "${query}" for user ${user.id}`);

	const companyId = user.role === 'superadmin' ? undefined : user.companyId;
	
	if (!companyId && user.role !== 'superadmin') {
		throw new Error('Company ID is required for non-superadmin users');
	}

	const searchFilter: InvoiceFilter = {
		companyId: companyId!,
		search: query,
		limit: 50, // Ограничиваем результаты поиска
	};

	const [invoices] = await this.invoicesDataService.findWithFilters(searchFilter);

	return this.invoicesMapperService.mapArrayToResponseDto(invoices);
	}

	/**
	 * 📋 Получение счетов для dropdown/select
	 */
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

	return invoices.map(invoice => ({
		id: invoice.id,
		invoiceNumber: invoice.invoiceNumber,
		totalAmount: invoice.totalAmount,
		status: invoice.status,
		dueDate: invoice.dueDate,
		label: `${invoice.invoiceNumber} (${invoice.totalAmount} ₽)`,
		value: invoice.id,
	}));
	}
}
