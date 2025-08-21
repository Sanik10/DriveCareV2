// path: apps/backend/src/modules/inventory/suppliers/suppliers.service.ts
import { Injectable, Logger, Inject, ConflictException } from '@nestjs/common';
import { SuppliersDataService } from './services/suppliers-data.service';
import { SuppliersBusinessService } from './services/suppliers-business.service';
import { SuppliersValidationService } from './services/suppliers-validation.service';
import { SuppliersMapperService } from './services/suppliers-mapper.service';
import { CreateSupplierDto } from './dto/request/create-supplier.dto';
import { UpdateSupplierDto } from './dto/request/update-supplier.dto';
import { BulkSuppliersDto } from './dto/request/bulk-suppliers.dto';
import { SupplierResponseDto } from './dto/response/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/response/paginated-suppliers-response.dto';
import { SupplierRatingResponseDto } from './dto/response/supplier-rating-response.dto';
import { SupplierAnalyticsResponseDto } from './dto/response/supplier-analytics-response.dto';
import {
  SupplierFilter,
  SupplierRatingData,
  BulkSupplierResult,
  CreateSupplierData,
} from './types/suppliers.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);
  private readonly idempTtlMs: number;

  constructor(
    private readonly suppliersDataService: SuppliersDataService,
    private readonly suppliersBusinessService: SuppliersBusinessService,
    private readonly suppliersValidationService: SuppliersValidationService,
    private readonly suppliersMapperService: SuppliersMapperService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.idempTtlMs = this.configService.get<number>('inventory.idempotencyTtlMs') ?? 21600000;
  }

  private canViewContacts(role: string): boolean {
    return INVENTORY_CONSTANTS.ROLES.CAN_MANAGE_SUPPLIERS.includes(role as any);
  }

  async findAll(filter: SupplierFilter = {}, user: RequestWithUser['user']): Promise<PaginatedSuppliersResponseDto> {
    this.logger.log(`Finding suppliers with filters: ${JSON.stringify({ ...filter, search: !!filter.search })}`);
    const [suppliers, total] = await this.suppliersDataService.findWithFilters(filter);
    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const maskContacts = !this.canViewContacts(user.role);
    return this.suppliersMapperService.mapToPaginatedResponse(
      suppliers,
      total,
      page,
      limit,
      filter,
      maskContacts,
    );
  }

  async findOne(id: string, user: RequestWithUser['user']): Promise<SupplierResponseDto> {
    this.logger.log(`Finding supplier: ${id}`);
    const supplier = await this.suppliersValidationService.validateSupplierExists(id);
    return this.suppliersMapperService.mapToResponseDto(supplier, !this.canViewContacts(user.role));
  }

  async create(createSupplierDto: CreateSupplierDto, user: RequestWithUser['user']): Promise<SupplierResponseDto> {
    this.logger.log(`Creating supplier for company: ${user.companyId}`);
    const supplierData: CreateSupplierData = {
      ...createSupplierDto,
      companyId: user.companyId,
      createdBy: user.id,
      isActive: createSupplierDto.isActive ?? true,
    };
    await this.suppliersValidationService.validateCreateSupplier(supplierData, user);
    const supplier = await this.suppliersBusinessService.createSupplier(supplierData, user);
    this.logger.log(`Supplier created: ${supplier.id}`);
    return this.suppliersMapperService.mapToResponseDto(supplier, !this.canViewContacts(user.role));
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    user: RequestWithUser['user'],
  ): Promise<SupplierResponseDto> {
    this.logger.log(`Updating supplier: ${id}`);
    await this.suppliersValidationService.validateUpdateSupplier(id, updateSupplierDto, user);
    const updatedSupplier = await this.suppliersBusinessService.updateSupplier(id, updateSupplierDto, user);
    this.logger.log(`Supplier updated: ${id}`);
    return this.suppliersMapperService.mapToResponseDto(updatedSupplier, !this.canViewContacts(user.role));
  }

  async deactivate(id: string, user: RequestWithUser['user']): Promise<SupplierResponseDto> {
    this.logger.log(`Deactivating supplier: ${id}`);
    await this.suppliersValidationService.validateDeactivateSupplier(id, user);
    const deactivatedSupplier = await this.suppliersBusinessService.deactivateSupplier(id, user);
    this.logger.log(`Supplier deactivated: ${id}`);
    return this.suppliersMapperService.mapToResponseDto(deactivatedSupplier, !this.canViewContacts(user.role));
  }

  // ВАЖНО: добавлен опциональный idempotencyKey (4-й аргумент)
  async rateSupplier(
    id: string,
    ratingData: SupplierRatingData,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<SupplierRatingResponseDto> {
    this.logger.log(`Rating supplier: ${id}`);

    if (idempotencyKey) {
      const lockKey = `idemp:inventory:suppliers:rate:lock:${user.companyId}:${id}:${user.id}:${idempotencyKey}`;
      const resultKey = `idemp:inventory:suppliers:rate:result:${user.companyId}:${id}:${user.id}:${idempotencyKey}`;

      const cached = await this.redis.get(resultKey);
      if (cached) {
        this.logger.log(`Returning cached rating for key ${idempotencyKey}`);
        return JSON.parse(cached);
      }

      // Порядок аргументов для ioredis типов: 'PX', ttl, 'NX'
      const locked = await this.redis.set(lockKey, '1', 'PX', this.idempTtlMs, 'NX');
      if (!locked) {
        throw new ConflictException('Оценка уже обрабатывается (идемпотентность). Повторите позже.');
      }

      try {
        await this.suppliersValidationService.validateRateSupplier(id, ratingData, user);
        const rating = await this.suppliersBusinessService.rateSupplier(id, ratingData, user);
        const dto = this.suppliersMapperService.mapToRatingResponse(rating);
        await this.redis.set(resultKey, JSON.stringify(dto), 'PX', this.idempTtlMs);
        return dto;
      } finally {
        await this.redis.del(lockKey).catch(() => void 0);
      }
    }

    await this.suppliersValidationService.validateRateSupplier(id, ratingData, user);
    const rating = await this.suppliersBusinessService.rateSupplier(id, ratingData, user);
    return this.suppliersMapperService.mapToRatingResponse(rating);
  }

  async comparePartPrices(partId: string, companyId: string): Promise<any> {
    this.logger.log(`Comparing prices for part: ${partId}`);
    return this.suppliersBusinessService.comparePartPrices(partId, companyId);
  }

  async getSupplierAnalytics(
    id: string,
    period: 'month' | 'quarter' | 'year',
    companyId: string,
  ): Promise<SupplierAnalyticsResponseDto> {
    this.logger.log(`Getting analytics for supplier: ${id}, period: ${period}`);
    const analytics = await this.suppliersBusinessService.getSupplierAnalytics(id, period, companyId);
    return this.suppliersMapperService.mapToAnalyticsResponse(analytics);
  }

  async bulkOperations(
    bulkSuppliersDto: BulkSuppliersDto,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<BulkSupplierResult> {
    this.logger.log(
      `Bulk operations: ${bulkSuppliersDto.operation} for ${bulkSuppliersDto.suppliers.length} suppliers`,
    );

    if (idempotencyKey) {
      const lockKey = `idemp:inventory:suppliers:bulk:lock:${user.companyId}:${idempotencyKey}`;
      const resultKey = `idemp:inventory:suppliers:bulk:result:${user.companyId}:${idempotencyKey}`;

      const cached = await this.redis.get(resultKey);
      if (cached) {
        this.logger.log(`Returning cached bulk result for key ${idempotencyKey}`);
        return JSON.parse(cached);
      }

      const locked = await this.redis.set(lockKey, '1', 'PX', this.idempTtlMs, 'NX');
      if (!locked) {
        throw new ConflictException('Идет обработка аналогичной операции (идемпотентность). Повторите позже.');
      }

      try {
        await this.suppliersValidationService.validateBulkOperation(bulkSuppliersDto, user);
        const result = await this.suppliersBusinessService.bulkOperations(bulkSuppliersDto, user);
        await this.redis.set(resultKey, JSON.stringify(result), 'PX', this.idempTtlMs);
        return result;
      } finally {
        await this.redis.del(lockKey).catch(() => void 0);
      }
    }

    await this.suppliersValidationService.validateBulkOperation(bulkSuppliersDto, user);
    return this.suppliersBusinessService.bulkOperations(bulkSuppliersDto, user);
  }

  async exists(id: string, companyId: string): Promise<boolean> {
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);
    return !!supplier;
  }

  async getSupplierInfo(id: string, companyId: string): Promise<any> {
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);
    if (!supplier) return null;
    return this.suppliersMapperService.mapToBasicInfo(supplier);
  }

  async getActiveSuppliersForPart(partId: string, companyId: string): Promise<any[]> {
    return this.suppliersDataService.findActiveSuppliersForPart(partId, companyId);
  }

  // Добавлено ранее: лучшая рекомендация поставщика по запчасти (скоринг)
  async findBestSupplierForPart(
    partId: string,
    prioritize: 'price' | 'quality' | 'delivery',
    companyId: string,
  ) {
    const comparison = await this.suppliersBusinessService.comparePartPrices(partId, companyId);
    const suppliers = Array.isArray(comparison?.suppliers) ? comparison.suppliers : [];
    if (suppliers.length === 0) {
      return { partId, bestSupplier: null, alternatives: [] };
    }

    const prices = suppliers.map((s: any) => Number(s.price) || 0).filter((p: number) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const deliveries = suppliers.map((s: any) => Number(s.deliveryTime) || Infinity);
    const minDelivery = deliveries.length > 0 ? Math.min(...deliveries) : Infinity;

    const weights =
      prioritize === 'price'
        ? { price: 0.6, quality: 0.2, delivery: 0.2 }
        : prioritize === 'quality'
        ? { price: 0.2, quality: 0.6, delivery: 0.2 }
        : { price: 0.2, quality: 0.2, delivery: 0.6 };

    const scored = suppliers.map((s: any) => {
      const price = Number(s.price) || 0;
      const rating = Number(s.rating) || 0;
      const delivery = Number(s.deliveryTime) || (minDelivery === Infinity ? 0 : minDelivery);

      const normPrice = minPrice > 0 && price > 0 ? minPrice / price : 0;
      const normQuality = rating > 0 ? rating / 5 : 0;
      const normDelivery = minDelivery > 0 && delivery > 0 ? minDelivery / delivery : 0;

      const score = weights.price * normPrice + weights.quality * normQuality + weights.delivery * normDelivery;

      return {
        id: s.supplierId || s.id,
        name: s.supplierName || s.name,
        price,
        rating,
        deliveryTime: delivery,
        score: Math.round(score * 1000) / 1000,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const [best, ...rest] = scored;

    return {
      partId,
      bestSupplier: best || null,
      alternatives: rest,
    };
  }

  // Добавлено ранее: топ-поставщики за период
  async getTopPerformers(
    companyId: string,
    period: 'month' | 'quarter' | 'year',
    limit: number,
  ) {
    const rows = await this.suppliersDataService.getTopPerformers(companyId, period, limit);
    const topSuppliers = rows.map((r: any) => ({
      id: r.supplierId,
      name: r.supplierName,
      totalOrders: Number(r.totalOrders) || 0,
      totalValue: Number(r.totalValue) || 0,
      averageRating: Number(r.averageRating) || 0,
      onTimeDeliveryRate: Number(r.onTimeDeliveryRate) || 0,
      rank: Number(r.rank) || 0,
    }));
    return { period, topSuppliers };
  }
}
