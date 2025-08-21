// path: apps/backend/src/modules/inventory/parts/services/parts-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Part } from '../../../../database/entities';
import { PartResponseDto, PartCategoryDto } from '../dto/response/part-response.dto';

@Injectable()
export class PartsMapperService {
  private canViewCostsForRole(role?: string): boolean {
    if (!role) return false;
    return ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'].includes(role);
  }

  mapToResponseDto(part: Part): PartResponseDto {
    return this.mapToResponseDtoForRole(part, 'company_admin');
  }

  mapArrayToResponseDto(parts: Part[]): PartResponseDto[] {
    return parts.map((part) => this.mapToResponseDto(part));
  }

  mapToResponseDtoForRole(part: Part, role?: string): PartResponseDto {
    const canViewCosts = this.canViewCostsForRole(role);
    const marginPercent = canViewCosts ? this.calculateMarginPercent(part.costPrice, part.sellingPrice) : undefined;
    const profitPerUnit = canViewCosts ? this.calculateProfitPerUnit(part.costPrice, part.sellingPrice) : undefined;

    return {
      id: part.id,
      companyId: part.companyId,
      categoryId: part.categoryId,
      category: part.category ? this.mapCategoryToDto(part.category) : { id: part.categoryId, name: 'Неизвестная категория', code: undefined },
      name: part.name,
      partNumber: part.partNumber || undefined,
      brand: part.brand || undefined,
      description: part.description || undefined,
      costPrice: canViewCosts ? parseFloat(part.costPrice.toString()) : undefined,
      sellingPrice: canViewCosts ? parseFloat(part.sellingPrice.toString()) : undefined,
      marginPercent,
      profitPerUnit,
      imageUrl: part.imageUrl || undefined,
      isActive: part.isActive,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,

      currentStock: undefined,
      minStock: undefined,
      needsRestock: undefined,
      stockStatus: undefined,
      lastMovementDate: undefined,
      totalOrders: undefined,
      popularityScore: undefined,
    };
  }

  mapArrayToResponseDtoForRole(parts: Part[], role?: string): PartResponseDto[] {
    return parts.map((p) => this.mapToResponseDtoForRole(p, role));
  }

  mapCategoryToDto(category: any): PartCategoryDto {
    return { id: category.id, name: category.name, code: category.code };
  }

  mapToBasicInfo(part: Part): {
    id: string;
    name: string;
    partNumber?: string;
    brand?: string;
    categoryName: string;
    costPrice: number;
    sellingPrice: number;
    isActive: boolean;
    companyId: string;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryName: part.category?.name || 'Без категории',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      isActive: part.isActive,
      companyId: part.companyId,
    };
  }

  mapToListItem(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    categoryName: string;
    costPrice?: number;
    sellingPrice?: number;
    marginPercent?: number;
    isActive: boolean;
    stockStatus: string;
  } {
    const canViewCosts = true; // для внутренних списков — контролируется выше уровнем
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryName: part.category?.name || 'Без категории',
      costPrice: canViewCosts ? parseFloat(part.costPrice.toString()) : undefined,
      sellingPrice: canViewCosts ? parseFloat(part.sellingPrice.toString()) : undefined,
      marginPercent: canViewCosts ? this.calculateMarginPercent(part.costPrice, part.sellingPrice) : undefined,
      isActive: part.isActive,
      stockStatus: 'unknown',
    };
  }

  mapToFinancialSummary(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    costPrice?: number;
    sellingPrice?: number;
    profitPerUnit?: number;
    marginPercent?: number;
    category: string;
    isActive: boolean;
  } {
    const canViewCosts = true;
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      costPrice: canViewCosts ? parseFloat(part.costPrice.toString()) : undefined,
      sellingPrice: canViewCosts ? parseFloat(part.sellingPrice.toString()) : undefined,
      profitPerUnit: canViewCosts ? this.calculateProfitPerUnit(part.costPrice, part.sellingPrice) : undefined,
      marginPercent: canViewCosts ? this.calculateMarginPercent(part.costPrice, part.sellingPrice) : undefined,
      category: part.category?.name || 'Без категории',
      isActive: part.isActive,
    };
  }

  mapToSearchResult(part: Part, relevanceScore: number = 0): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    categoryName: string;
    costPrice?: number;
    sellingPrice?: number;
    isActive: boolean;
    relevanceScore: number;
    description: string;
  } {
    const canViewCosts = false;
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryName: part.category?.name || 'Без категории',
      costPrice: canViewCosts ? parseFloat(part.costPrice.toString()) : undefined,
      sellingPrice: canViewCosts ? parseFloat(part.sellingPrice.toString()) : undefined,
      isActive: part.isActive,
      relevanceScore,
      description: part.description || '',
    };
  }

  mapToMobileView(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    price?: number;
    isActive: boolean;
    category: string;
    imageUrl: string;
  } {
    const canViewCosts = false;
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      price: canViewCosts ? parseFloat(part.sellingPrice.toString()) : undefined,
      isActive: part.isActive,
      category: part.category?.name || 'Без категории',
      imageUrl: part.imageUrl || '',
    };
  }

  private calculateMarginPercent(costPrice: number, sellingPrice: number): number {
    const cost = parseFloat(costPrice.toString());
    const selling = parseFloat(sellingPrice.toString());
    if (cost === 0) return 0;
    return Math.round(((selling - cost) / cost) * 100 * 100) / 100;
  }

  private calculateProfitPerUnit(costPrice: number, sellingPrice: number): number {
    const cost = parseFloat(costPrice.toString());
    const selling = parseFloat(sellingPrice.toString());
    return Math.round((selling - cost) * 100) / 100;
  }
}
