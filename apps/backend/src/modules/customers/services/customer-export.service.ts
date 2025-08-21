// path: apps/backend/src/modules/customers/services/customer-export.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../database/entities/customer.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { Order } from '../../../database/entities/order.entity';
import { AuditService } from '../../../common/audit/audit.service';

@Injectable()
export class CustomerExportService {
  constructor(
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly audit: AuditService,
  ) {}

  async exportCustomerData(customerId: string, companyId: string, context?: { userId?: string; ip?: string; ua?: string }) {
    const customer = await this.customersRepo.findOne({
      where: { id: customerId, companyId, isDeleted: false },
      relations: ['vehicles'],
    });
    if (!customer) {
      throw new Error('Customer not found or not accessible');
    }

    const vehicles = customer.vehicles || [];

    const byStatusRaw = await this.ordersRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(order.finalAmount),0)::numeric', 'sum')
      .where('order.companyId = :companyId AND order.customerId = :customerId', { companyId, customerId })
      .groupBy('order.status')
      .getRawMany();

    const byStatus = byStatusRaw.reduce((acc: Record<string, any>, row) => {
      acc[row.status] = {
        count: Number(row.count || 0),
        totalAmount: Number(row.sum || 0),
      };
      return acc;
    }, {});

    const datesRaw = await this.ordersRepo
      .createQueryBuilder('order')
      .select('MIN(order.createdAt)', 'firstOrderAt')
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .where('order.companyId = :companyId AND order.customerId = :customerId', { companyId, customerId })
      .getRawOne();

    const payload = {
      meta: {
        schemaVersion: '1.0',
        generatedAt: new Date().toISOString(),
        companyId,
        customerId,
      },
      customer: {
        id: customer.id,
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
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        consents: {
          marketingConsent: customer.marketingConsent,
          marketingConsentDate: customer.marketingConsentDate,
          pdpConsentVersion: customer.pdpConsentVersion,
          pdpConsentDate: customer.pdpConsentDate,
        },
        retention: {
          dataRetentionUntil: customer.dataRetentionUntil,
          anonymizedAt: customer.anonymizedAt,
        },
      },
      vehicles: vehicles.map((v) => ({
        id: v.id,
        vin: v.vin,
        licensePlate: v.licensePlate,
        year: v.year,
        color: v.color,
        engineType: v.engineType,
        engineVolume: v.engineVolume,
        mileage: v.mileage,
        lastServiceDate: v.lastServiceDate,
        nextServiceDate: v.nextServiceDate,
        notes: v.notes,
        isActive: v.isActive,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
      ordersSummary: {
        byStatus,
        firstOrderAt: datesRaw?.firstOrderAt || null,
        lastOrderAt: datesRaw?.lastOrderAt || null,
      },
    };

    await this.audit.logCustomerExported({
      entityId: customer.id,
      entityType: 'Customer',
      companyId,
      userId: context?.userId,
      ipAddress: context?.ip,
      userAgent: context?.ua,
      details: {
        export: 'customer_full_export',
        vehiclesCount: vehicles.length,
        ordersSummaryStatuses: Object.keys(byStatus),
      },
    });

    return payload;
  }
}
