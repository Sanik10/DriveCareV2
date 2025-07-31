import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService, Order, Service } from '../../../../database/entities';
import { OrderServiceStatus } from '../../../../database/entities/order-service.entity'; // 🔥 ДОБАВЛЕНО: импорт enum
import { AddServiceToOrderData, UpdateOrderServiceData } from '../types/order-services.types';

@Injectable()
export class OrderServicesDataService {
  constructor(
    @InjectRepository(OrderService)
    private readonly orderServiceRepository: Repository<OrderService>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  /**
   * 🔒 Создание записи услуги в заказе
   */
  async create(data: AddServiceToOrderData): Promise<OrderService> {
    const orderService = this.orderServiceRepository.create(data);
    return this.orderServiceRepository.save(orderService);
  }

  /**
   * 🔒 Поиск всех услуг заказа
   */
  async findByOrderId(orderId: string): Promise<OrderService[]> {
    return this.orderServiceRepository.find({
      where: { orderId },
      relations: [
        'service',
        'mechanic',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 🔒 Поиск услуги в заказе по ID
   */
  async findById(id: string): Promise<OrderService | null> {
    return this.orderServiceRepository.findOne({
      where: { id },
      relations: [
        'order',
        'service',
        'mechanic',
      ],
    });
  }

  /**
   * 🔒 Поиск услуги в заказе с проверкой принадлежности
   */
  async findByIdAndOrderId(id: string, orderId: string): Promise<OrderService | null> {
    return this.orderServiceRepository.findOne({
      where: { id, orderId },
      relations: [
        'order',
        'service',
        'mechanic',
      ],
    });
  }

  /**
   * 🔒 Проверка существования услуги в заказе
   */
  async existsInOrder(orderId: string, serviceId: string): Promise<boolean> {
    const count = await this.orderServiceRepository.count({
      where: { orderId, serviceId },
    });
    return count > 0;
  }

  /**
   * 📝 Обновление услуги в заказе
   */
  async update(id: string, data: UpdateOrderServiceData): Promise<OrderService> {
    await this.orderServiceRepository.update(id, data);
    
    const updatedOrderService = await this.findById(id);
    if (!updatedOrderService) {
      throw new Error(`OrderService with id ${id} not found after update`);
    }
    
    return updatedOrderService;
  }

  /**
   * ❌ Удаление услуги из заказа
   */
  async remove(id: string): Promise<void> {
    await this.orderServiceRepository.delete(id);
  }

  /**
   * 🔒 Получение услуги по компании (для проверки принадлежности)
   */
  async findServiceByIdAndCompany(serviceId: string, companyId: string): Promise<Service | null> {
    return this.serviceRepository.findOne({
      where: { 
        id: serviceId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность услуги компании
      },
    });
  }

  /**
   * 🔒 Получение заказа с проверкой принадлежности
   */
  async findOrderByIdAndCompany(orderId: string, companyId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { 
        id: orderId,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность заказа компании
      },
    });
  }

  /**
   * 📊 Расчет общей стоимости услуг заказа
   */
  async calculateOrderServicesTotal(orderId: string): Promise<number> {
    const result = await this.orderServiceRepository
      .createQueryBuilder('orderService')
      .select('SUM(orderService.totalAmount)', 'total')
      .where('orderService.orderId = :orderId', { orderId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  /**
   * 📊 Получение статистики услуг заказа
   */
  async getOrderServicesStats(orderId: string): Promise<{
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    totalAmount: number;
  }> {
    const services = await this.orderServiceRepository.find({
      where: { orderId },
    });

    const stats = services.reduce((acc, service) => {
      acc.total++;
      acc[service.status]++;
      acc.totalAmount += parseFloat(service.totalAmount.toString());
      return acc;
    }, {
      total: 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
      totalAmount: 0,
    });

    return {
      total: stats.total,
      planned: stats.planned,
      inProgress: stats.in_progress,
      completed: stats.completed,
      totalAmount: stats.totalAmount,
    };
  }

  /**
   * 🔒 Получение услуг заказа по статусу
   */
  async findByOrderIdAndStatus(orderId: string, status: OrderServiceStatus): Promise<OrderService[]> {
    return this.orderServiceRepository.find({
      where: { orderId, status },
      relations: ['service', 'mechanic'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 🔒 Получение услуг назначенных механику
   */
  async findByMechanicId(mechanicId: string): Promise<OrderService[]> {
    return this.orderServiceRepository.find({
      where: { mechanicId },
      relations: ['order', 'service'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 📊 Подсчет активных услуг механика
   */
  async countActiveMechanicServices(mechanicId: string): Promise<number> {
    return this.orderServiceRepository.count({
      where: { 
        mechanicId,
        status: OrderServiceStatus.IN_PROGRESS,
      },
    });
  }
}
