// src/modules/payment-methods/services/payment-methods-data.service.ts (обновленная версия)
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

  /**
   * 🔒 Получение всех способов оплаты с обязательной фильтрацией по companyId
   */
  async findWithFilters(filter: PaymentMethodsFilter): Promise<[PaymentMethod[], number]> {
    const query = this.paymentMethodRepository.createQueryBuilder('paymentMethod');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('paymentMethod.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтрация по типу
    if (filter.type) {
      query.andWhere('paymentMethod.type = :type', { type: filter.type });
    }

    // Фильтрация по активности
    if (filter.isActive !== undefined) {
      query.andWhere('paymentMethod.isActive = :isActive', { isActive: filter.isActive });
    }

    // Поиск по названию и описанию
    if (filter.search) {
      query.andWhere(
        '(paymentMethod.name ILIKE :search OR paymentMethod.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтрация по поддержке возвратов
    if (filter.supportsRefunds !== undefined) {
      query.andWhere('paymentMethod.supportsRefunds = :supportsRefunds', { supportsRefunds: filter.supportsRefunds });
    }

    // Фильтрация по требованию верификации
    if (filter.requiresVerification !== undefined) {
      query.andWhere('paymentMethod.requiresVerification = :requiresVerification', { requiresVerification: filter.requiresVerification });
    }

    // Фильтрация по наличию интеграции
    if (filter.hasIntegration !== undefined) {
      if (filter.hasIntegration) {
        query.andWhere('paymentMethod.gatewayType IS NOT NULL');
      } else {
        query.andWhere('paymentMethod.gatewayType IS NULL');
      }
    }

    // Сортировка
    const sortBy = filter.sortBy || PAYMENT_METHODS_CONSTANTS.DEFAULT_SORT_BY;
    const sortOrder = filter.sortOrder || PAYMENT_METHODS_CONSTANTS.DEFAULT_SORT_ORDER;
    query.orderBy(`paymentMethod.${sortBy}`, sortOrder);

    // Пагинация
    if (filter.limit) {
      query.limit(filter.limit);
    }

    if (filter.offset) {
      query.offset(filter.offset);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔍 Получение способа оплаты по ID
   */
  async findById(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethodRepository.findOne({
      where: { id }
    });
  }

  /**
   * 🔒 Получение активных способов оплаты компании
   */
  async findActiveByCompany(companyId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: { 
        companyId,
        isActive: true
      },
      order: { name: 'ASC' }
    });
  }

  /**
   * 🔒 Поиск способов оплаты по названию
   */
  async searchByName(name: string, companyId: string, limit: number = 10): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .where('paymentMethod.companyId = :companyId', { companyId })
      .andWhere('paymentMethod.name ILIKE :name', { name: `%${name}%` })
      .orderBy('paymentMethod.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * ➕ Создание нового способа оплаты
   */
  async create(dto: CreatePaymentMethodDto, companyId: string): Promise<PaymentMethod> {
    const paymentMethod = this.paymentMethodRepository.create({
      companyId, // 🔒 Привязываем к компании
      name: dto.name,
      description: dto.description,
      type: dto.type,
      isActive: dto.isActive ?? true,
      
      // 🔥 Processing fee
      processingFeePercent: dto.processingFeePercent,
      
      // 🔥 Limits
      minAmount: dto.limits?.minAmount,
      maxAmount: dto.limits?.maxAmount,
      dailyTransactionLimit: dto.limits?.dailyTransactionLimit,
      
      // 🔥 Features
      supportsRefunds: dto.supportsRefunds ?? true,
      requiresVerification: dto.requiresVerification ?? false,
      
      // 🔥 Installments
      installmentMaxPeriodMonths: dto.installmentConfig?.maxPeriodMonths,
      installmentInterestRate: dto.installmentConfig?.interestRate,
      installmentMinDownPaymentPercent: dto.installmentConfig?.minDownPaymentPercent,
      
      // 🔥 Integration
      gatewayType: dto.integrationConfig?.gatewayType,
      gatewayApiKey: dto.integrationConfig?.apiKey,
      gatewayMerchantId: dto.integrationConfig?.merchantId,
      gatewayWebhookUrl: dto.integrationConfig?.webhookUrl,
      gatewayTestMode: dto.integrationConfig?.testMode ?? true,
    });

    return this.paymentMethodRepository.save(paymentMethod);
  }

  /**
   * ✏️ Обновление способа оплаты
   */
  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const updateData: any = {};

    // Базовые поля
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.processingFeePercent !== undefined) updateData.processingFeePercent = dto.processingFeePercent;
    if (dto.supportsRefunds !== undefined) updateData.supportsRefunds = dto.supportsRefunds;
    if (dto.requiresVerification !== undefined) updateData.requiresVerification = dto.requiresVerification;

    // Limits
    if (dto.limits) {
      if (dto.limits.minAmount !== undefined) updateData.minAmount = dto.limits.minAmount;
      if (dto.limits.maxAmount !== undefined) updateData.maxAmount = dto.limits.maxAmount;
      if (dto.limits.dailyTransactionLimit !== undefined) updateData.dailyTransactionLimit = dto.limits.dailyTransactionLimit;
    }

    // Installments
    if (dto.installmentConfig) {
      if (dto.installmentConfig.maxPeriodMonths !== undefined) updateData.installmentMaxPeriodMonths = dto.installmentConfig.maxPeriodMonths;
      if (dto.installmentConfig.interestRate !== undefined) updateData.installmentInterestRate = dto.installmentConfig.interestRate;
      if (dto.installmentConfig.minDownPaymentPercent !== undefined) updateData.installmentMinDownPaymentPercent = dto.installmentConfig.minDownPaymentPercent;
    }

    // Integration
    if (dto.integrationConfig) {
      if (dto.integrationConfig.gatewayType !== undefined) updateData.gatewayType = dto.integrationConfig.gatewayType;
      if (dto.integrationConfig.apiKey !== undefined) updateData.gatewayApiKey = dto.integrationConfig.apiKey;
      if (dto.integrationConfig.merchantId !== undefined) updateData.gatewayMerchantId = dto.integrationConfig.merchantId;
      if (dto.integrationConfig.webhookUrl !== undefined) updateData.gatewayWebhookUrl = dto.integrationConfig.webhookUrl;
      if (dto.integrationConfig.testMode !== undefined) updateData.gatewayTestMode = dto.integrationConfig.testMode;
    }

    await this.paymentMethodRepository.update(id, updateData);
    
    const updatedPaymentMethod = await this.findById(id);
    if (!updatedPaymentMethod) {
      throw new Error(`PaymentMethod with id ${id} not found after update`);
    }
    
    return updatedPaymentMethod;
  }

  /**
   * 🗑️ Удаление способа оплаты
   */
  async remove(id: string): Promise<void> {
    await this.paymentMethodRepository.delete(id);
  }

  /**
   * 🔄 Переключение статуса активности
   */
  async toggleStatus(id: string): Promise<PaymentMethod> {
    const paymentMethod = await this.findById(id);
    if (!paymentMethod) {
      throw new Error(`PaymentMethod with id ${id} not found`);
    }

    paymentMethod.isActive = !paymentMethod.isActive;
    return this.paymentMethodRepository.save(paymentMethod);
  }

  /**
   * 🔥 Массовое обновление способов оплаты
   */
  async bulkUpdate(paymentMethodIds: string[], updates: Partial<UpdatePaymentMethodDto>): Promise<number> {
    const result = await this.paymentMethodRepository.update(paymentMethodIds, updates);
    return result.affected || 0;
  }

  /**
   * 📊 Получение статистики способов оплаты по компании
   */
  async getPaymentMethodsStats(companyId: string): Promise<PaymentMethodStats> {
    const basicStats = await this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN paymentMethod.isActive = true THEN 1 END) as active',
        'COUNT(CASE WHEN paymentMethod.isActive = false THEN 1 END) as inactive'
      ])
      .where('paymentMethod.companyId = :companyId', { companyId })
      .getRawOne();

    const typeStats = await this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .select([
        'paymentMethod.type as type',
        'COUNT(*) as count'
      ])
      .where('paymentMethod.companyId = :companyId', { companyId })
      .groupBy('paymentMethod.type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = parseInt(basicStats.total) || 0;

    return {
      total,
      active: parseInt(basicStats.active) || 0,
      inactive: parseInt(basicStats.inactive) || 0,
      byType: typeStats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count) || 0,
        percentage: total > 0 ? Math.round((parseInt(stat.count) / total) * 100) : 0,
      })),
      // TODO: Implement when payments system is ready
      totalVolume: 0,
      totalTransactions: 0,
      totalFees: 0,
      averageTransactionAmount: 0,
    };
  }

  /**
   * 🔥 Получение способов оплаты по типу
   */
  async findByType(companyId: string, type: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find({
      where: {
        companyId,
        type,
        isActive: true,
      },
      order: { name: 'ASC' }
    });
  }

  /**
   * 📊 Получение самых используемых способов оплаты
   */
  async getMostUsedPaymentMethods(companyId: string, limit: number = 5): Promise<PaymentMethod[]> {
    // TODO: Implement when payments/transactions data is available
    // For now, return most recent active payment methods
    return this.paymentMethodRepository.find({
      where: {
        companyId,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}