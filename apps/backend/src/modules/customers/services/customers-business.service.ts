import { Injectable, Logger } from '@nestjs/common';
import { CustomersDataService } from './customers-data.service';
import { CustomersValidationService } from './customers-validation.service';
import { Customer } from '../../../database/entities/customer.entity';
import { CreateCustomerData, UpdateCustomerData } from '../types/customers.types';
import { ICustomersBusinessService } from '../interfaces/customers.interface';
import { AuditService } from '../../../common/audit/audit.service';

@Injectable()
export class CustomersBusinessService implements ICustomersBusinessService {
  private readonly logger = new Logger(CustomersBusinessService.name);

  constructor(
    private readonly customersDataService: CustomersDataService,
    private readonly customersValidationService: CustomersValidationService,
    private readonly auditService: AuditService,
  ) {}

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    await this.customersValidationService.validateCreateData(data);
    await this.customersValidationService.validateCustomerLimits(data.companyId);

    const customer = await this.customersDataService.create(data);
    
    this.logger.log(`Created customer: ${customer.email} (${customer.id}) for company ${customer.companyId}`);
    
    await this.auditService.logCustomerCreated({
      entityId: customer.id,
      entityType: 'Customer',
      companyId: customer.companyId,
      changes: { after: this.sanitizeCustomerData(customer) },
      metadata: { 
        customerEmail: customer.email,
        customerType: customer.type,
        name: this.formatCustomerName(customer),
      },
    });

    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    await this.customersValidationService.validateUpdateData(id, data);
    
    const oldCustomer = await this.customersDataService.findById(id);
    const updatedCustomer = await this.customersDataService.update(id, data);
    
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
        updatedFields: Object.keys(data),
        name: this.formatCustomerName(updatedCustomer),
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
        customerEmail: customer.email,
      },
    });
  }

  async updateLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    const customer = await this.customersValidationService.validateCustomerExists(customerId);
    
    const newPoints = Math.max(0, customer.loyaltyPoints + points);
    const updatedCustomer = await this.customersDataService.update(customerId, {
      loyaltyPoints: newPoints,
    });
    
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
        customerEmail: customer.email,
        viewType: 'detailed_with_vehicles',
      },
    });

    return customer;
  }

  private sanitizeCustomerData(customer: Customer | null): Partial<Customer> {
    if (!customer) return {};
    
    const { id, type, firstName, lastName, companyName, email, phone, isActive, loyaltyPoints, createdAt, updatedAt } = customer;
    return { id, type, firstName, lastName, companyName, email, phone, isActive, loyaltyPoints, createdAt, updatedAt };
  }

  private formatCustomerName(customer: Customer): string {
    if (customer.type === 'company' && customer.companyName) {
      return customer.companyName;
    }
    
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    
    return customer.firstName || customer.lastName || customer.companyName || customer.email;
  }
}
