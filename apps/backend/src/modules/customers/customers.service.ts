// apps/backend/src/modules/customers/customers.service.ts
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

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersDataService: CustomersDataService,
    private readonly customersBusinessService: CustomersBusinessService,
    private readonly customersValidationService: CustomersValidationService,
    private readonly customersMapperService: CustomersMapperService,
  ) {}

  // 🔥 DEPRECATED: Убираем методы без user context
  // async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto>

  // 🔒 ОСНОВНОЙ метод создания - всегда с пользователем для security
  async createForUser(createCustomerDto: CreateCustomerDto, user: RequestWithUser['user']): Promise<CustomerResponseDto> {
    // 🔒 КРИТИЧНО: companyId всегда берется из токена пользователя
    const customerData: CreateCustomerData = {
      ...createCustomerDto,
      companyId: user.companyId!, // 🔒 Из токена, не от клиента!
      type: createCustomerDto.type || CustomerType.INDIVIDUAL,
    };
    
    const customer = await this.customersBusinessService.createCustomer(customerData);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  // 🔥 ИСПРАВЛЕНО: Обязательная фильтрация с security проверкой
  async findAll(filter: CustomerFilter): Promise<PaginatedCustomersResponseDto> {
    const [customers, total] = await this.customersDataService.findWithFilters(filter);
    
    const items = customers.map(customer => {
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

  // 🔒 ГЛАВНЫЙ метод для получения списка - с обязательной фильтрацией
  async findAllForUser(user: RequestWithUser['user'], filter: Partial<CustomerFilter> = {}): Promise<PaginatedCustomersResponseDto> {
    const userFilter: CustomerFilter = {
      ...filter,
      // 🔒 КРИТИЧНО: Суперадмин видит все, остальные - только свои
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    };

    return this.findAll(userFilter);
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  // 🔥 НОВОЕ: Безопасный метод с проверкой ownership
  async findOneForUser(id: string, user: RequestWithUser['user']): Promise<CustomerResponseDto> {
    const customer = await this.customersValidationService.validateCustomerOwnership(
      id, 
      user.companyId!
    );
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customersBusinessService.updateCustomer(id, updateCustomerDto);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async remove(id: string): Promise<void> {
    await this.customersBusinessService.deactivateCustomer(id);
  }

  async hardRemove(id: string): Promise<void> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    await this.customersDataService.hardDelete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<CustomerResponseDto> {
    const customer = await this.customersDataService.setActive(id, isActive);
    return this.customersMapperService.mapToResponseDto(customer);
  }

  async getStats(companyId: string): Promise<any> {
    return this.customersDataService.getStats(companyId);
  }
}
