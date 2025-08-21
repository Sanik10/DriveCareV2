// path: apps/backend/src/modules/inventory/services/inventory-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Inventory } from '../../../database/entities';
import { InventoryResponseDto } from '../dto/response/inventory-response.dto';
import { InventoryStatus } from '../types/inventory.types';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@Injectable()
export class InventoryMapperService {
  // Публичный метод — используется сервисом для агрегатов/итогов
  public canViewCostsForRole(role?: string): boolean {
    if (!role) return false;
    return INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(role as any);
  }

  mapToResponseDto(inventory: Inventory): InventoryResponseDto {
    return this.mapToResponseDtoForRole(inventory, 'company_admin'); // безопасный дефолт для служебных вызовов
  }

  mapToResponseDtoForRole(inventory: Inventory, role?: string): InventoryResponseDto {
    const status = this.calculateInventoryStatus(inventory);
    const canViewCosts = this.canViewCostsForRole(role);
    const costPrice = inventory.part ? parseFloat(inventory.part.costPrice.toString()) : 0;
    const sellingPrice = inventory.part ? parseFloat(inventory.part.sellingPrice.toString()) : 0;
    const totalValue = canViewCosts ? costPrice * inventory.quantity : 0;
    const lastMovement = this.getLastMovementInfo(inventory);

    return {
      id: inventory.id,
      companyId: inventory.companyId,
      partId: inventory.partId,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      location: inventory.location,
      lastRestockDate: inventory.lastRestockDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      part: inventory.part
        ? {
            id: inventory.part.id,
            name: inventory.part.name,
            partNumber: inventory.part.partNumber,
            brand: inventory.part.brand,
            costPrice: canViewCosts ? costPrice : undefined,
            sellingPrice: canViewCosts ? sellingPrice : undefined,
            category: inventory.part.category
              ? { id: inventory.part.category.id, name: inventory.part.category.name }
              : undefined,
          }
        : undefined,
      status,
      needsRestock: inventory.quantity <= inventory.minQuantity,
      quantityUntilMin: Math.max(0, inventory.quantity - inventory.minQuantity),
      totalValue,
      minQuantityPercent: this.calculateMinQuantityPercent(inventory),
      reservedQuantity: 0,
      availableQuantity: Math.max(0, inventory.quantity - 0),
      lastMovement,
      notes: undefined,
    };
  }

  mapArrayToResponseDto(inventory: Inventory[]): InventoryResponseDto[] {
    return inventory.map((i) => this.mapToResponseDto(i));
  }

  mapArrayToResponseDtoForRole(inventory: Inventory[], role?: string): InventoryResponseDto[] {
    return inventory.map((i) => this.mapToResponseDtoForRole(i, role));
  }

  private calculateInventoryStatus(inventory: Inventory): InventoryStatus {
    if (inventory.quantity === 0) return 'out_of_stock';
    if (inventory.quantity <= inventory.minQuantity) return 'low_stock';
    if (inventory.minQuantity > 0 && inventory.quantity > inventory.minQuantity * 5) return 'overstock';
    return 'in_stock';
  }
  private calculateTotalValue(inventory: Inventory): number {
    if (!inventory.part) return 0;
    const costPrice = parseFloat(inventory.part.costPrice.toString());
    return costPrice * inventory.quantity;
  }
  private calculateMinQuantityPercent(inventory: Inventory): number {
    if (inventory.minQuantity === 0) return 0;
    return Math.round((inventory.quantity / inventory.minQuantity) * 100);
  }
  private getLastMovementInfo(inventory: Inventory): { date: Date; type: string; quantity: number } | undefined {
    if (inventory.lastRestockDate) return { date: inventory.lastRestockDate, type: 'restock', quantity: 0 };
    return undefined;
  }
}
