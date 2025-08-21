// path: apps/backend/src/modules/appointments/services/appointments-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository, DeepPartial } from 'typeorm';
import { Appointment, AppointmentPriority, AppointmentStatus } from '../../../database/entities';
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
   * Создание новой записи (безопасное маппирование типов, decimal → string)
   */
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const entityData: DeepPartial<Appointment> = {
      companyId: data.companyId,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      mechanicId: data.mechanicId,
      startTime: data.startTime,
      endTime: data.endTime,
      estimatedDuration: data.estimatedDuration,
      serviceIds: data.serviceIds || [],
      status: data.status ?? AppointmentStatus.DRAFT,
      priority: data.priority ?? AppointmentPriority.NORMAL,
      description: data.description ?? null,
      customerNotes: data.customerNotes ?? null,
      mechanicNotes: null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      estimatedCost: data.estimatedCost != null ? String(data.estimatedCost) : null,
      finalCost: null,
      reminderSent: false,
      confirmationSent: false,
      isDeleted: false,
    };

    const appointment = this.appointmentsRepository.create(entityData);
    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Получение всех записей (служебно; не используйте без фильтра по companyId)
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
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.vehicle', 'vehicle')
      .leftJoinAndSelect('appointment.mechanic', 'mechanic')
      .leftJoinAndSelect('appointment.company', 'company')
      .where('appointment.isDeleted = :isDeleted', { isDeleted: false });

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('appointment.companyId = :companyId', {
        companyId: filter.companyId,
      });
    }

    // Поиск по тексту
    if (filter.search) {
      query.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR ' +
          'appointment.description ILIKE :search OR appointment.customerNotes ILIKE :search)',
        { search: `%${filter.search}%` },
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
        mechanicId: filter.mechanicId,
      });
    }

    // Фильтр по клиенту
    if (filter.customerId) {
      query.andWhere('appointment.customerId = :customerId', {
        customerId: filter.customerId,
      });
    }

    // Фильтр по автомобилю
    if (filter.vehicleId) {
      query.andWhere('appointment.vehicleId = :vehicleId', {
        vehicleId: filter.vehicleId,
      });
    }

    // Фильтр по услуге
    if (filter.serviceId) {
      query.andWhere('appointment.serviceIds @> :serviceId', {
        serviceId: JSON.stringify([filter.serviceId]),
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
        dateFrom: filter.dateFrom,
      });
    } else if (filter.dateTo) {
      query.andWhere('appointment.startTime <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    // Сортировка (whitelist)
    const sortField = this.mapSortField(filter.sortField || 'startTime');
    query.orderBy(sortField, (filter.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'ASC');

    // Пагинация
    if (filter.page && filter.limit) {
      const offset = (filter.page - 1) * filter.limit;
      query.skip(offset).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * Обновление записи (mass-assignment safe + decimal → string)
   */
  async update(id: string, data: UpdateAppointmentData): Promise<Appointment> {
    const updateData: Partial<Appointment> = {};
    const allowedFields = [
      'mechanicId',
      'startTime',
      'endTime',
      'estimatedDuration',
      'serviceIds',
      'priority',
      'description',
      'customerNotes',
      'mechanicNotes',
      'contactPhone',
      'contactEmail',
      'estimatedCost',
      'finalCost',
      'rating',
      'feedback',
      'actualDuration',
      'reminderSent',
      'confirmationSent',
    ] as const;

    allowedFields.forEach((field) => {
      if ((data as any)[field] !== undefined) {
        if (field === 'estimatedCost' || field === 'finalCost') {
          (updateData as any)[field] = (data as any)[field] != null ? String((data as any)[field]) : null;
        } else {
          (updateData as any)[field] = (data as any)[field];
        }
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
   * Поиск записей мастера в диапазоне дат (🔒 с companyId)
   */
  async findByMechanic(mechanicId: string, companyId: string, dateFrom: Date, dateTo: Date): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: {
        mechanicId,
        companyId,
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
  async countByStatus(companyId: string, status: AppointmentStatus): Promise<number> {
    return this.appointmentsRepository.count({
      where: {
        companyId,
        status,
        isDeleted: false,
      },
    });
  }

  /**
   * Список mechanicId компании (по активным/будущим записям)
   */
  async getMechanicIdsByCompany(companyId: string): Promise<string[]> {
    const rows = await this.appointmentsRepository
      .createQueryBuilder('a')
      .select('DISTINCT a.mechanicId', 'mechanicId')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.isDeleted = false')
      .getRawMany<{ mechanicId: string }>();
    return rows.map((r) => r.mechanicId).filter(Boolean);
  }

  /**
   * 🔍 Поиск конфликтов расписания (с учётом компании, если указана)
   */
  async findConflicts(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
    companyId?: string,
  ): Promise<Appointment[]> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.mechanicId = :mechanicId', { mechanicId })
      .andWhere('appointment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('appointment.status IN (:...activeStatuses)', {
        activeStatuses: APPOINTMENTS_CONSTANTS.STATUSES.ACTIVE_STATUSES,
      })
      .andWhere('(appointment.startTime < :endTime AND appointment.endTime > :startTime)', {
        startTime,
        endTime,
      });

    if (excludeAppointmentId) {
      query.andWhere('appointment.id != :excludeId', { excludeId: excludeAppointmentId });
    }
    if (companyId) {
      query.andWhere('appointment.companyId = :companyId', { companyId });
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
   * Агрегированная статистика по компании
   */
  async getStats(companyId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    completionRate: number;
    averageRating: number;
    averageDuration: number;
    noShowRate: number;
  }> {
    const total = await this.appointmentsRepository.count({ where: { companyId, isDeleted: false } });

    const byStatusRows = await this.appointmentsRepository
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.companyId = :companyId AND a.isDeleted = false', { companyId })
      .groupBy('a.status')
      .getRawMany<{ status: string; cnt: string }>();
    const byStatus: Record<string, number> = {};
    byStatusRows.forEach((r) => (byStatus[r.status] = parseInt(r.cnt, 10)));

    const completed = byStatus['completed'] || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const ratingRow = await this.appointmentsRepository
      .createQueryBuilder('a')
      .select('AVG(a.rating)', 'avg')
      .where('a.companyId = :companyId AND a.isDeleted = false AND a.rating IS NOT NULL', { companyId })
      .getRawOne<{ avg: string }>();
    const averageRating = ratingRow?.avg ? Math.round(parseFloat(ratingRow.avg) * 100) / 100 : 0;

    const durationRow = await this.appointmentsRepository
      .createQueryBuilder('a')
      .select('AVG(a.actualDuration)', 'avg')
      .where(
        'a.companyId = :companyId AND a.isDeleted = false AND a.actualDuration IS NOT NULL AND a.status = :status',
        { companyId, status: AppointmentStatus.COMPLETED },
      )
      .getRawOne<{ avg: string }>();
    const averageDuration = durationRow?.avg ? Math.round(parseFloat(durationRow.avg)) : 0;

    const noShow = byStatus[AppointmentStatus.NO_SHOW] || 0;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

    return { total, byStatus, completionRate, averageRating, averageDuration, noShowRate };
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
