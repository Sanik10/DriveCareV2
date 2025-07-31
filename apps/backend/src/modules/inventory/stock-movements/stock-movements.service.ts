// src/modules/inventory/stock-movements/stock-movements.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StockMovementsDataService } from './services/stock-movements-data.service';
import { StockMovementsBusinessService } from './services/stock-movements-business.service';
import { StockMovementsValidationService } from './services/stock-movements-validation.service';
import { StockMovementsMapperService } from './services/stock-movements-mapper.service';
import { CreateMovementDto } from './dto/request/create-movement.dto';
import { BulkMovementsDto } from './dto/request/bulk-movements.dto';
import { BarcodeScanMovementDto } from './dto/request/barcode-movement.dto';
import { StockMovementResponseDto } from './dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from './dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from './dto/response/movement-summary-response.dto';
import { StockMovementFilter } from './types/stock-movements.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(
    private readonly stockMovementsDataService: StockMovementsDataService,
    private readonly stockMovementsBusinessService: StockMovementsBusinessService,
    private readonly stockMovementsValidationService: StockMovementsValidationService,
    private readonly stockMovementsMapperService: StockMovementsMapperService,
  ) {}

  /**
   * 🔒 Получение всех движений с фильтрацией по принадлежности
   */
  async findAll(filter: StockMovementFilter = {}): Promise<PaginatedMovementsResponseDto> {
    this.logger.log(`Finding stock movements with filters: ${JSON.stringify(filter)}`);

    const [movements, total] = await this.stockMovementsDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;

    return this.stockMovementsMapperService.mapToPaginatedResponse(
      movements,
      total,
      page,
      limit,
      filter
    );
  }

  /**
   * 🔒 Получение движения по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<StockMovementResponseDto> {
    this.logger.log(`Finding stock movement: ${id}`);

    const movement = await this.stockMovementsValidationService.validateMovementExists(id);

    return this.stockMovementsMapperService.mapToResponseDto(movement);
  }

  /**
   * 📝 Создание движения
   */
  async create(
    createMovementDto: CreateMovementDto,
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Creating stock movement for part: ${createMovementDto.partId}`);

    // 🔥 Конвертация DTO в Data интерфейс
    const movementData = {
      ...createMovementDto,
      companyId: user.companyId,
      userId: user.id,
      movementDate: createMovementDto.movementDate ? new Date(createMovementDto.movementDate) : undefined,
    };

    // Валидация создания
    await this.stockMovementsValidationService.validateCreateMovement(movementData);

    // Создание через бизнес-сервис
    const movement = await this.stockMovementsBusinessService.createMovement(movementData);

    this.logger.log(`Stock movement created: ${movement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(movement);
  }

  /**
   * 📝 Обновление движения
   */
  async update(
    id: string,
    updateData: { price?: number; totalAmount?: number; documentNumber?: string; notes?: string },
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Updating stock movement: ${id}`);

    // Обновление через бизнес-сервис
    const updatedMovement = await this.stockMovementsBusinessService.updateMovement(id, updateData, user);

    this.logger.log(`Stock movement updated: ${id}`);

    return this.stockMovementsMapperService.mapToResponseDto(updatedMovement);
  }

  /**
   * 📦 Bulk создание движений
   */
  async createBulk(
    bulkMovementsDto: BulkMovementsDto,
    user: RequestWithUser['user']
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

    // Валидация bulk операции
    await this.stockMovementsValidationService.validateBulkMovements(bulkMovementsDto, user);

    // Создание через бизнес-сервис
    const result = await this.stockMovementsBusinessService.createBulkMovements(bulkMovementsDto, user);

    this.logger.log(`Bulk movements completed: ${result.successCount} success, ${result.failureCount} failures`);

    return result;
  }

  /**
   * 📱 Создание движения от сканирования штрих-кода
   */
  async createFromBarcodeScan(
    barcodeScanDto: BarcodeScanMovementDto,
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Creating movement from barcode scan: ${barcodeScanDto.barcode}`);

    // Валидация сканирования
    await this.stockMovementsValidationService.validateBarcodeMovement(
      barcodeScanDto.barcode,
      barcodeScanDto.quantity,
      barcodeScanDto.type,
      user
    );

    // Создание через бизнес-сервис
    const movement = await this.stockMovementsBusinessService.createFromBarcodeScan(
      barcodeScanDto.barcode,
      barcodeScanDto.quantity,
      barcodeScanDto.type,
      user,
      {
        location: barcodeScanDto.location,
        notes: barcodeScanDto.notes,
      }
    );

    this.logger.log(`Movement from barcode scan created: ${movement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(movement);
  }

  /**
   * 🔄 Отмена движения
   */
  async reverseMovement(
    id: string,
    reason: string,
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto> {
    this.logger.log(`Reversing movement: ${id}`);

    // Валидация отмены
    await this.stockMovementsValidationService.validateReverseMovement(id, user, reason);

    // Отмена через бизнес-сервис
    const reverseMovement = await this.stockMovementsBusinessService.reverseMovement(id, user, reason);

    this.logger.log(`Movement reversed: ${id} -> ${reverseMovement.id}`);

    return this.stockMovementsMapperService.mapToResponseDto(reverseMovement);
  }

  /**
   * 📊 Получение сводки движений
   */
  async getMovementSummary(
    companyId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<MovementSummaryResponseDto> {
    this.logger.log(`Getting movement summary for company: ${companyId}`);

    const summary = await this.stockMovementsBusinessService.getMovementSummary(
      companyId,
      dateFrom,
      dateTo
    );

    return this.stockMovementsMapperService.mapToSummaryResponse(summary);
  }

  /**
   * 📋 Получение истории движений для запчасти
   */
  async getPartHistory(
    partId: string,
    companyId: string,
    limit: number = 50
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Getting movement history for part: ${partId}`);

    const movements = await this.stockMovementsDataService.findPartHistory(partId, companyId, limit);

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements);
  }

  /**
   * 🔄 Интеграция с Orders - создание движений при выполнении заказа
   */
  async createMovementsFromOrder(
    orderId: string,
    parts: Array<{ partId: string; quantityUsed: number }>,
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Creating movements from order: ${orderId}`);

    const movements = await this.stockMovementsBusinessService.createMovementsFromOrder(
      orderId,
      parts,
      user
    );

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements);
  }

  /**
   * 🔄 Интеграция с Suppliers - создание движений при поступлении
   */
  async createMovementsFromDelivery(
    supplierId: string,
    deliveryNumber: string,
    parts: Array<{ 
      partId: string; 
      quantityReceived: number; 
      unitPrice?: number;
    }>,
    user: RequestWithUser['user']
  ): Promise<StockMovementResponseDto[]> {
    this.logger.log(`Creating movements from delivery: ${deliveryNumber}`);

    const movements = await this.stockMovementsBusinessService.createMovementsFromDelivery(
      supplierId,
      deliveryNumber,
      parts,
      user
    );

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements);
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
    categoryId?: string
  ): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementsDataService.findForAnalytics(
      companyId,
      dateFrom,
      dateTo,
      categoryId
    );

    return this.stockMovementsMapperService.mapArrayToResponseDto(movements);
  }
}
