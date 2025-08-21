// src/modules/orders/services/orders-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Order, OrderService, OrderPart } from '../../../database/entities';
import { OrderFilter, CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types';
import { ORDERS_CONSTANTS } from '../constants/orders.constants';

@Injectable()
export class OrdersDataService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderService)
    private readonly orderServiceRepository: Repository<OrderService>,
    @InjectRepository(OrderPart)
    private readonly orderPartRepository: Repository<OrderPart>,
  ) {}

  async create(data: CreateOrderData): Promise<Order> {
    const orderData = {
      ...data,
      status: data.status || OrderStatus.NEW,
      totalAmount: 0,
      discountAmount: data.discountAmount || 0,
      taxAmount: 0,
      finalAmount: 0,
    };
    const order = this.orderRepository.create(orderData as DeepPartial<Order>);
    return this.orderRepository.save(order);
  }

  async findWithFilters(filter: OrderFilter): Promise<[Order[], number]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('order.createdByUser', 'createdBy')
      .leftJoinAndSelect('order.assignedToUser', 'assignedTo')
      .leftJoinAndSelect('order.orderServices', 'orderServices')
      .leftJoinAndSelect('orderServices.service', 'service')
      .leftJoinAndSelect('order.orderParts', 'orderParts')
      .leftJoinAndSelect('orderParts.part', 'part');

    if (filter.companyId) {
      query.andWhere('order.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.customerId) query.andWhere('order.customerId = :customerId', { customerId: filter.customerId });
    if (filter.vehicleId) query.andWhere('order.vehicleId = :vehicleId', { vehicleId: filter.vehicleId });
    if (filter.status) query.andWhere('order.status = :status', { status: filter.status });
    if (filter.assignedTo) query.andWhere('order.assignedTo = :assignedTo', { assignedTo: filter.assignedTo });

    if (filter.search) {
      query.andWhere(
        '(order.orderNumber ILIKE :search OR order.description ILIKE :search OR order.customerComplaints ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.dateFrom) query.andWhere('order.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });

    const sortField = this.mapSortField(filter.sortField || 'createdAt');
    const sortOrder = (filter.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(sortField, sortOrder);

    const take = Math.min(filter.limit || ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE, ORDERS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const skip = (filter.page && take) ? (filter.page - 1) * take : 0;
    query.skip(skip).take(take);

    return query.getManyAndCount();
  }

  async findByIdForCompany(id: string, companyId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id, companyId },
      relations: [
        'customer',
        'vehicle',
        'vehicle.model',
        'vehicle.model.brand',
        'createdByUser',
        'assignedToUser',
        'orderServices',
        'orderServices.service',
        'orderParts',
        'orderParts.part',
      ],
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'vehicle',
        'vehicle.model',
        'vehicle.model.brand',
        'createdByUser',
        'assignedToUser',
        'orderServices',
        'orderServices.service',
        'orderParts',
        'orderParts.part',
      ],
    });
  }

  async update(id: string, data: UpdateOrderData): Promise<Order> {
    await this.orderRepository.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Order with id ${id} not found after update`);
    return updated;
  }

  async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.orderNumber LIKE :pattern', { pattern: `ORD-${year}-%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let next = 1;
    if (last) {
      const lastNumStr = last.orderNumber.split('-')[2];
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) next = lastNum + 1;
    }

    return `ORD-${year}-${next.toString().padStart(5, '0')}`;
  }

  async getOrdersStatistics(companyId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    totalAmount: number;
  }> {
    const base = this.orderRepository.createQueryBuilder('order').where('order.companyId = :companyId', { companyId });

    const total = await base.getCount();

    const statusStats = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.companyId = :companyId', { companyId })
      .groupBy('order.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);

    const thisMonth = await base.andWhere('order.createdAt >= :firstDay', { firstDay }).getCount();

    const totalAmountRow = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.finalAmount), 0)', 'totalAmount')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    const totalAmount = parseFloat(totalAmountRow?.totalAmount || '0');

    return { total, byStatus, thisMonth, totalAmount };
  }

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      orderNumber: 'order.orderNumber',
      status: 'order.status',
      totalAmount: 'order.totalAmount',
      finalAmount: 'order.finalAmount',
      createdAt: 'order.createdAt',
      estimatedCompletionTime: 'order.estimatedCompletionTime',
      customerName: 'customer.firstName',
    };
    return fieldMap[sortField] || 'order.createdAt';
  }

  async getOrdersCountForCompany(companyId: string): Promise<number> {
    return this.orderRepository.count({ where: { companyId } });
  }
}
