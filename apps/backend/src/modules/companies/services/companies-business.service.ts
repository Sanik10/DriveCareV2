import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { CompaniesDataService } from './companies-data.service';
import { Company } from '../../../database/entities';
import { CreateCompanyData, UpdateCompanyData } from '../types/companies.types';
import { ICompaniesBusinessService } from '../interfaces/companies.interface';

@Injectable()
export class CompaniesBusinessService implements ICompaniesBusinessService {
  constructor(
    private readonly companiesDataService: CompaniesDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Создание компании с бизнес-логикой
   */
  async createCompany(data: CreateCompanyData): Promise<Company> {
    const company = await this.companiesDataService.create(data);

    // Логируем создание
    await this.auditService.logCompanyCreated({
      entityId: company.id,
      entityType: 'Company',
      companyId: company.id,
      changes: { after: this.sanitizeCompanyData(company) },
      metadata: { name: company.name, email: company.email },
    });

    return company;
  }

  /**
   * Обновление компании с бизнес-логикой
   */
  async updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
    const beforeCompany = await this.companiesDataService.findById(id);
    if (!beforeCompany) {
      throw new Error(`Company with id ${id} not found`);
    }

    const updatedCompany = await this.companiesDataService.update(id, data);

    // Логируем обновление
    await this.auditService.logCompanyUpdated({
      entityId: id,
      entityType: 'Company',
      companyId: id,
      changes: {
        before: this.sanitizeCompanyData(beforeCompany),
        after: this.sanitizeCompanyData(updatedCompany),
      },
      metadata: { 
        updatedFields: Object.keys(data),
        name: updatedCompany.name,
      },
    });

    return updatedCompany;
  }

  /**
   * Удаление компании с бизнес-логикой
   */
  async deleteCompany(id: string): Promise<void> {
    const company = await this.companiesDataService.findById(id);
    if (!company) {
      throw new Error(`Company with id ${id} not found`);
    }

    await this.companiesDataService.delete(id);

    // Логируем удаление
    await this.auditService.logCompanyDeleted({
      entityId: id,
      entityType: 'Company',
      companyId: id,
      changes: { before: this.sanitizeCompanyData(company) },
      metadata: { 
        name: company.name,
        email: company.email,
      },
    });
  }

  /**
   * Изменение статуса компании с бизнес-логикой
   */
  async toggleCompanyStatus(id: string, isActive: boolean): Promise<Company> {
    const beforeCompany = await this.companiesDataService.findById(id);
    if (!beforeCompany) {
      throw new Error(`Company with id ${id} not found`);
    }

    const updatedCompany = await this.companiesDataService.setActive(id, isActive);

    // Логируем изменение статуса
    await this.auditService.logCompanyStatusChanged({
      entityId: id,
      entityType: 'Company',
      companyId: id,
      changes: {
        before: { isActive: beforeCompany.isActive },
        after: { isActive: updatedCompany.isActive },
      },
      metadata: { 
        name: updatedCompany.name,
        statusAction: isActive ? 'activated' : 'deactivated',
      },
    });

    return updatedCompany;
  }

  /**
   * Санитизация данных компании для аудита
   */
  private sanitizeCompanyData(company: Company): Partial<Company> {
    const { id, name, legalName, email, phone, address, isActive, createdAt, updatedAt } = company;
    return { id, name, legalName, email, phone, address, isActive, createdAt, updatedAt };
  }
}