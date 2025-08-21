import { Company } from '../../../database/entities';
import { CompanyFilter, CreateCompanyData, UpdateCompanyData, PaginatedCompaniesResult } from '../types/companies.types';

// ✅ ИСПРАВЛЕНО: Интерфейсы соответствуют реализации
export interface ICompaniesDataService {
  create(data: CreateCompanyData): Promise<Company>;
  findAll(userCompanyId?: string, userRole?: string): Promise<Company[]>;
  findById(id: string, userCompanyId?: string, userRole?: string): Promise<Company | null>;
  findByEmail(email: string): Promise<Company | null>;
  findWithFilters(
    filter: CompanyFilter, 
    userCompanyId?: string, 
    userRole?: string
  ): Promise<[Company[], number]>;
  update(id: string, data: UpdateCompanyData): Promise<Company>;
  delete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<Company>;
}

export interface ICompaniesBusinessService {
  createCompany(
    data: CreateCompanyData,
    createdBy: string,
    userRole: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company>;
  
  updateCompany(
    id: string, 
    data: UpdateCompanyData,
    updatedBy: string,
    userRole: string,
    userCompanyId: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company>;
  
  deleteCompany(
    id: string,
    deletedBy: string,
    userRole: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<void>;
  
  toggleCompanyStatus(
    id: string, 
    isActive: boolean,
    updatedBy: string,
    userRole: string,
    userCompanyId: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company>;
}

export interface ICompaniesValidationService {
  validateCreateData(
    data: CreateCompanyData,
    userRole?: string,
    userId?: string
  ): Promise<void>;
  
  validateUpdateData(
    id: string, 
    data: UpdateCompanyData,
    userRole?: string,
    userCompanyId?: string,
    userId?: string
  ): Promise<void>;
  
  validateCompanyExists(
    id: string,
    userCompanyId?: string,
    userRole?: string
  ): Promise<Company>;
}
