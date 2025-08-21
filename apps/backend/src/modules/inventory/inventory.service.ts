// path: apps/backend/src/modules/inventory/inventory.service.ts
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
import { ResourceOwnershipException } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventoryDataService: InventoryDataService,
    private readonly inventoryBusinessService: InventoryBusinessService,
    private readonly inventoryValidationService: InventoryValidationService,
    private readonly inventoryMapperService: InventoryMapperService,
  ) {}

  async findAllForUser(user: RequestWithUser['user'], filter: InventoryFilter = {}): Promise<PaginatedInventoryResponseDto> {
    const [inventory, total] = await this.inventoryDataService.findWithFilters(filter);
    const page = filter.page || 1;
    const limit = filter.limit || INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    const canViewCosts = this.inventoryMapperService.canViewCostsForRole(user.role);

    return {
      items: this.inventoryMapperService.mapArrayToResponseDtoForRole(inventory, user.role),
      total,
      page,
      limit,
      totalPages,
      hasLowStock: inventory.some((item) => item.quantity <= item.minQuantity),
      totalValue: canViewCosts
        ? inventory.reduce((sum, item) => {
            const partPrice = item.part ? parseFloat(item.part.costPrice.toString()) : 0;
            return sum + partPrice * item.quantity;
          }, 0)
        : 0,
    };
  }

  async findAll(filter: InventoryFilter = {}): Promise<PaginatedInventoryResponseDto> {
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
      hasLowStock: inventory.some((item) => item.quantity <= item.minQuantity),
      totalValue: inventory.reduce((sum, item) => {
        const partPrice = item.part ? parseFloat(item.part.costPrice.toString()) : 0;
        return sum + partPrice * item.quantity;
      }, 0),
    };
  }

  async findOneForUser(id: string, user: RequestWithUser['user']): Promise<InventoryResponseDto> {
    const inventoryItem = await this.inventoryValidationService.validateInventoryExists(id);
    if (inventoryItem.companyId !== user.companyId && user.role !== 'superadmin') {
      throw new ResourceOwnershipException('inventory', id);
    }
    return this.inventoryMapperService.mapToResponseDtoForRole(inventoryItem, user.role);
  }

  async findOne(id: string): Promise<InventoryResponseDto> {
    const inventoryItem = await this.inventoryValidationService.validateInventoryExists(id);
    return this.inventoryMapperService.mapToResponseDto(inventoryItem);
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto): Promise<InventoryResponseDto> {
    await this.inventoryValidationService.validateUpdateData(id, updateInventoryDto);
    const updateData = {
      ...updateInventoryDto,
      lastRestockDate: updateInventoryDto.lastRestockDate ? new Date(updateInventoryDto.lastRestockDate) : undefined,
    };
    const updatedInventory = await this.inventoryBusinessService.updateInventoryItem(id, updateData);
    return this.inventoryMapperService.mapToResponseDto(updatedInventory);
  }

  async getStockSummary(companyId: string): Promise<StockSummaryResponseDto> {
    return this.inventoryBusinessService.calculateStockSummary(companyId);
  }

  async getLowStockAlerts(companyId: string): Promise<LowStockAlertsResponseDto> {
    return this.inventoryBusinessService.getLowStockAlerts(companyId);
  }

  async checkAvailability(
    partId: string,
    quantity: number,
    companyId: string,
  ): Promise<{ partId: string; available: number; canReserve: boolean; maxReservable: number; location: string }> {
    return this.inventoryBusinessService.checkPartAvailability(partId, quantity, companyId);
  }

  async reserveParts(
    reservationData: { partId: string; quantity: number; orderId?: string; expiresAt?: Date; idempotencyKey?: string },
    user: RequestWithUser['user'],
  ) {
    await this.inventoryValidationService.validateReservation(reservationData, user);
    return this.inventoryBusinessService.reserveParts(reservationData, user);
  }

  async releaseReservation(reservationId: string): Promise<void> {
    return this.inventoryBusinessService.releaseReservation(reservationId);
  }

  async getTurnoverReport(params: { companyId: string; dateFrom?: Date; dateTo?: Date; categoryId?: string }): Promise<any> {
    return this.inventoryBusinessService.calculateTurnoverReport(params);
  }

  async exists(partId: string, companyId: string): Promise<boolean> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    return !!inventory;
  }

  async getCurrentStock(partId: string, companyId: string): Promise<number> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    return inventory?.quantity || 0;
  }

  async reserveForOrder(partId: string, quantity: number, orderId: string, companyId: string): Promise<boolean> {
    return this.inventoryBusinessService.reserveForOrder(partId, quantity, orderId, companyId);
  }

  async releaseOrderReservation(partId: string, quantity: number, orderId: string, companyId: string): Promise<void> {
    return this.inventoryBusinessService.releaseOrderReservation(partId, quantity, orderId, companyId);
  }
}
