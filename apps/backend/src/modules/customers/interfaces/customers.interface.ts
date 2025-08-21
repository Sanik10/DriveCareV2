// apps/backend/src/modules/customers/interfaces/customers.interface.ts
import { Customer } from '../../../database/entities/customer.entity';
import { 
  CreateCustomerData, 
  UpdateCustomerData, 
  CustomerFilter,
  PaginatedCustomersResult,
  CustomerStats,
  CustomerBasicInfo 
} from '../types/customers.types';

export interface ICustomersDataService {
  create(data: CreateCustomerData): Promise<Customer>;
  findAll(): Promise<Customer[]>;
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string, companyId: string): Promise<Customer | null>;
  findWithFilters(filter: CustomerFilter): Promise<[Customer[], number]>;
  update(id: string, data: UpdateCustomerData): Promise<Customer>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<Customer>;
  getStats(companyId: string): Promise<CustomerStats>;
  countByCompany(companyId: string): Promise<number>;
}

export interface ICustomersValidationService {
  validateCreateData(data: CreateCustomerData): Promise<void>;
  validateUpdateData(id: string, data: UpdateCustomerData): Promise<void>;
  validateCustomerExists(id: string): Promise<Customer>;
  validateCustomerOwnership(customerId: string, userCompanyId: string): Promise<Customer>;
  validateCustomerLimits(companyId: string): Promise<void>;
}

export interface ICustomersBusinessService {
  createCustomer(data: CreateCustomerData): Promise<Customer>;
  updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer>;
  deactivateCustomer(id: string): Promise<void>;
  softDeleteCustomer(id: string): Promise<void>;
  hardDeleteCustomer(id: string): Promise<void>;
  updateLoyaltyPoints(customerId: string, points: number): Promise<Customer>;
  getCustomerWithVehicles(id: string, companyId: string): Promise<any>;
}

export interface ICustomersMapperService {
  mapToResponseDto(customer: Customer): any;
  mapArrayToResponseDto(customers: Customer[]): any[];
  mapToBasicInfo(customer: Customer): CustomerBasicInfo;
  mapToSelectOption(customer: Customer): { value: string; label: string; disabled?: boolean };
  formatCustomerName(customer: Customer): string;
}
