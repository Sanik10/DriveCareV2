// apps/backend/src/modules/customers/services/customers-validation.service.ts
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomersValidationService implements ICustomersValidationService {
  constructor(
    private readonly customersDataService: CustomersDataService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly config: ConfigService,
  ) {}

  async validateCreateData(data: CreateCustomerData): Promise<void> {
    await this.validateEmailUniqueness(data.email, data.companyId);
    this.validateCustomerType(data);
    this.validateContactInfo(data);
    this.validateConsents(data);
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

    if (data.marketingConsent !== undefined || data.pdpConsentVersion !== undefined) {
      this.validateConsents(data as any);
    }
  }

  async validateCustomerExists(id: string): Promise<Customer> {
    const customer = await this.customersDataService.findById(id);
    if (!customer) throw new CustomerNotFoundException(id);
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
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      relations: ['tariff'],
    });

    if (!subscription || !subscription.tariff) {
      throw new ValidationDataException('subscription', 'У компании нет активной подписки');
    }

    const maxCustomers = subscription.tariff.maxCustomers;
    if (maxCustomers === null) return;

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
        throw new ValidationDataException('name', 'Для физических лиц обязательно указать имя или фамилию');
      }
    } else if (data.type === 'company') {
      if (!data.companyName) {
        throw new ValidationDataException('companyName', 'Для юридических лиц обязательно указать название компании');
      }
    }
  }

  private validateContactInfo(data: Partial<CreateCustomerData | UpdateCustomerData>): void {
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-KATEX_INLINE_OPENKATEX_INLINE_CLOSE]{7,15}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        throw new ValidationDataException('phone', 'Некорректный формат телефона');
      }
    }

    if (data.email) {
      if (data.email.length > CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH) {
        throw new ValidationDataException('email', `Email не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH} символов`);
      }
    }
  }

  private validateConsents(data: Partial<CreateCustomerData | UpdateCustomerData>): void {
    // 152‑ФЗ: при включении маркетингового согласия должна соответствовать версия политики
    if (data.marketingConsent === true) {
      const policyVersion = this.config.get<string>('PRIVACY_POLICY_VERSION');
      if (!data.pdpConsentVersion) {
        throw new ValidationDataException('pdpConsentVersion', 'Требуется указать версию политики при согласии на обработку ПДн');
      }
      if (policyVersion && data.pdpConsentVersion !== policyVersion) {
        throw new ValidationDataException('pdpConsentVersion', 'Версия политики не актуальна. Обновите pdpConsentVersion.');
      }
      if (data.pdpConsentVersion && data.pdpConsentVersion.length > 50) {
        throw new ValidationDataException('pdpConsentVersion', 'Версия политики не может превышать 50 символов');
      }
    }
  }
}
