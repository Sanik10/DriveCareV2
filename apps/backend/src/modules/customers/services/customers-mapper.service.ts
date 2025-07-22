import { Injectable } from '@nestjs/common';
import { Customer } from '../../../database/entities/customer.entity';
import { CustomerResponseDto } from '../dto/response/customer-response.dto';
import { CustomerBasicInfo } from '../types/customers.types';

@Injectable()
export class CustomersMapperService {
  
  mapToResponseDto(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      companyId: customer.companyId,
      type: customer.type,
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      taxNumber: customer.taxNumber,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      source: customer.source,
      loyaltyPoints: customer.loyaltyPoints,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      displayName: this.formatCustomerName(customer),
    };
  }

  mapArrayToResponseDto(customers: Customer[]): CustomerResponseDto[] {
    return customers.map(customer => this.mapToResponseDto(customer));
  }

  mapToBasicInfo(customer: Customer): CustomerBasicInfo {
    return {
      id: customer.id,
      name: this.formatCustomerName(customer),
      email: customer.email,
      phone: customer.phone,
      type: customer.type,
      companyId: customer.companyId,
      isActive: customer.isActive,
    };
  }

  mapToSelectOption(customer: Customer): { value: string; label: string; disabled?: boolean } {
    return {
      value: customer.id,
      label: this.formatCustomerName(customer),
      disabled: !customer.isActive,
    };
  }

  formatCustomerName(customer: Customer): string {
    if (customer.type === 'company' && customer.companyName) {
      return customer.companyName;
    }
    
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    
    if (customer.firstName) return customer.firstName;
    if (customer.lastName) return customer.lastName;
    if (customer.companyName) return customer.companyName;
    
    return customer.email;
  }
}
