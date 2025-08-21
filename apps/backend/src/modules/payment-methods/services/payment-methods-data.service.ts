// path: apps/backend/src/modules/payment-methods/services/payment-methods-data.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentMethod } from '../../../database/entities';
import { CreatePaymentMethodDto } from '../dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/request/update-payment-method.dto';
import { PaymentMethodsFilter, PaymentMethodStats } from '../types/payment-methods.types';
import { PAYMENT_METHODS_CONSTANTS } from '../constants/payment-methods.constants';

@Injectable()
export class PaymentMethodsDataService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async findWithFilters(filter: PaymentMethodsFilter): Promise<[PaymentMethod[], number]> {
    const q = this.paymentMethodRepository.createQueryBuilder('pm');

    if (filter.companyId) q.andWhere('pm.companyId = :companyId', { companyId: filter.companyId });
    if (filter.type) q.andWhere('pm.type = :type', { type: filter.type });
    if (filter.isActive !== undefined) q.andWhere('pm.isActive = :isActive', { isActive: filter.isActive });
    if (filter.search) q.andWhere('(pm.name ILIKE :s OR pm.description ILIKE :s)', { s: `%${filter.search}%` });
    if (filter.supportsRefunds !== undefined) q.andWhere('pm.supportsRefunds = :sr', { sr: filter.supportsRefunds });
    if (filter.requiresVerification !== undefined)
      q.andWhere('pm.requiresVerification = :rv', { rv: filter.requiresVerification });
    if (filter.hasIntegration !== undefined) {
      if (filter.hasIntegration) q.andWhere('pm.gatewayType IS NOT NULL');
      else q.andWhere('pm.gatewayType IS NULL');
    }

    const sortBy = filter.sortBy || PAYMENT_METHODS_CONSTANTS.DEFAULT_SORT_BY;
    const dbSortBy = sortBy === 'transactionCount' ? 'createdAt' : sortBy;
    const sortOrder = filter.sortOrder || PAYMENT_METHODS_CONSTANTS.DEFAULT_SORT_ORDER;
    q.orderBy(`pm.${dbSortBy}`, sortOrder as 'ASC' | 'DESC');

    if (filter.limit) q.limit(filter.limit);
    if (filter.offset) q.offset(filter.offset);

