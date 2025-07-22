import { Injectable } from '@nestjs/common';
import { CustomersDataService } from './customers-data.service';
import { Customer } from '../../../database/entities/customer.entity';
import { CreateCustomerData, UpdateCustomerData } from '../types/customers.types';
import { ICustomersValidationService } from '../interfaces/customers.interface';
import { 
  CustomerNotFoundException, 
  CustomerEmailAlreadyExistsException,
  ValidationDataException,
  ResourceOwnershipException,
  CompanyLimitExceededException
} from '../../../common/exceptions/domain.exceptions';
import { CUSTOMERS_CONSTANTS } from '../constants/customers.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../../database/entities';

@Injectable()
export class CustomersValidationService implements ICustomersValidationService {
  constructor(
    private readonly customersDataService: CustomersDataService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async validateCreateData(data: CreateCustomerData): Promise<void> {
    await this.validateEmailUniqueness(data.email, data.companyId);
    this.validateCustomerType(data);
    this.validateContactInfo(data);
  }

  async validateUpdateData(id: string, data: UpdateCustomerData): Promise<void> {
    await this.validateCustomerExists(id);

    if (data.email) {
      const customer = await this.customersDataService.findById(id);
      if (customer && data.email !== customer.email) {
        await this.validateEmailUniqueness(data.email, customer.companyId, id);
      }
    }

    if (data.type !== undefined) {
      this.validateCustomerType(data);
    }

    if (data.phone || data.email) {
      this.validateContactInfo(data);
    }
  }

  async validateCustomerExists(id: string): Promise<Customer> {
    const customer = await this.customersDataService.findById(id);
    
    if (!customer) {
      throw new CustomerNotFoundException(id);
    }

    return customer;
  }

  async validateCustomerOwnership(customerId: string, userCompanyId: string): Promise<Customer> {
    const customer = await this.validateCustomerExists(customerId);
    
    if (customer.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('customer', customerId);
    }

    return customer;
  }

  async validateCustomerLimits(companyId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { 
        companyId, 
        status: SubscriptionStatus.ACTIVE
      },
      relations: ['tariff'],
    });

    if (!subscription || !subscription.tariff) {
      throw new ValidationDataException(
        'subscription',
        'У компании нет активной подписки'
      );
    }

    const maxCustomers = subscription.tariff.maxCustomers;
    if (maxCustomers === null) {
      return;
    }

    const currentCount = await this.customersDataService.countByCompany(companyId);
    if (currentCount >= maxCustomers) {
      throw new CompanyLimitExceededException('customers', currentCount, maxCustomers);
    }
  }

  private async validateEmailUniqueness(email: string, companyId: string, excludeId?: string): Promise<void> {
    const existingCustomer = await this.customersDataService.findByEmail(email, companyId);
    
    if (existingCustomer && existingCustomer.id !== excludeId) {
      throw new CustomerEmailAlreadyExistsException(email, companyId);
    }
  }

  private validateCustomerType(data: Partial<CreateCustomerData | UpdateCustomerData>): void {
    if (data.type === 'individual') {
      if (!data.firstName && !data.lastName) {
        throw new ValidationDataException(
          'name',
          'Для физических лиц обязательно указать имя или фамилию'
        );
      }
    } else if (data.type === 'company') {
      if (!data.companyName) {
        throw new ValidationDataException(
          'companyName',
          'Для юридических лиц обязательно указать название компании'
        );
      }
    }
  }

  private validateContactInfo(data: Partial<CreateCustomerData | UpdateCustomerData>): void {
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        throw new ValidationDataException(
          'phone',
          'Некорректный формат телефона'
        );
      }
    }

    if (data.email) {
      if (data.email.length > CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH) {
        throw new ValidationDataException(
          'email',
          `Email не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH} символов`
        );
      }
    }
  }
}
