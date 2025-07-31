// src/modules/inventory/inventory.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InventoryDataService } from './services/inventory-data.service';
import { InventoryBusinessService } from './services/inventory-business.service';
import { InventoryValidationService } from './services/inventory-validation.service';
import { InventoryMapperService } from './services/inventory-mapper.service';
import { UpdateInventoryDto } from './dto/request/update-inventory.dto';
import { InventoryResponseDto } from './dto/response/inventory-response.dto';
import { PaginatedInventoryResponseDto } from './dto/response/paginated-inventory-response.dto';
import { StockSummaryResponseDto } from './dto/response/stock-summary-response.dto';
import { LowStockAlertsResponseDto } from './dto/response/low-stock-alerts-response.dto';
import { InventoryFilter } from './types/inventory.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { INVENTORY_CONSTANTS } from './constants/inventory.constants';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventoryDataService: InventoryDataService,
    private readonly inventoryBusinessService: InventoryBusinessService,
    private readonly inventoryValidationService: InventoryValidationService,
    private readonly inventoryMapperService: InventoryMapperService,
  ) {}

  /**
   * 🔒 Получение всех позиций склада с фильтрацией по принадлежности
   */
  async findAll(filter: InventoryFilter = {}): Promise<PaginatedInventoryResponseDto> {
    this.logger.log(`Finding inventory with filters: ${JSON.stringify(filter)}`);

    const [inventory, total] = await this.inventoryDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    return {
      items: this.inventoryMapperService.mapArrayToResponseDto(inventory),
      total,
      page,
      limit,
      totalPages,
      hasLowStock: inventory.some(item => item.quantity <= item.minQuantity),
      totalValue: inventory.reduce((sum, item) => {
        const partPrice = item.part ? parseFloat(item.part.costPrice.toString()) : 0;
        return sum + (partPrice * item.quantity);
      }, 0),
    };
  }

  /**
   * 🔒 Получение позиции по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<InventoryResponseDto> {
    this.logger.log(`Finding inventory item: ${id}`);

    const inventoryItem = await this.inventoryValidationService.validateInventoryExists(id);

    return this.inventoryMapperService.mapToResponseDto(inventoryItem);
  }

   /**
   * 🔒 Обновление информации о складе
   */
  async update(id: string, updateInventoryDto: UpdateInventoryDto): Promise<InventoryResponseDto> {
    this.logger.log(`Updating inventory item: ${id}`);

    // Валидация обновления
    await this.inventoryValidationService.validateUpdateData(id, updateInventoryDto);

    // 🔥 КОНВЕРТАЦИЯ DTO в Data интерфейс
    const updateData = {
      ...updateInventoryDto,
      lastRestockDate: updateInventoryDto.lastRestockDate 
        ? new Date(updateInventoryDto.lastRestockDate) 
        : undefined,
    };

    // Обновление через бизнес-сервис
    const updatedInventory = await this.inventoryBusinessService.updateInventoryItem(id, updateData);

    this.logger.log(`Inventory item updated: ${id}`);

    return this.inventoryMapperService.mapToResponseDto(updatedInventory);
  }

  /**
   * 📊 Получение сводки по складу
   */
  async getStockSummary(companyId: string): Promise<StockSummaryResponseDto> {
    this.logger.log(`Getting stock summary for company: ${companyId}`);

    return this.inventoryBusinessService.calculateStockSummary(companyId);
  }

  /**
   * 🚨 Получение уведомлений о низких остатках
   */
  async getLowStockAlerts(companyId: string): Promise<LowStockAlertsResponseDto> {
    this.logger.log(`Getting low stock alerts for company: ${companyId}`);

    return this.inventoryBusinessService.getLowStockAlerts(companyId);
  }

  /**
   * 🔄 Проверка доступности запчасти
   */
  async checkAvailability(partId: string, quantity: number, companyId: string): Promise<{
    partId: string;
    available: number;
    canReserve: boolean;
    maxReservable: number;
    location: string;
  }> {
    return this.inventoryBusinessService.checkPartAvailability(partId, quantity, companyId);
  }

  /**
   * 🔒 Резервирование запчастей
   */
  async reserveParts(
    reservationData: {
      partId: string;
      quantity: number;
      orderId?: string;
      expiresAt?: Date;
    },
    user: RequestWithUser['user']
  ): Promise<{ success: boolean; message: string; reservationId?: string }> {
    this.logger.log(`Reserving parts for company: ${user.companyId}`);

    // Валидация резервирования
    await this.inventoryValidationService.validateReservation(reservationData, user);

    // Резервирование через бизнес-сервис
    return this.inventoryBusinessService.reserveParts(reservationData, user);
  }

  /**
   * 🔓 Освобождение резерва
   */
  async releaseReservation(reservationId: string): Promise<void> {
    this.logger.log(`Releasing reservation: ${reservationId}`);

    return this.inventoryBusinessService.releaseReservation(reservationId);
  }

  /**
   * 📊 Отчет по оборачиваемости
   */
  async getTurnoverReport(params: {
    companyId: string;
    dateFrom?: Date;
    dateTo?: Date;
    categoryId?: string;
  }): Promise<any> {
    this.logger.log(`Getting turnover report for company: ${params.companyId}`);

    return this.inventoryBusinessService.calculateTurnoverReport(params);
  }

  /**
   * 📋 Для других модулей - проверка существования позиции
   */
  async exists(partId: string, companyId: string): Promise<boolean> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    return !!inventory;
  }

  /**
   * 📊 Для других модулей - получение текущих остатков
   */
  async getCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    return inventory?.quantity || 0;
  }

  /**
   * 🔄 Для orders модуля - резервирование количества
   */
  async reserveForOrder(partId: string, quantity: number, orderId: string, companyId: string): Promise<boolean> {
    return this.inventoryBusinessService.reserveForOrder(partId, quantity, orderId, companyId);
  }

  /**
   * 🔄 Для orders модуля - освобождение резерва заказа
   */
  async releaseOrderReservation(partId: string, quantity: number, orderId: string, companyId: string): Promise<void> {
    return this.inventoryBusinessService.releaseOrderReservation(partId, quantity, orderId, companyId);
  }
}
