// path: apps/backend/src/modules/customers/services/customers-validation.service.ts
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
  CompanyLimitExceededException,
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
    const enforce = this.shouldEnforceSubscriptionLimits();

    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      relations: ['tariff'],
    });

    // В DEV/QA (или при флаге отключения) не блокируем отсутствие подписки
    if (!subscription || !subscription.tariff) {
      if (!enforce) return;
      throw new ValidationDataException('subscription', 'У компании нет активной подписки');
    }

    const maxCustomers = (subscription.tariff as any).maxCustomers;

    // Безлимитный тариф или поле не задано
    if (maxCustomers === null || maxCustomers === undefined) return;

    const currentCount = await this.customersDataService.countByCompany(companyId);

    // В DEV/QA не блокируем даже при превышении лимитов
    if (!enforce) return;

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
      // Поддерживаем +E.164 или локальные форматы с 8/7/10 знаками, пробелы/дефисы допустимы
      const normalized = String(data.phone).replace(/\s+/g, '');
      const phoneRegex = /^[+]?[\d\-() ]{7,20}$/;
      if (!phoneRegex.test(normalized)) {
        throw new ValidationDataException('phone', 'Некорректный формат телефона');
      }
      if (String(data.phone).length > CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH) {
        throw new ValidationDataException(
          'phone',
          `Телефон не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH} символов`,
        );
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

  private shouldEnforceSubscriptionLimits(): boolean {
    // Флаг через ENV (CUSTOMERS_ENFORCE_LIMITS=false отключает лимиты), по умолчанию включаем только в production
    const rawFlag = this.config.get<string>('CUSTOMERS_ENFORCE_LIMITS') ?? process.env.CUSTOMERS_ENFORCE_LIMITS;
    if (typeof rawFlag === 'string' && rawFlag.length > 0) {
      return !/^(0|false|no|off)$/i.test(rawFlag);
    }
    const env = (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'production';
  }
}
