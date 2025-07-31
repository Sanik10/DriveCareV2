// src/modules/invoices/services/invoices-data.service.ts (ПОЛНЫЙ ФАЙЛ)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Invoice } from '../../../database/entities';
import { InvoiceStatus } from '../../../database/entities/invoice.entity';
import { CreateInvoiceData, UpdateInvoiceData, InvoiceFilter, InvoiceStatistics } from '../types/invoices.types';

@Injectable()
export class InvoicesDataService {
  private readonly logger = new Logger(InvoicesDataService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * 💾 Создание счета
   */
  async create(data: CreateInvoiceData): Promise<Invoice> {
    const invoice = this.invoiceRepository.create(data);
    return this.invoiceRepository.save(invoice);
  }

  /**
   * 🔍 Поиск по ID
   */
  async findById(id: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id },
      relations: ['order', 'company', 'payments'],
    });
  }

  /**
   * 🔒 Поиск по ID для компании
   */
  async findByIdForCompany(id: string, companyId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id, companyId },
      relations: ['order', 'company', 'payments'],
    });
  }

  /**
   * 🔍 Поиск по заказу для компании
   */
  async findByOrderIdForCompany(orderId: string, companyId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { orderId, companyId },
      relations: ['order', 'company'],
    });
  }

  /**
   * ✏️ Обновление счета
   */
  async update(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    await this.invoiceRepository.update(id, data);
    return this.findById(id)!;
  }

  /**
   * 🔍 Поиск с фильтрами
   */
  async findWithFilters(filter: InvoiceFilter): Promise<[Invoice[], number]> {
    const query = this.invoiceRepository.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('invoice.company', 'company')
      .leftJoinAndSelect('invoice.payments', 'payments');

    // Фильтрация по компании
    if (filter.companyId) {
      query.andWhere('invoice.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтрация по заказу
    if (filter.orderId) {
      query.andWhere('invoice.orderId = :orderId', { orderId: filter.orderId });
    }

    // Фильтрация по статусу
    if (filter.status) {
      query.andWhere('invoice.status = :status', { status: filter.status });
    }

    // Фильтрация по датам выставления
    if (filter.dateFrom) {
      query.andWhere('invoice.issueDate >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      query.andWhere('invoice.issueDate <= :dateTo', { dateTo: filter.dateTo });
    }

    // Фильтрация по срокам оплаты
    if (filter.dueDateFrom) {
      query.andWhere('invoice.dueDate >= :dueDateFrom', { dueDateFrom: filter.dueDateFrom });
    }
    if (filter.dueDateTo) {
      query.andWhere('invoice.dueDate <= :dueDateTo', { dueDateTo: filter.dueDateTo });
    }

    // Фильтрация по сумме
    if (filter.amountFrom !== undefined) {
      query.andWhere('invoice.totalAmount >= :amountFrom', { amountFrom: filter.amountFrom });
    }
    if (filter.amountTo !== undefined) {
      query.andWhere('invoice.totalAmount <= :amountTo', { amountTo: filter.amountTo });
    }

    // Поиск по тексту
    if (filter.search) {
      query.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.notes ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтрация просроченных
    if (filter.includeOverdue !== undefined) {
      const now = new Date();
      if (filter.includeOverdue) {
        query.andWhere('invoice.dueDate < :now AND invoice.status = :issuedStatus', { 
          now, 
          issuedStatus: InvoiceStatus.ISSUED 
        });
      } else {
        query.andWhere('(invoice.dueDate >= :now OR invoice.status != :issuedStatus)', { 
          now, 
          issuedStatus: InvoiceStatus.ISSUED 
        });
      }
    }

    // Сортировка
    const sortField = filter.sortField || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    query.orderBy(`invoice.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    } else if (filter.limit) {
      query.take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🚨 Получение просроченных счетов
   */
  async findOverdueInvoices(companyId: string): Promise<Invoice[]> {
    const now = new Date();
    
    return this.invoiceRepository.find({
      where: {
        companyId,
        status: InvoiceStatus.ISSUED,
        dueDate: LessThan(now),
      },
      relations: ['order', 'company'],
      order: {
        dueDate: 'ASC',
      },
    });
  }

  /**
   * 📊 Получение статистики счетов
   */
  async getInvoicesStatistics(companyId: string): Promise<InvoiceStatistics> {
    const baseQuery = this.invoiceRepository.createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId });

    // Общее количество
    const total = await baseQuery.getCount();

    // По статусам
    const statusStats = await baseQuery
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('invoice.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    // За текущий месяц
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = await baseQuery
      .andWhere('invoice.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    // Суммы
    const amountStats = await baseQuery
      .select('invoice.status', 'status')
      .addSelect('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
      .groupBy('invoice.status')
      .getRawMany();

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    amountStats.forEach(stat => {
      const amount = parseFloat(stat.total);
      totalAmount += amount;
      
      if (stat.status === InvoiceStatus.PAID) {
        paidAmount += amount;
      } else if (stat.status === InvoiceStatus.ISSUED) {
        pendingAmount += amount;
      }
    });

    // Просроченные
    const now = new Date();
    const overdueCount = await baseQuery
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ISSUED })
      .andWhere('invoice.dueDate < :now', { now })
      .getCount();

    const overdueAmountResult = await baseQuery
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ISSUED })
      .andWhere('invoice.dueDate < :now', { now })
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
      .getRawOne();

    const overdueAmount = parseFloat(overdueAmountResult.total || '0');

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

  /**
   * 📊 Количество счетов компании
   */
  async getInvoicesCountForCompany(companyId: string): Promise<number> {
    return this.invoiceRepository.count({
      where: { companyId },
    });
  }

  /**
   * 🎯 Генерация номера счета
   */
  async generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    // Поиск последнего номера за год
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
