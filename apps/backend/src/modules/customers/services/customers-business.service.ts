// apps/backend/src/modules/customers/services/customers-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CustomersDataService } from './customers-data.service';
import { CustomersValidationService } from './customers-validation.service';
import { Customer, CustomerType } from '../../../database/entities/customer.entity';
import { CreateCustomerData, UpdateCustomerData } from '../types/customers.types';
import { ICustomersBusinessService } from '../interfaces/customers.interface';
import { AuditService } from '../../../common/audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { RevokeCustomerConsentDto } from '../dto/request/revoke-consent.dto';

@Injectable()
export class CustomersBusinessService implements ICustomersBusinessService {
  private readonly logger = new Logger(CustomersBusinessService.name);

  constructor(
    private readonly customersDataService: CustomersDataService,
    private readonly customersValidationService: CustomersValidationService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    await this.customersValidationService.validateCreateData(data);
    await this.customersValidationService.validateCustomerLimits(data.companyId);

    const policyVersion = this.config.get<string>('PRIVACY_POLICY_VERSION');
    const payload: CreateCustomerData = { ...data };

    if (payload.marketingConsent === true) {
      payload.marketingConsentDate = new Date();
    } else if (payload.marketingConsent === false) {
      payload.marketingConsentDate = new Date();
    }

    if (payload.marketingConsent === true) {
      payload.pdpConsentVersion = payload.pdpConsentVersion || policyVersion || null;
      if (payload.pdpConsentVersion) {
        payload.pdpConsentDate = new Date();
      }
    }

    const customer = await this.customersDataService.create(payload);
    
    this.logger.log(`Created customer: ${customer.email} (${customer.id}) for company ${customer.companyId}`);
    
    await this.auditService.logCustomerCreated({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      changes: { after: this.sanitizeCustomerData(customer) },
      metadata: { 
        customerEmail: this.maskEmail(customer.email),
        customerType: customer.type,
        name: this.formatCustomerName(customer),
      },
    });

    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    await this.customersValidationService.validateUpdateData(id, data);
    
    const oldCustomer = await this.customersDataService.findById(id);
    if (!oldCustomer) {
      throw new Error(`Customer with id ${id} not found`);
    }

    const patch: UpdateCustomerData = { ...data };
    const policyVersion = this.config.get<string>('PRIVACY_POLICY_VERSION');

    if (typeof data.marketingConsent === 'boolean' && data.marketingConsent !== oldCustomer.marketingConsent) {
      patch.marketingConsentDate = new Date();
      if (data.marketingConsent === true) {
        patch.pdpConsentVersion = data.pdpConsentVersion || policyVersion || oldCustomer.pdpConsentVersion || null;
        if (patch.pdpConsentVersion) {
          patch.pdpConsentDate = new Date();
        }
      }
    }

    const updatedCustomer = await this.customersDataService.update(id, patch);
    
    this.logger.log(`Updated customer: ${updatedCustomer.email} (${updatedCustomer.id})`);
    
    await this.auditService.logCustomerUpdated({
      entityId: updatedCustomer.id,
      entityType: 'Customer',
      companyId: updatedCustomer.companyId,
      changes: {
        before: this.sanitizeCustomerData(oldCustomer),
        after: this.sanitizeCustomerData(updatedCustomer),
      },
      metadata: {
        updatedFields: Object.keys(patch),
        name: this.formatCustomerName(updatedCustomer),
        customerEmail: this.maskEmail(updatedCustomer.email),
      },
    });

    return updatedCustomer;
  }

