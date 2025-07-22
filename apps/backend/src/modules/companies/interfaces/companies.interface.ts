import { Company } from '../../../database/entities';
import { CompanyFilter, CreateCompanyData, UpdateCompanyData, PaginatedCompaniesResult } from '../types/companies.types';

export interface ICompaniesDataService {
  create(data: CreateCompanyData): Promise<Company>;
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  findByEmail(email: string): Promise<Company | null>;
  findWithFilters(filter: CompanyFilter): Promise<[Company[], number]>;
  update(id: string, data: UpdateCompanyData): Promise<Company>;
  delete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<Company>;
}

export interface ICompaniesBusinessService {
  createCompany(data: CreateCompanyData): Promise<Company>;
  updateCompany(id: string, data: UpdateCompanyData): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  toggleCompanyStatus(id: string, isActive: boolean): Promise<Company>;
}

export interface ICompaniesValidationService {
  validateCreateData(data: CreateCompanyData): Promise<void>;
  validateUpdateData(id: string, data: UpdateCompanyData): Promise<void>;
  validateCompanyExists(id: string): Promise<Company>;
}
