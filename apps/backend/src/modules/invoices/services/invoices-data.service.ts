// src/modules/invoices/services/invoices-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DeepPartial } from 'typeorm';
import { Invoice } from '../../../database/entities';
import { InvoiceStatus } from '../../../database/entities/invoice.entity';
import { CreateInvoiceData, UpdateInvoiceData, InvoiceFilter, InvoiceStatistics } from '../types/invoices.types';
import { INVOICES_CONSTANTS } from '../constants/invoices.constants';

@Injectable()
export class InvoicesDataService {
  private readonly logger = new Logger(InvoicesDataService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async create(data: CreateInvoiceData): Promise<Invoice> {
    // Явно подсказываем TS, что создаём одиночную сущность, а не массив
    const invoice = this.invoiceRepository.create(data as DeepPartial<Invoice>);
    return this.invoiceRepository.save(invoice);
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id },
      relations: ['order', 'order.customer', 'order.vehicle', 'company', 'payments', 'payments.paymentMethod'],
    });
  }

  async findByIdForCompany(id: string, companyId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id, companyId },
      relations: ['order', 'order.customer', 'order.vehicle', 'company', 'payments', 'payments.paymentMethod'],
    });
  }

  async findByOrderIdForCompany(orderId: string, companyId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { orderId, companyId },
      relations: ['order', 'company'],
    });
  }

  async update(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    await this.invoiceRepository.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Invoice with id ${id} not found after update`);
    return updated;
  }

  async findWithFilters(filter: InvoiceFilter): Promise<[Invoice[], number]> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('invoice.company', 'company')
      .leftJoinAndSelect('invoice.payments', 'payments')
      .leftJoinAndSelect('payments.paymentMethod', 'paymentMethod');

    if (filter.companyId) {
      query.andWhere('invoice.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.orderId) {
      query.andWhere('invoice.orderId = :orderId', { orderId: filter.orderId });
    }

    if (filter.status) {
      query.andWhere('invoice.status = :status', { status: filter.status });
    }

    if (filter.dateFrom) {
      query.andWhere('invoice.issueDate >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      query.andWhere('invoice.issueDate <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.dueDateFrom) {
      query.andWhere('invoice.dueDate >= :dueDateFrom', { dueDateFrom: filter.dueDateFrom });
    }
    if (filter.dueDateTo) {
      query.andWhere('invoice.dueDate <= :dueDateTo', { dueDateTo: filter.dueDateTo });
    }

    if (filter.amountFrom !== undefined) {
      query.andWhere('invoice.totalAmount >= :amountFrom', { amountFrom: filter.amountFrom });
    }
    if (filter.amountTo !== undefined) {
      query.andWhere('invoice.totalAmount <= :amountTo', { amountTo: filter.amountTo });
    }

    if (filter.search) {
      query.andWhere('(invoice.invoiceNumber ILIKE :search OR invoice.notes ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.includeOverdue !== undefined) {
      const now = new Date();
      if (filter.includeOverdue) {
        query.andWhere('invoice.dueDate < :now AND invoice.status = :issuedStatus', {
          now,
          issuedStatus: InvoiceStatus.ISSUED,
        });
      } else {
        query.andWhere('(invoice.dueDate >= :now OR invoice.status != :issuedStatus)', {
          now,
          issuedStatus: InvoiceStatus.ISSUED,
        });
      }
    }

    const sortField = filter.sortField || 'createdAt';
    const sortOrder = (filter.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(this.mapSortField(sortField), sortOrder);

    const take = Math.min(filter.limit ?? INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE, INVOICES_CONSTANTS.DEFAULTS.MAX_ITEMS);
    if (filter.page) {
      const skip = (filter.page - 1) * take;
      query.skip(skip).take(take);
    } else {
      query.take(take);
    }

    return query.getManyAndCount();
  }

  async findOverdueInvoices(companyId: string): Promise<Invoice[]> {
    const now = new Date();
    return this.invoiceRepository.find({
      where: {
        companyId,
        status: InvoiceStatus.ISSUED,
        dueDate: LessThan(now),
      } as any,
      relations: ['order', 'order.customer', 'company'],
      order: { dueDate: 'ASC' },
    });
  }

  async getInvoicesStatistics(companyId: string): Promise<InvoiceStatistics> {
    const baseQB = this.invoiceRepository.createQueryBuilder('invoice').where('invoice.companyId = :companyId', {
      companyId,
    });

    const total = await baseQB.getCount();

    const statusStats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('invoice.companyId = :companyId', { companyId })
      .groupBy('invoice.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const amountStats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
      .where('invoice.companyId = :companyId', { companyId })
      .groupBy('invoice.status')
      .getRawMany();

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    amountStats.forEach((row) => {
      const amt = parseFloat(row.total || '0');
      totalAmount += amt;
      if (row.status === InvoiceStatus.PAID) paidAmount += amt;
      if (row.status === InvoiceStatus.ISSUED) pendingAmount += amt;
    });

    const now = new Date();
    const overdueCount = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ISSUED })
      .andWhere('invoice.dueDate < :now', { now })
      .getCount();

    const overdueAmountRow = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ISSUED })
      .andWhere('invoice.dueDate < :now', { now })
      .getRawOne();

    const overdueAmount = parseFloat(overdueAmountRow?.total || '0');

    return {
      total,
      byStatus,
      thisMonth,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      overdueCount,
    };
  }

  async getInvoicesCountForCompany(companyId: string): Promise<number> {
    return this.invoiceRepository.count({ where: { companyId } });
  }

  async generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const last = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let next = 1;
    if (last) {
      const parts = last.invoiceNumber.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) next = lastNum + 1;
    }

    return `${prefix}${next.toString().padStart(5, '0')}`;
  }

  private mapSortField(field: string): string {
    const map: Record<string, string> = {
      createdAt: 'invoice.createdAt',
      updatedAt: 'invoice.updatedAt',
      issueDate: 'invoice.issueDate',
      dueDate: 'invoice.dueDate',
      totalAmount: 'invoice.totalAmount',
      amount: 'invoice.amount',
      invoiceNumber: 'invoice.invoiceNumber',
      status: 'invoice.status',
    };
    return map[field] || 'invoice.createdAt';
  }
}
