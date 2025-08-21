// path: apps/backend/src/modules/customers/services/customer-anonymization.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from '../../../database/entities/customer.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { AuditService } from '../../../common/audit/audit.service';

@Injectable()
export class CustomerAnonymizationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    private readonly audit: AuditService,
  ) {}

  async anonymizeCustomer(customerId: string, companyId: string, context?: { userId?: string; ip?: string; ua?: string }) {
    const existing = await this.customersRepo.findOne({ where: { id: customerId, companyId } });
    if (!existing) throw new Error('Customer not found');

    if (existing.anonymizedAt) {
      return existing;
    }

    const now = new Date();
    const placeholderEmail = `anon+${existing.id}@anon.invalid`;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Customer, { id: existing.id }, {
        firstName: null,
        lastName: null,
        companyName: null,
        taxNumber: null,
        address: null,
        notes: null,
        email: placeholderEmail,
        emailNormalized: placeholderEmail.toLowerCase(),
        phone: '0000000000',
        phoneE164: null,
        source: 'anonymized',
        marketingConsent: false,
        pdpConsentDate: null,
        isActive: false,
        isDeleted: true,
        deletedAt: now,
        anonymizedAt: now,
        anonymizedBy: context?.userId || null,
      });

      await manager
        .createQueryBuilder()
        .update(Vehicle)
        .set({
          vin: null,
          licensePlate: null,
          notes: null,
          isActive: false,
        })
        .where('customer_id = :customerId', { customerId: existing.id })
        .execute();
    });

    const after = await this.customersRepo.findOne({ where: { id: existing.id } });

    await this.audit.logCustomerAnonymized({
      entityId: existing.id,
      entityType: 'Customer',
      companyId,
      userId: context?.userId,
      ipAddress: context?.ip,
      userAgent: context?.ua,
      details: {
        action: 'anonymize',
        vehiclesAffected: await this.vehiclesRepo.count({ where: { customerId: existing.id } }),
      },
    });

    return after;
  }
}