    return q.getManyAndCount();
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethodRepository.findOne({ where: { id } });
  }

  async findActiveByCompany(companyId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async searchByName(name: string, companyId: string, limit = 10): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository
      .createQueryBuilder('pm')
      .where('pm.companyId = :companyId', { companyId })
      .andWhere('pm.name ILIKE :name', { name: `%${name}%` })
      .orderBy('pm.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  async create(dto: CreatePaymentMethodDto, companyId: string): Promise<PaymentMethod> {
    const entity = this.paymentMethodRepository.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type as any,
      isActive: dto.isActive ?? true,
      processingFeePercent: dto.processingFeePercent ?? null,
      minAmount: dto.limits?.minAmount ?? null,
      maxAmount: dto.limits?.maxAmount ?? null,
      dailyTransactionLimit: dto.limits?.dailyTransactionLimit ?? null,
      supportsRefunds: dto.supportsRefunds ?? true,
      requiresVerification: dto.requiresVerification ?? false,
      installmentMaxPeriodMonths: dto.installmentConfig?.maxPeriodMonths ?? null,
      installmentInterestRate: dto.installmentConfig?.interestRate ?? null,
      installmentMinDownPaymentPercent: dto.installmentConfig?.minDownPaymentPercent ?? null,
      gatewayType: dto.integrationConfig?.gatewayType ?? null,
      gatewayApiKey: dto.integrationConfig?.apiKey ?? null, // шифруется трансформером (проверим в entity)
      gatewayMerchantId: dto.integrationConfig?.merchantId ?? null,
      gatewayWebhookUrl: dto.integrationConfig?.webhookUrl ?? null,
      gatewayTestMode: dto.integrationConfig?.testMode ?? true,
    });
    return this.paymentMethodRepository.save(entity);
  }

  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const updateData = this.mapUpdateDtoToEntity(dto);
    await this.paymentMethodRepository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`PaymentMethod with id ${id} not found after update`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.paymentMethodRepository.delete(id);
  }

  async toggleStatus(id: string): Promise<PaymentMethod> {
    const pm = await this.findById(id);
    if (!pm) throw new Error(`PaymentMethod with id ${id} not found`);
    pm.isActive = !pm.isActive;
    return this.paymentMethodRepository.save(pm);
  }

  async bulkUpdate(paymentMethodIds: string[], updates: Partial<UpdatePaymentMethodDto>): Promise<number> {
    const updateData = this.mapUpdateDtoToEntity(updates as UpdatePaymentMethodDto);
    const result = await this.paymentMethodRepository.update(paymentMethodIds, updateData);
    return result.affected || 0;
  }

  async getPaymentMethodsStats(companyId: string): Promise<PaymentMethodStats> {
    const basic = await this.paymentMethodRepository
      .createQueryBuilder('pm')
      .select([
        'COUNT(*)::int as total',
        'COUNT(CASE WHEN pm.isActive = true THEN 1 END)::int as active',
        'COUNT(CASE WHEN pm.isActive = false THEN 1 END)::int as inactive',
      ])
      .where('pm.companyId = :companyId', { companyId })
      .getRawOne<{ total: number; active: number; inactive: number }>();

    const typeRows = await this.paymentMethodRepository
      .createQueryBuilder('pm')
      .select(['pm.type as type', 'COUNT(*)::int as count'])
      .where('pm.companyId = :companyId', { companyId })
      .groupBy('pm.type')
      .orderBy('count', 'DESC')
      .getRawMany<{ type: string; count: number }>();

    const total = basic?.total || 0;

    return {
      total,
      active: basic?.active || 0,
      inactive: basic?.inactive || 0,
      byType: typeRows.map((r) => ({
        type: r.type,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
      totalVolume: 0,
      totalTransactions: 0,
      totalFees: 0,
      averageTransactionAmount: 0,
    };
  }

  async findByType(companyId: string, type: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { companyId, type: type as any, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getMostUsedPaymentMethods(companyId: string, limit = 5): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { companyId, isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Разрешенные к обновлению поля из DTO -> сущность
  private mapUpdateDtoToEntity(dto: UpdatePaymentMethodDto): Partial<PaymentMethod> {
    const updateData: Partial<PaymentMethod> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.type !== undefined) updateData.type = dto.type as any;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.processingFeePercent !== undefined) updateData.processingFeePercent = dto.processingFeePercent;
    if (dto.supportsRefunds !== undefined) updateData.supportsRefunds = dto.supportsRefunds;
    if (dto.requiresVerification !== undefined) updateData.requiresVerification = dto.requiresVerification;

    if (dto.limits) {
      if (dto.limits.minAmount !== undefined) updateData.minAmount = dto.limits.minAmount;
      if (dto.limits.maxAmount !== undefined) updateData.maxAmount = dto.limits.maxAmount;
      if (dto.limits.dailyTransactionLimit !== undefined)
        updateData.dailyTransactionLimit = dto.limits.dailyTransactionLimit;
    }

    if (dto.installmentConfig) {
      if (dto.installmentConfig.maxPeriodMonths !== undefined)
        updateData.installmentMaxPeriodMonths = dto.installmentConfig.maxPeriodMonths;
      if (dto.installmentConfig.interestRate !== undefined)
        updateData.installmentInterestRate = dto.installmentConfig.interestRate;
      if (dto.installmentConfig.minDownPaymentPercent !== undefined)
        updateData.installmentMinDownPaymentPercent = dto.installmentConfig.minDownPaymentPercent;
    }

    if (dto.integrationConfig) {
      if (dto.integrationConfig.gatewayType !== undefined) updateData.gatewayType = dto.integrationConfig.gatewayType;
      if (dto.integrationConfig.apiKey !== undefined) updateData.gatewayApiKey = dto.integrationConfig.apiKey; // шифруется
      if (dto.integrationConfig.merchantId !== undefined)
        updateData.gatewayMerchantId = dto.integrationConfig.merchantId;
      if (dto.integrationConfig.webhookUrl !== undefined)
        updateData.gatewayWebhookUrl = dto.integrationConfig.webhookUrl;
      if (dto.integrationConfig.testMode !== undefined) updateData.gatewayTestMode = dto.integrationConfig.testMode;
    }

    return updateData;
  }
}
