// apps/backend/src/modules/customers/services/customers-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Customer, CustomerType } from '../../../database/entities/customer.entity';
import { CustomerResponseDto } from '../dto/response/customer-response.dto';
import { CustomerBasicInfo } from '../types/customers.types';
import { CUSTOMERS_CONSTANTS } from '../constants/customers.constants';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomersMapperService {
  mapToResponseDto(customer: Customer): CustomerResponseDto {
    // Базовый plain-объект
    const plain = {
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
    return plainToInstance(CustomerResponseDto, plain, { groups: ['pii'] });
  }

  // PII-aware mapping с группами: 'pii' | 'redacted'
  mapToResponseDtoForRole(customer: Customer, role?: string): CustomerResponseDto {
    const group = this.isPIIAllowedRole(role) ? 'pii' : 'redacted';

    // Для redacted — маскируем email/phone, address/notes скрываются группами
    const maskedEmail = group === 'pii' ? customer.email : this.maskEmail(customer.email) || '';
    const maskedPhone = group === 'pii' ? customer.phone : this.maskPhone(customer.phone) || '';

    const plain = {
      id: customer.id,
      companyId: customer.companyId,
      type: customer.type,
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      taxNumber: customer.taxNumber,
      email: maskedEmail,
      phone: maskedPhone,
      address: customer.address,
      source: customer.source,
      loyaltyPoints: customer.loyaltyPoints,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      displayName: this.formatCustomerName(customer),
    };

    return plainToInstance(CustomerResponseDto, plain, { groups: [group] });
  }

  mapArrayToResponseDto(customers: Customer[]): CustomerResponseDto[] {
    return customers.map((c) => this.mapToResponseDto(c));
  }

  mapArrayToResponseDtoForRole(customers: Customer[], role?: string): CustomerResponseDto[] {
    return customers.map((c) => this.mapToResponseDtoForRole(c, role));
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
    if (customer.type === CustomerType.COMPANY && customer.companyName) return customer.companyName;
    if (customer.firstName && customer.lastName) return `${customer.firstName} ${customer.lastName}`;
    if (customer.firstName) return customer.firstName;
    if (customer.lastName) return customer.lastName;
    if (customer.companyName) return customer.companyName;
    return customer.email;
  }

  private isPIIAllowedRole(role?: string): boolean {
    if (!role) return false;
    return CUSTOMERS_CONSTANTS.PII.VISIBLE_ROLES.includes(role as any);
  }

  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const maskedUser = user.length <= 2 ? '*'.repeat(user.length) : user[0] + '*'.repeat(user.length - 2) + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  }

  private maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '*'.repeat(digits.length);
    const visibleStart = phone.slice(0, 3);
    const visibleEnd = phone.slice(-2);
    return `${visibleStart}${'*'.repeat(Math.max(0, phone.length - 5))}${visibleEnd}`;
  }
}
