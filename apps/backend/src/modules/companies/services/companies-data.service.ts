import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../../database/entities';
import { CreateCompanyData, UpdateCompanyData, CompanyFilter } from '../types/companies.types';
import { ICompaniesDataService } from '../interfaces/companies.interface';
import { COMPANIES_CONSTANTS } from '../constants/companies.constants';

@Injectable()
export class CompaniesDataService implements ICompaniesDataService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  /**
   * Создание новой компании
   */
  async create(data: CreateCompanyData): Promise<Company> {
    const company = this.companiesRepository.create({
      ...data,
      workingHours: data.workingHours || COMPANIES_CONSTANTS.DEFAULTS.DEFAULT_WORKING_HOURS,
      isActive: data.isActive ?? true,
    });

    return this.companiesRepository.save(company);
  }

  /**
   * Получение всех компаний
   */
  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Поиск компании по ID
   */
  async findById(id: string): Promise<Company | null> {
    return this.companiesRepository.findOne({
      where: { id },
    });
  }

  /**
   * Поиск компании по email
   */
  async findByEmail(email: string): Promise<Company | null> {
    return this.companiesRepository.findOne({
      where: { email },
    });
  }

  /**
   * Поиск с фильтрами и пагинацией
   */
  async findWithFilters(filter: CompanyFilter): Promise<[Company[], number]> {
    const {
      search,
      isActive,
      companyId, // 🔥 ДОБАВЛЕНО
      page = 1,
      limit = COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'createdAt',
      sortOrder = 'desc'
    } = filter;

    const query = this.companiesRepository.createQueryBuilder('company');

    // 🔥 КРИТИЧНОЕ ДОБАВЛЕНИЕ - фильтрация по companyId для безопасности
    if (companyId) {
      query.andWhere('company.id = :companyId', { companyId });
    }

    // Фильтр по поиску
    if (search) {
      query.andWhere(
        '(company.name ILIKE :search OR company.legalName ILIKE :search OR company.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Фильтр по статусу активности
    if (isActive !== undefined) {
      query.andWhere('company.isActive = :isActive', { isActive });
    }

    // Сортировка
    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  /**
   * Обновление компании - ИСПРАВЛЕНО
   */
  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    // Создаем объект для обновления, правильно типизированный для TypeORM
    const updateData: Partial<Company> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.legalName !== undefined) updateData.legalName = data.legalName;
    if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.workingHours !== undefined) updateData.workingHours = data.workingHours;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await this.companiesRepository.update(id, updateData);
    
    const updatedCompany = await this.findById(id);
    if (!updatedCompany) {
      throw new Error(`Company with id ${id} not found after update`);
    }
    
    return updatedCompany;
  }

  /**
   * Удаление компании
   */
  async delete(id: string): Promise<void> {
    await this.companiesRepository.delete(id);
  }

  /**
   * Изменение статуса активности
   */
  async setActive(id: string, isActive: boolean): Promise<Company> {
    await this.companiesRepository.update(id, { isActive });
    
    const updatedCompany = await this.findById(id);
    if (!updatedCompany) {
      throw new Error(`Company with id ${id} not found after status update`);
    }
    
    return updatedCompany;
  }

  /**
   * Маппинг полей для сортировки
   */
  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      name: 'company.name',
      email: 'company.email',
      legalName: 'company.legalName',
      createdAt: 'company.createdAt',
    };

    return fieldMap[sortField] || 'company.createdAt';
  }
}