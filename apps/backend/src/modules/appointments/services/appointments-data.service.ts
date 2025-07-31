import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Appointment, AppointmentStatus } from '../../../database/entities';
import { CreateAppointmentData, UpdateAppointmentData, AppointmentFilter } from '../types/appointments.types';
import { IAppointmentsDataService } from '../interfaces/appointments.interface';
import { APPOINTMENTS_CONSTANTS } from '../constants/appointments.constants';

@Injectable()
export class AppointmentsDataService implements IAppointmentsDataService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  /**
   * Создание новой записи
   */
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const appointment = this.appointmentsRepository.create(data);
    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Получение всех записей
   */
  async findAll(): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { isDeleted: false },
      relations: ['customer', 'vehicle', 'mechanic', 'company'],
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Поиск записи по ID
   */
  async findById(id: string): Promise<Appointment | null> {
    return this.appointmentsRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['customer', 'vehicle', 'mechanic', 'company'],
    });
  }

  /**
   * 🔒 Безопасный поиск по ID с проверкой принадлежности
   */
  async findByIdForCompany(id: string, companyId: string): Promise<Appointment | null> {
    return this.appointmentsRepository.findOne({
      where: { 
        id, 
        companyId,
        isDeleted: false,
      },
      relations: ['customer', 'vehicle', 'mechanic', 'company'],
    });
  }

  /**
   * 🔒 Поиск с фильтрами и обязательной безопасностью
   */
  async findWithFilters(filter: AppointmentFilter): Promise<[Appointment[], number]> {
    const query = this.appointmentsRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.vehicle', 'vehicle')
      .leftJoinAndSelect('appointment.mechanic', 'mechanic')
      .leftJoinAndSelect('appointment.company', 'company')
      .where('appointment.isDeleted = :isDeleted', { isDeleted: false });

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('appointment.companyId = :companyId', { 
        companyId: filter.companyId 
      });
    }

    // Поиск по тексту
    if (filter.search) {
      query.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR ' +
        'appointment.description ILIKE :search OR appointment.customerNotes ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по статусу
    if (filter.status) {
      query.andWhere('appointment.status = :status', { status: filter.status });
    }

    // Фильтр по приоритету
    if (filter.priority) {
      query.andWhere('appointment.priority = :priority', { priority: filter.priority });
    }

    // Фильтр по мастеру
    if (filter.mechanicId) {
      query.andWhere('appointment.mechanicId = :mechanicId', { 
        mechanicId: filter.mechanicId 
      });
    }

    // Фильтр по клиенту
    if (filter.customerId) {
      query.andWhere('appointment.customerId = :customerId', { 
        customerId: filter.customerId 
      });
    }

    // Фильтр по автомобилю
    if (filter.vehicleId) {
      query.andWhere('appointment.vehicleId = :vehicleId', { 
        vehicleId: filter.vehicleId 
      });
    }

    // Фильтр по услуге
    if (filter.serviceId) {
      query.andWhere('appointment.serviceIds @> :serviceId', { 
        serviceId: JSON.stringify([filter.serviceId])
      });
    }

    // Фильтр по датам
    if (filter.dateFrom && filter.dateTo) {
      query.andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    } else if (filter.dateFrom) {
      query.andWhere('appointment.startTime >= :dateFrom', { 
        dateFrom: filter.dateFrom 
      });
    } else if (filter.dateTo) {
      query.andWhere('appointment.startTime <= :dateTo', { 
        dateTo: filter.dateTo 
      });
    }

    // Сортировка
    const sortField = this.mapSortField(filter.sortField || 'startTime');
    query.orderBy(sortField, filter.sortOrder?.toUpperCase() as 'ASC' | 'DESC' || 'ASC');

    // Пагинация
    if (filter.page && filter.limit) {
      const offset = (filter.page - 1) * filter.limit;
      query.skip(offset).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * Обновление записи
   */
  async update(id: string, data: UpdateAppointmentData): Promise<Appointment> {
    const updateData: Partial<Appointment> = {};
    
    // Безопасное копирование только разрешенных полей
    const allowedFields = [
      'mechanicId', 'startTime', 'endTime', 'estimatedDuration', 'serviceIds',
      'priority', 'description', 'customerNotes', 'mechanicNotes', 
      'contactPhone', 'contactEmail', 'estimatedCost', 'finalCost',
      'rating', 'feedback'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    await this.appointmentsRepository.update(id, updateData);
    
    const updatedAppointment = await this.findById(id);
    if (!updatedAppointment) {
      throw new Error(`Appointment with id ${id} not found after update`);
    }
    
    return updatedAppointment;
  }

  /**
   * Жесткое удаление записи
   */
  async delete(id: string): Promise<void> {
    await this.appointmentsRepository.delete(id);
  }

  /**
   * Мягкое удаление записи
   */
  async softDelete(id: string): Promise<void> {
    await this.appointmentsRepository.update(id, { 
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  /**
   * Поиск записей клиента
   */
  async findByCustomer(customerId: string, companyId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { 
        customerId, 
        companyId,
        isDeleted: false,
      },
      relations: ['customer', 'vehicle', 'mechanic'],
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Поиск записей мастера в диапазоне дат
   */
  async findByMechanic(mechanicId: string, dateFrom: Date, dateTo: Date): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: {
        mechanicId,
        startTime: Between(dateFrom, dateTo),
        isDeleted: false,
        status: In(APPOINTMENTS_CONSTANTS.STATUSES.ACTIVE_STATUSES),
      },
      relations: ['customer', 'vehicle'],
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Поиск записей компании в диапазоне дат
   */
  async findByDateRange(companyId: string, dateFrom: Date, dateTo: Date): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: {
        companyId,
        startTime: Between(dateFrom, dateTo),
        isDeleted: false,
      },
      relations: ['customer', 'vehicle', 'mechanic'],
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Подсчет записей по статусу
   */
  async countByStatus(companyId: string, status: string): Promise<number> {
    return this.appointmentsRepository.count({
      where: { 
        companyId, 
        status: status as AppointmentStatus,
        isDeleted: false,
      },
    });
  }

  /**
   * 🔍 Поиск конфликтов расписания
   */
  async findConflicts(
    mechanicId: string, 
    startTime: Date, 
    endTime: Date, 
    excludeAppointmentId?: string
  ): Promise<Appointment[]> {
    const query = this.appointmentsRepository.createQueryBuilder('appointment')
      .where('appointment.mechanicId = :mechanicId', { mechanicId })
      .andWhere('appointment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('appointment.status IN (:...activeStatuses)', { 
        activeStatuses: APPOINTMENTS_CONSTANTS.STATUSES.ACTIVE_STATUSES 
      })
      .andWhere(
        '(appointment.startTime < :endTime AND appointment.endTime > :startTime)',
        { startTime, endTime }
      );

    if (excludeAppointmentId) {
      query.andWhere('appointment.id != :excludeId', { excludeId: excludeAppointmentId });
    }

    return query.getMany();
  }

  /**
   * 🔒 Проверка существования записи в контексте компании
   */
  async existsForCompany(id: string, companyId: string): Promise<boolean> {
    const count = await this.appointmentsRepository.count({
      where: { id, companyId, isDeleted: false },
    });
    return count > 0;
  }

  /**
   * Маппинг полей для сортировки
   */
  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      startTime: 'appointment.startTime',
      createdAt: 'appointment.createdAt',
      status: 'appointment.status',
      priority: 'appointment.priority',
      customerName: 'customer.firstName',
    };

    return fieldMap[sortField] || 'appointment.startTime';
  }
}
