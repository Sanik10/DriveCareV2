// path: apps/backend/src/modules/customers/customers.service.ts
import { Injectable } from '@nestjs/common';
import { CustomersDataService } from './services/customers-data.service';
import { CustomersBusinessService } from './services/customers-business.service';
import { CustomersValidationService } from './services/customers-validation.service';
import { CustomersMapperService } from './services/customers-mapper.service';
import { CreateCustomerDto } from './dto/request/create-customer.dto';
import { UpdateCustomerDto } from './dto/request/update-customer.dto';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { PaginatedCustomersResponseDto } from './dto/response/paginated-customers-response.dto';
import { CustomerFilter, CreateCustomerData } from './types/customers.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CustomerType } from '../../database/entities';
import { CustomerExportService } from './services/customer-export.service';
import { CustomerAnonymizationService } from './services/customer-anonymization.service';
import { RevokeCustomerConsentDto } from './dto/request/revoke-consent.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersDataService: CustomersDataService,
    private readonly customersBusinessService: CustomersBusinessService,
    private readonly customersValidationService: CustomersValidationService,
    private readonly customersMapperService: CustomersMapperService,
    private readonly exportService: CustomerExportService,
    private readonly anonymizationService: CustomerAnonymizationService,
  ) {}

  async createForUser(createCustomerDto: CreateCustomerDto, user: RequestWithUser['user']): Promise<CustomerResponseDto> {
    const customerData: CreateCustomerData = {
      ...createCustomerDto,
      companyId: user.companyId!,
      type: createCustomerDto.type || CustomerType.INDIVIDUAL,
    };
    const customer = await this.customersBusinessService.createCustomer(customerData);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async findAll(filter: CustomerFilter): Promise<PaginatedCustomersResponseDto> {
    const [customers, total] = await this.customersDataService.findWithFilters(filter);
    const items = customers.map((customer) => {
      const dto = this.customersMapperService.mapToResponseDto(customer);
      dto.vehiclesCount = customer.vehicles?.length || 0;
      return dto;
    });
    const totalPages = Math.ceil(total / (filter.limit || 20));
    const page = filter.page || 1;
    return {
      items,
      total,
      page,
      limit: filter.limit || 20,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findAllForUser(user: RequestWithUser['user'], filter: Partial<CustomerFilter> = {}): Promise<PaginatedCustomersResponseDto> {
    const userFilter: CustomerFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    };
    const [customers, total] = await this.customersDataService.findWithFilters(userFilter);
    const items = customers.map((customer) => {
      const dto = this.customersMapperService.mapToResponseDtoForRole(customer, user.role);
      dto.vehiclesCount = customer.vehicles?.length || 0;
      return dto;
    });
    const totalPages = Math.ceil(total / (userFilter.limit || 20));
    const page = userFilter.page || 1;
    return {
      items,
      total,
      page,
      limit: userFilter.limit || 20,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async findOneForUser(id: string, user: RequestWithUser['user']): Promise<CustomerResponseDto> {
    const customer = await this.customersValidationService.validateCustomerOwnership(id, user.companyId!);
    return this.customersMapperService.mapToResponseDtoForRole(customer, user.role);
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customersBusinessService.updateCustomer(id, updateCustomerDto);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async remove(id: string): Promise<void> {
    await this.customersBusinessService.softDeleteCustomer(id);
  }

  async hardRemove(id: string): Promise<void> {
    await this.customersBusinessService.hardDeleteCustomer(id);
  }

  async setActive(id: string, isActive: boolean): Promise<CustomerResponseDto> {
    const customer = await this.customersDataService.setActive(id, isActive);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async getStats(companyId: string): Promise<any> {
    return this.customersDataService.getStats(companyId);
  }

  // === Права субъекта ПДн ===

  async exportForUser(customerId: string, user: RequestWithUser['user'], context?: { ip?: string; ua?: string }) {
    await this.customersValidationService.validateCustomerOwnership(customerId, user.companyId!);
    return this.exportService.exportCustomerData(customerId, user.companyId!, { userId: user.id, ip: context?.ip, ua: context?.ua });
  }

  async revokeCustomerConsent(customerId: string, dto: RevokeCustomerConsentDto, user: RequestWithUser['user']): Promise<CustomerResponseDto> {
    await this.customersValidationService.validateCustomerOwnership(customerId, user.companyId!);
    const updated = await this.customersBusinessService.revokeCustomerConsent(customerId, dto, user);
    return this.customersMapperService.mapToResponseDtoForRole(updated, user.role);
  }

  async anonymize(customerId: string, user: RequestWithUser['user'], context?: { ip?: string; ua?: string }): Promise<CustomerResponseDto> {
    await this.customersValidationService.validateCustomerOwnership(customerId, user.companyId!);
    const anonymized = await this.anonymizationService.anonymizeCustomer(customerId, user.companyId!, { userId: user.id, ip: context?.ip, ua: context?.ua });
    return this.customersMapperService.mapToResponseDtoForRole(anonymized, user.role);
  }
}
