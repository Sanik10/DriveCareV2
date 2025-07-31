// src/modules/orders/services/orders-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderService, OrderPart } from '../../../database/entities';
import { OrderFilter, CreateOrderData, UpdateOrderData, OrderStatus } from '../types/orders.types'; // 🔥 ДОБАВЛЕН OrderStatus
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

  /**
   * 🔒 Создание заказа с автоустановкой companyId
   */
  async create(data: CreateOrderData): Promise<Order> {
    // 🔥 ИСПРАВЛЕНО: Правильное создание entity
    const orderData = {
      ...data,
      status: data.status || OrderStatus.NEW, // Используем enum
      totalAmount: 0,
      discountAmount: data.discountAmount || 0,
      taxAmount: 0,
      finalAmount: 0,
    };

    const order = this.orderRepository.create(orderData);
    return this.orderRepository.save(order); // 🔥 ИСПРАВЛЕНО: убран массив
  }

  /**
   * 🔒 Поиск с обязательной фильтрацией по companyId
   */
  async findWithFilters(filter: OrderFilter): Promise<[Order[], number]> {
    const query = this.orderRepository.createQueryBuilder('order')
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

    // 🔒 КРИТИЧНО: Обязательная фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('order.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтр по клиенту
    if (filter.customerId) {
      query.andWhere('order.customerId = :customerId', { customerId: filter.customerId });
    }

    // Фильтр по автомобилю
    if (filter.vehicleId) {
      query.andWhere('order.vehicleId = :vehicleId', { vehicleId: filter.vehicleId });
    }

    // Фильтр по статусу
    if (filter.status) {
      query.andWhere('order.status = :status', { status: filter.status });
    }

    // Фильтр по исполнителю
    if (filter.assignedTo) {
      query.andWhere('order.assignedTo = :assignedTo', { assignedTo: filter.assignedTo });
    }

    // Поиск по номеру заказа или описанию
    if (filter.search) {
      query.andWhere(
        '(order.orderNumber ILIKE :search OR order.description ILIKE :search OR order.customerComplaints ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по дате создания
    if (filter.dateFrom) {
      query.andWhere('order.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      query.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    // Сортировка
    const sortField = this.mapSortField(filter.sortField || 'createdAt');
    const sortOrder = filter.sortOrder || 'desc';
    query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    if (filter.page && filter.limit) {
      const offset = (filter.page - 1) * filter.limit;
      query.skip(offset).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск по ID для компании (безопасный)
   */
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

  /**
   * Поиск по ID (для внутреннего использования)
   */
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

  /**
   * Обновление заказа
   */
  async update(id: string, data: UpdateOrderData): Promise<Order> {
    await this.orderRepository.update(id, data);
    
    const updatedOrder = await this.findById(id);
    if (!updatedOrder) {
      throw new Error(`Order with id ${id} not found after update`);
    }
    
    return updatedOrder;
  }

  /**
   * 📊 Генерация номера заказа для компании
   */
  async generateOrderNumber(companyId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    
    // Находим последний заказ за текущий год для компании
    const lastOrder = await this.orderRepository.createQueryBuilder('order')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.orderNumber LIKE :pattern', { pattern: `ORD-${year}-%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();
    
    let nextNumber = 1;
    
    if (lastOrder) {
      const lastNumberStr = lastOrder.orderNumber.split('-')[2];
      const lastNumber = parseInt(lastNumberStr, 10);
      nextNumber = lastNumber + 1;
    }
    
    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `ORD-${year}-${formattedNumber}`;
  }

  /**
   * 📈 Получение статистики по заказам компании
   */
  async getOrdersStatistics(companyId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    totalAmount: number;
  }> {
    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.companyId = :companyId', { companyId });

    // Общее количество
    const total = await query.getCount();

    // По статусам
    const statusStats = await this.orderRepository.createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.companyId = :companyId', { companyId })
      .groupBy('order.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    // За текущий месяц
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = await query
      .andWhere('order.createdAt >= :firstDay', { firstDay: firstDayOfMonth })
      .getCount();

    // Общая сумма завершенных заказов
    const totalAmountResult = await this.orderRepository.createQueryBuilder('order')
      .select('SUM(order.finalAmount)', 'totalAmount')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    const totalAmount = parseFloat(totalAmountResult.totalAmount) || 0;

    return {
      total,
      byStatus,
      thisMonth,
      totalAmount,
    };
  }

  /**
   * Маппинг полей для сортировки
   */
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

  /**
   * 📊 Получение количества заказов компании (для проверки лимитов)
   */
  async getOrdersCountForCompany(companyId: string): Promise<number> {
    return this.orderRepository.count({
      where: { companyId },
    });
  }
}
