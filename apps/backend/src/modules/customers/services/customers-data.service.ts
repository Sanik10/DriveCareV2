// apps/backend/src/modules/customers/services/customers-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../database/entities/customer.entity';
import { CreateCustomerData, UpdateCustomerData, CustomerFilter } from '../types/customers.types';
import { ICustomersDataService } from '../interfaces/customers.interface';
import { CUSTOMERS_CONSTANTS } from '../constants/customers.constants';
import { ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomersDataService implements ICustomersDataService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly config: ConfigService,
  ) {}

  async create(data: CreateCustomerData): Promise<Customer> {
    const customer = this.customersRepository.create({
      ...data,
      loyaltyPoints: data.loyaltyPoints ?? CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_LOYALTY_POINTS,
      isActive: data.isActive ?? CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE,
    });

    // 152-ФЗ: срок хранения ПДн (ретеншн) — рассчитываем при создании
    const retentionYears = this.config.get<number>('customers.retentionYears', 5);
    if (retentionYears && Number.isFinite(retentionYears)) {
      const until = new Date();
      until.setFullYear(until.getFullYear() + retentionYears);
      customer.dataRetentionUntil = until;
    }

    return this.customersRepository.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return this.customersRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['vehicles'],
    });
  }

  async findByEmail(email: string, companyId: string): Promise<Customer | null> {
    const emailNormalized = (email ?? '').trim().toLowerCase();
    return this.customersRepository.findOne({
      where: { emailNormalized, companyId, isDeleted: false },
    });
  }

  async findWithFilters(filter: CustomerFilter): Promise<[Customer[], number]> {
    const {
      search,
      type,
      isActive,
      companyId,
      source,
      minLoyaltyPoints,
      maxLoyaltyPoints,
      createdFrom,
      createdTo,
      page = 1,
      limit = CUSTOMERS_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false
    } = filter;

    if (!companyId) {
      throw new ValidationDataException(
        'companyId',
        'Company ID is required for security filtering'
      );
    }

    const query = this.customersRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.vehicles', 'vehicle', 'vehicle.isDeleted = false');

    query.andWhere('customer.companyId = :companyId', { companyId });

    if (!includeDeleted) {
      query.andWhere('customer.isDeleted = false');
    }

    if (search) {
      query.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.companyName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (type !== undefined) {
      query.andWhere('customer.type = :type', { type });
    }

    if (isActive !== undefined) {
      query.andWhere('customer.isActive = :isActive', { isActive });
    }

    if (source) {
      query.andWhere('customer.source = :source', { source });
    }

    if (minLoyaltyPoints !== undefined) {
      query.andWhere('customer.loyaltyPoints >= :minLoyaltyPoints', { minLoyaltyPoints });
    }

    if (maxLoyaltyPoints !== undefined) {
      query.andWhere('customer.loyaltyPoints <= :maxLoyaltyPoints', { maxLoyaltyPoints });
    }

    if (createdFrom) {
      query.andWhere('customer.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      query.andWhere('customer.createdAt <= :createdTo', { createdTo });
    }

    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  async findByIdForCompany(id: string, companyId: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { 
        id,
        companyId,
        isDeleted: false,
      },
      relations: ['vehicles'],
    });
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Customer with id ${id} not found`);
    }

    Object.keys(data).forEach((key) => {
      const k = key as keyof UpdateCustomerData;
      if (data[k] !== undefined) {
        (existing as any)[k] = data[k];
      }
    });

    const saved = await this.customersRepository.save(existing);
    return saved;
  }

  async softDelete(id: string): Promise<void> {
    await this.customersRepository.update(id, { 
      isDeleted: true, 
      deletedAt: new Date(),
      isActive: false,
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.customersRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<Customer> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Customer with id ${id} not found`);
    }
    existing.isActive = isActive;
    const updatedCustomer = await this.customersRepository.save(existing);
    return updatedCustomer;
  }

  async getStats(companyId: string): Promise<any> {
    const stats = await this.customersRepository
      .createQueryBuilder('customer')
      .select([
        'COUNT(*) FILTER (WHERE customer.isActive = true) as "totalActive"',
        'COUNT(*) FILTER (WHERE customer.isActive = false) as "totalInactive"',
        "COUNT(*) FILTER (WHERE customer.type = 'individual') as \"totalIndividuals\"",
        "COUNT(*) FILTER (WHERE customer.type = 'company') as \"totalCompanies\"",
        'COALESCE(AVG(customer.loyaltyPoints), 0) as "averageLoyaltyPoints"',
        'COALESCE(SUM(customer.loyaltyPoints), 0) as "totalLoyaltyPoints"',
        `COUNT(*) FILTER (WHERE customer.createdAt >= date_trunc('month', now())) as "newThisMonth"`
      ])
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('customer.isDeleted = false')
      .getRawOne();

    return {
      totalActive: parseInt(stats.totalActive) || 0,
      totalInactive: parseInt(stats.totalInactive) || 0,
      totalIndividuals: parseInt(stats.totalIndividuals) || 0,
      totalCompanies: parseInt(stats.totalCompanies) || 0,
      averageLoyaltyPoints: parseFloat(stats.averageLoyaltyPoints) || 0,
      totalLoyaltyPoints: parseInt(stats.totalLoyaltyPoints) || 0,
      newThisMonth: parseInt(stats.newThisMonth) || 0,
    };
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.customersRepository.count({
      where: { companyId, isDeleted: false },
    });
  }

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      firstName: 'customer.firstName',
      lastName: 'customer.lastName',
      email: 'customer.email',
      createdAt: 'customer.createdAt',
      loyaltyPoints: 'customer.loyaltyPoints',
      companyName: 'customer.companyName',
    };
    return fieldMap[sortField] || 'customer.createdAt';
  }
}
