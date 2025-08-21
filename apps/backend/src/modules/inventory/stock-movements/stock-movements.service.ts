// path: apps/backend/src/modules/inventory/stock-movements/stock-movements.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StockMovementsDataService } from './services/stock-movements-data.service';
import { StockMovementsBusinessService } from './services/stock-movements-business.service';
import { StockMovementsValidationService } from './services/stock-movements-validation.service';
import { StockMovementsMapperService } from './services/stock-movements-mapper.service';
import { CreateMovementDto } from './dto/request/create-movement.dto';
import { BulkMovementsDto } from './dto/request/bulk-movements.dto';
import { BarcodeScanMovementDto } from './dto/request/barcode-movement.dto';
import { UpdateMovementDto } from './dto/request/update-movement.dto';
import { StockMovementResponseDto } from './dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from './dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from './dto/response/movement-summary-response.dto';
import { StockMovementFilter } from './types/stock-movements.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import type { Redis } from 'ioredis';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);
  private readonly idempTtlMs: number;

  constructor(
    private readonly stockMovementsDataService: StockMovementsDataService,
    private readonly stockMovementsBusinessService: StockMovementsBusinessService,
    private readonly stockMovementsValidationService: StockMovementsValidationService,
    private readonly stockMovementsMapperService: StockMovementsMapperService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {
    const envTtl = Number(this.configService.get('INVENTORY_IDEMPOTENCY_TTL_MS'));
    this.idempTtlMs = Number.isFinite(envTtl) && envTtl > 0 ? envTtl : 6 * 60 * 60 * 1000; // 6h safe default
  }

  private async withIdempotency<T>(
    area: string,
    op: string,
    companyId: string,
    key: string | undefined,
    runner: () => Promise<T>,
  ): Promise<T> {
    if (!key || !this.redisClient) {
      return runner();
    }
    const lockKey = `idemp:${area}:${op}:lock:${companyId}:${key}`;
    const resultKey = `idemp:${area}:${op}:result:${companyId}:${key}`;

    // If result exists, return cached
    const cached = await this.redisClient.get(resultKey);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // ignore parsing errors
      }
    }

    // Acquire lock via SETNX + PEXPIRE
    const acquired = await this.redisClient.setnx(lockKey, '1');
    if (acquired !== 1) {
      throw new ConflictException('Идентичная операция уже выполняется или недавно выполнена');
    }
    await this.redisClient.pexpire(lockKey, this.idempTtlMs);

    try {
      const result = await runner();
      await this.redisClient.psetex(resultKey, this.idempTtlMs, JSON.stringify(result));
      return result;
    } finally {
      try {
        await this.redisClient.del(lockKey);
      } catch {
        // ignore
      }
    }
  }

  /**
   * 🔒 Получение всех движений с фильтрацией по принадлежности
   */
  async findAll(filter: StockMovementFilter = {}, viewerRole?: string): Promise<PaginatedMovementsResponseDto> {
    this.logger.log(`Finding stock movements with filters: ${JSON.stringify({ ...filter, search: !!filter.search })}`);

    const [movements, total] = await this.stockMovementsDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;

    return this.stockMovementsMapperService.mapToPaginatedResponse(
      movements,
      total,
      page,
      limit,
      filter,
      viewerRole,
    );
  }

  /**
   * 🔒 Получение движения по ID (с проверкой в Guard)
   */
  async findOne(id: string, viewerRole?: string): Promise<StockMovementResponseDto> {
    this.logger.log(`Finding stock movement: ${id}`);

    const movement = await this.stockMovementsValidationService.validateMovementExists(id);

    return this.stockMovementsMapperService.mapToResponseDto(movement, viewerRole);
  }

  /**
   * 📝 Создание движения
   */
  async create(
    createMovementDto: CreateMovementDto,
    user: RequestWithUser['user'],
    viewerRole?: string,
    idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Creating stock movement for part: ${createMovementDto.partId}`);

    const movementData = {
      ...createMovementDto,
      companyId: user.companyId,
      userId: user.id,
      movementDate: createMovementDto.movementDate ? new Date(createMovementDto.movementDate) : undefined,
    };

    await this.stockMovementsValidationService.validateCreateMovement(movementData);

    const movement = await this.withIdempotency(
      'inventory',
      'stock-movement:create',
      user.companyId,
      idempotencyKey,
      () => this.stockMovementsBusinessService.createMovement(movementData),
    );

    this.logger.log(`Stock movement created: ${movement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(movement, viewerRole);
  }

  /**
   * 📝 Обновление движения
   */
  async update(
    id: string,
    updateData: UpdateMovementDto,
    user: RequestWithUser['user'],
    viewerRole?: string,
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Updating stock movement: ${id}`);

    const updatedMovement = await this.stockMovementsBusinessService.updateMovement(id, updateData, user);

    this.logger.log(`Stock movement updated: ${id}`);

    return this.stockMovementsMapperService.mapToResponseDto(updatedMovement, viewerRole);
  }

  /**
   * 📦 Bulk создание движений
   */
  async createBulk(
    bulkMovementsDto: BulkMovementsDto,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      partId: string;
      success: boolean;
      movementId?: string;
      error?: string;
    }>;
    totalValue: number;
  }> {
    this.logger.log(`Creating bulk movements: ${bulkMovementsDto.movements.length} items`);

    await this.stockMovementsValidationService.validateBulkMovements(bulkMovementsDto, user);

    const result = await this.withIdempotency(
      'inventory',
      'stock-movement:bulk-create',
      user.companyId,
      idempotencyKey,
      () => this.stockMovementsBusinessService.createBulkMovements(bulkMovementsDto, user),
    );

    this.logger.log(`Bulk movements completed: ${result.successCount} success, ${result.failureCount} failures`);

    return result;
  }

  /**
   * 📱 Создание движения от сканирования штрих-кода
   */
  async createFromBarcodeScan(
    barcodeScanDto: BarcodeScanMovementDto,
    user: RequestWithUser['user'],
    viewerRole?: string,
    idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Creating movement from barcode scan: ${barcodeScanDto.barcode}`);

    await this.stockMovementsValidationService.validateBarcodeMovement(
      barcodeScanDto.barcode,
      barcodeScanDto.quantity,
      barcodeScanDto.type,
      user,
    );

    const movement = await this.withIdempotency(
      'inventory',
      'stock-movement:barcode',
      user.companyId,
      idempotencyKey,
      () =>
        this.stockMovementsBusinessService.createFromBarcodeScan(
          barcodeScanDto.barcode,
          barcodeScanDto.quantity,
          barcodeScanDto.type,
          user,
          { location: barcodeScanDto.location, notes: barcodeScanDto.notes },
        ),
    );

    this.logger.log(`Movement from barcode scan created: ${movement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(movement, viewerRole);
  }

  /**
   * 🔄 Отмена движения
   */
  async reverseMovement(
    id: string,
    reason: string,
    user: RequestWithUser['user'],
    viewerRole?: string,
    idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Reversing movement: ${id}`);

    await this.stockMovementsValidationService.validateReverseMovement(id, user, reason);

    const reverseMovement = await this.withIdempotency(
      'inventory',
      'stock-movement:reverse',
      user.companyId,
      idempotencyKey,
      () => this.stockMovementsBusinessService.reverseMovement(id, user, reason),
    );

    this.logger.log(`Movement reversed: ${id} -> ${reverseMovement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(reverseMovement, viewerRole);
  }

  /**
   * 📊 Получение сводки движений
   */
  async getMovementSummary(companyId: string, dateFrom: Date, dateTo: Date): Promise<MovementSummaryResponseDto> {
    this.logger.log(`Getting movement summary for company: ${companyId}`);

    const summary = await this.stockMovementsBusinessService.getMovementSummary(companyId, dateFrom, dateTo);

    return this.stockMovementsMapperService.mapToSummaryResponse(summary);
  }

  /**
   * 📋 История движений для запчасти
   */
  async getPartHistory(
    partId: string,
    companyId: string,
    limit: number = 50,
    viewerRole?: string,
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Getting movement history for part: ${partId}`);

    const movements = await this.stockMovementsDataService.findPartHistory(partId, companyId, limit);

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements, viewerRole);
  }

  /**
   * 🔄 Интеграция с Orders - создание движений при выполнении заказа
   */
  async createMovementsFromOrder(
    orderId: string,
    parts: Array<{ partId: string; quantityUsed: number }>,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Creating movements from order: ${orderId}`);

    const movements = await this.withIdempotency(
      'inventory',
      `stock-movement:from-order:${orderId}`,
      user.companyId,
      idempotencyKey,
      () => this.stockMovementsBusinessService.createMovementsFromOrder(orderId, parts, user),
    );

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements, user.role);
  }

  /**
   * 🔄 Интеграция с Suppliers - создание движений при поступлении
   */
  async createMovementsFromDelivery(
    supplierId: string,
    deliveryNumber: string,
    parts: Array<{ partId: string; quantityReceived: number; unitPrice?: number }>,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Creating movements from delivery: ${deliveryNumber}`);

    const movements = await this.withIdempotency(
      'inventory',
      `stock-movement:from-delivery:${deliveryNumber}`,
      user.companyId,
      idempotencyKey,
      () => this.stockMovementsBusinessService.createMovementsFromDelivery(supplierId, deliveryNumber, parts, user),
    );

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements, user.role);
  }

  /**
   * 📊 Для других модулей - проверка существования движения
   */
  async exists(id: string, companyId: string): Promise<boolean> {
    const movement = await this.stockMovementsDataService.findByIdForCompany(id, companyId);
    return !!movement;
  }

  /**
   * 📊 Для аналитики - получение движений за период
   */
  async getMovementsForAnalytics(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
    categoryId?: string,
    viewerRole?: string,
  ): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementsDataService.findForAnalytics(companyId, dateFrom, dateTo, categoryId);

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements, viewerRole);
  }
}