  async deactivateCustomer(id: string): Promise<void> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    await this.customersDataService.setActive(id, false);
    this.logger.log(`Deactivated customer: ${customer.email} (${customer.id})`);
    await this.auditService.logCustomerStatusChanged({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      changes: {
        before: { isActive: true },
        after: { isActive: false },
      },
      metadata: {
        action: 'deactivated',
        name: this.formatCustomerName(customer),
        customerEmail: this.maskEmail(customer.email),
      },
    });
  }

  async softDeleteCustomer(id: string): Promise<void> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    await this.customersDataService.softDelete(id);
    this.logger.log(`Soft-deleted customer: ${customer.email} (${customer.id})`);
    await this.auditService.logCustomerDeleted({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      changes: {
        before: this.sanitizeCustomerData(customer),
        after: { isDeleted: true, deletedAt: new Date() },
      },
      metadata: {
        action: 'soft_delete',
        name: this.formatCustomerName(customer),
        customerEmail: this.maskEmail(customer.email),
      },
    });
  }

  async hardDeleteCustomer(id: string): Promise<void> {
    const customer = await this.customersValidationService.validateCustomerExists(id);
    await this.customersDataService.hardDelete(id);
    this.logger.warn(`Hard-deleted customer: ${customer.email} (${customer.id})`);
    await this.auditService.logCustomerDeleted({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      changes: {
        before: this.sanitizeCustomerData(customer),
        after: null,
      },
      metadata: {
        action: 'hard_delete',
        name: this.formatCustomerName(customer),
        customerEmail: this.maskEmail(customer.email),
      },
    });
  }

  async updateLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    const customer = await this.customersValidationService.validateCustomerExists(customerId);
    const newPoints = Math.max(0, customer.loyaltyPoints + points);
    const updatedCustomer = await this.customersDataService.update(customerId, { loyaltyPoints: newPoints });
    this.logger.log(`Updated loyalty points for customer ${customerId}: ${customer.loyaltyPoints} -> ${newPoints}`);
    return updatedCustomer;
  }

  async getCustomerWithVehicles(id: string, companyId: string): Promise<any> {
    const customer = await this.customersValidationService.validateCustomerOwnership(id, companyId);
    await this.auditService.logCustomerViewed({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      metadata: {
        name: this.formatCustomerName(customer),
        customerEmail: this.maskEmail(customer.email),
        viewType: 'detailed_with_vehicles',
      },
    });
    return customer;
  }

  // Отзыв согласия (152‑ФЗ): поддерживаем pdn_processing/marketing
  async revokeCustomerConsent(customerId: string, dto: RevokeCustomerConsentDto, user: { id: string; companyId: string }) {
    const customer = await this.customersValidationService.validateCustomerExists(customerId);

    const patch: UpdateCustomerData = {};
    const now = new Date();

    if (dto.consentType === 'marketing') {
      patch.marketingConsent = false;
      patch.marketingConsentDate = now;
    } else {
      // pdn_processing: минимально — отключаем маркетинг и зануляем дату согласия ПДн, версию не стираем (историчность)
      patch.marketingConsent = false;
      patch.marketingConsentDate = now;
      patch.pdpConsentDate = null;
    }

    // по желанию: можно деактивировать клиента (но не удалять)
    patch.isActive = false;

    const updated = await this.customersDataService.update(customerId, patch);

    await this.auditService.logCustomerConsentRevoked({
      entityId: updated.id,
      entityType: 'Customer',
      companyId: updated.companyId,
      userId: user.id,
      details: {
        consentType: dto.consentType,
        reason: dto.reason || 'by_request',
      },
    });

    return updated;
  }

  private sanitizeCustomerData(customer: Customer | null): Partial<Customer> {
    if (!customer) return {};
    const { id, type, firstName, lastName, companyName, email, phone, isActive, loyaltyPoints, createdAt, updatedAt } = customer;
    return { id, type, firstName, lastName, companyName, email, phone, isActive, loyaltyPoints, createdAt, updatedAt };
  }

  private formatCustomerName(customer: Customer): string {
    if (customer.type === CustomerType.COMPANY && customer.companyName) return customer.companyName;
    if (customer.firstName && customer.lastName) return `${customer.firstName} ${customer.lastName}`;
    return customer.firstName || customer.lastName || customer.companyName || customer.email;
  }

  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const maskedUser = user.length <= 2 ? '*'.repeat(user.length) : user[0] + '*'.repeat(user.length - 2) + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  }
}
