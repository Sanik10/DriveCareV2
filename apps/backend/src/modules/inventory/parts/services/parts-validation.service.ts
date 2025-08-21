// path: apps/backend/src/modules/inventory/parts/services/parts-validation.service.ts
import { Injectable } from '@nestjs/common';
import { PartsDataService } from './parts-data.service';
import { Part } from '../../../../database/entities';
import { CreatePartDto } from '../dto/request/create-part.dto';
import { UpdatePartDto } from '../dto/request/update-part.dto';
import { BulkUpdatePartsDto } from '../dto/request/bulk-update-parts.dto';
import { CreatePartData, UpdatePartData } from '../types/parts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuthRole } from '../../../auth/types/auth.types';
import {
  ValidationDataException,
  ResourceOwnershipException,
  ResourceNotFoundException,
} from '../../../../common/exceptions/domain.exceptions';
import { PARTS_CONSTANTS } from '../constants/parts.constants';

@Injectable()
export class PartsValidationService {
  constructor(private readonly partsDataService: PartsDataService) {}

  async validatePartExists(id: string): Promise<Part> {
    const part = await this.partsDataService.findById(id);
    if (!part) {
      throw new ResourceNotFoundException('part', id);
    }
    return part;
  }

  async validatePartOwnership(partId: string, userCompanyId: string): Promise<Part> {
    const part = await this.partsDataService.findByIdAndCompany(partId, userCompanyId);
    if (!part) {
      throw new ResourceOwnershipException('part', partId);
    }
    return part;
  }

  async validateCreateData(dto: CreatePartDto, companyId: string): Promise<CreatePartData> {
    const categoryExists = await this.partsDataService.validateCategoryExists(dto.categoryId, companyId);
    if (!categoryExists) {
      throw new ValidationDataException('categoryId', 'Указанная категория не найдена или не принадлежит компании');
    }

    if (dto.partNumber) {
      const existingPart = await this.partsDataService.findByPartNumber(dto.partNumber, companyId);
      if (existingPart && !PARTS_CONSTANTS.BUSINESS_RULES.DUPLICATE_PART_NUMBER_ALLOWED) {
        throw new ValidationDataException('partNumber', `Запчасть с номером ${dto.partNumber} уже существует в компании`);
      }
    }

    this.validateBusinessRules(dto);

    const createData: CreatePartData = {
      companyId,
      categoryId: dto.categoryId,
      name: dto.name.trim(),
      partNumber: dto.partNumber?.trim() || this.generatePartNumber(),
      brand: dto.brand?.trim(),
      description: dto.description?.trim(),
      costPrice: dto.costPrice,
      sellingPrice: dto.sellingPrice,
      imageUrl: dto.imageUrl?.trim(),
      isActive: dto.isActive ?? PARTS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE,
    };

    return createData;
  }

  async validateUpdateData(
    id: string,
    dto: UpdatePartDto,
    userCompanyId: string,
  ): Promise<{ part: Part; updateData: UpdatePartData }> {
    const part = await this.validatePartOwnership(id, userCompanyId);

    if (dto.categoryId && dto.categoryId !== part.categoryId) {
      const categoryExists = await this.partsDataService.validateCategoryExists(dto.categoryId, userCompanyId);
      if (!categoryExists) {
        throw new ValidationDataException('categoryId', 'Указанная категория не найдена или не принадлежит компании');
      }
    }

    if (dto.partNumber && dto.partNumber !== part.partNumber) {
      const existingPart = await this.partsDataService.findByPartNumber(dto.partNumber, userCompanyId);
      if (existingPart && existingPart.id !== id && !PARTS_CONSTANTS.BUSINESS_RULES.DUPLICATE_PART_NUMBER_ALLOWED) {
        throw new ValidationDataException('partNumber', `Запчасть с номером ${dto.partNumber} уже существует в компании`);
      }
    }

    this.validateBusinessRules(dto);

    const updateData: UpdatePartData = {};
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.partNumber !== undefined) updateData.partNumber = dto.partNumber.trim();
    if (dto.brand !== undefined) updateData.brand = dto.brand?.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim();
    if (dto.costPrice !== undefined) updateData.costPrice = dto.costPrice;
    if (dto.sellingPrice !== undefined) updateData.sellingPrice = dto.sellingPrice;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl?.trim();
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return { part, updateData };
  }

  async validateBulkUpdate(dto: BulkUpdatePartsDto, user: RequestWithUser['user']): Promise<{
    parts: Part[];
    updateData: UpdatePartData;
  }> {
    this.validateOperationPermissions('bulk_update', user.role);

    const parts = await this.partsDataService.findMultipleByIds(dto.partIds, user.companyId!);
    if (parts.length !== dto.partIds.length) {
      const foundPartIds = parts.map((p) => p.id);
      const missingPartIds = dto.partIds.filter((id) => !foundPartIds.includes(id));
      throw new ValidationDataException('partIds', `Не найдены или не принадлежат компании: ${missingPartIds.join(', ')}`);
    }

    if (dto.updateData.categoryId) {
      const categoryExists = await this.partsDataService.validateCategoryExists(dto.updateData.categoryId, user.companyId!);
      if (!categoryExists) {
        throw new ValidationDataException('updateData.categoryId', 'Указанная категория не найдена или не принадлежит компании');
      }
    }

    if (dto.updateData.costPrice !== undefined) {
      this.validatePriceValue('costPrice', dto.updateData.costPrice);
    }
    if (dto.updateData.sellingPrice !== undefined) {
      this.validatePriceValue('sellingPrice', dto.updateData.sellingPrice);
    }
    if (dto.updateData.costPrice !== undefined && dto.updateData.sellingPrice !== undefined) {
      this.validatePriceRatio(dto.updateData.costPrice, dto.updateData.sellingPrice);
    }

    return { parts, updateData: dto.updateData };
  }

  async validateDeletePart(partId: string, userCompanyId: string): Promise<Part> {
    const part = await this.validatePartOwnership(partId, userCompanyId);
    // TODO: Проверить отсутствие активных заказов/остатков
    return part;
  }

  validateOperationPermissions(operation: string, userRole: AuthRole): void {
    const permissions = PARTS_CONSTANTS.PERMISSIONS;

    switch (operation) {
      case 'view':
        if (!permissions.CAN_VIEW.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для просмотра запчастей');
        }
        break;
      case 'create':
        if (!permissions.CAN_CREATE.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для создания запчастей');
        }
        break;
      case 'update':
        if (!permissions.CAN_UPDATE.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для обновления запчастей');
        }
        break;
      case 'delete':
        if (!permissions.CAN_DELETE.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для удаления запчастей');
        }
        break;
      case 'bulk_update':
        if (!permissions.CAN_BULK_UPDATE.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для массового обновления запчастей');
        }
        break;
      case 'view_costs':
        if (!permissions.CAN_VIEW_COSTS.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для просмотра себестоимости');
        }
        break;
      case 'update_prices':
        if (!permissions.CAN_UPDATE_PRICES.includes(userRole)) {
          throw new ValidationDataException('permissions', 'Недостаточно прав для изменения цен');
        }
        break;
      default:
        throw new ValidationDataException('operation', `Неизвестная операция: ${operation}`);
    }
  }

  private validateBusinessRules(data: CreatePartDto | UpdatePartDto): void {
    if (data.costPrice !== undefined) this.validatePriceValue('costPrice', data.costPrice);
    if (data.sellingPrice !== undefined) this.validatePriceValue('sellingPrice', data.sellingPrice);
    if (data.costPrice !== undefined && data.sellingPrice !== undefined) {
      this.validatePriceRatio(data.costPrice, data.sellingPrice);
    }

    if (PARTS_CONSTANTS.BUSINESS_RULES.REQUIRE_PART_NUMBER && !('partNumber' in data && data.partNumber)) {
      throw new ValidationDataException('partNumber', 'Номер запчасти обязателен для заполнения');
    }

    if (PARTS_CONSTANTS.BUSINESS_RULES.REQUIRE_BRAND && !('brand' in data && data.brand)) {
      throw new ValidationDataException('brand', 'Бренд обязателен для заполнения');
    }

    if ((data as any).imageUrl) {
      this.validateImageUrl((data as any).imageUrl);
    }
  }

  private validatePriceValue(field: 'costPrice' | 'sellingPrice', value: number): void {
    if (value < PARTS_CONSTANTS.VALIDATION.MIN_PRICE) {
      throw new ValidationDataException(field, `${field} не может быть меньше ${PARTS_CONSTANTS.VALIDATION.MIN_PRICE}`);
    }
    if (value > PARTS_CONSTANTS.VALIDATION.MAX_PRICE) {
      throw new ValidationDataException(field, `${field} не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_PRICE}`);
    }
  }

  private validatePriceRatio(costPrice: number, sellingPrice: number): void {
    if (sellingPrice < costPrice * PARTS_CONSTANTS.BUSINESS_RULES.MIN_SELLING_PRICE_RATIO) {
      throw new ValidationDataException('sellingPrice', 'Цена продажи не может быть меньше себестоимости');
    }
    const markupPercent = ((sellingPrice - costPrice) / costPrice) * 100;
    if (markupPercent > PARTS_CONSTANTS.BUSINESS_RULES.SELLING_PRICE_MARKUP_WARNING) {
      // можно логировать предупреждение, но не блокировать
      // eslint-disable-next-line no-console
      console.warn(
        `High markup detected: ${markupPercent.toFixed(1)}% (costPrice: ${costPrice}, sellingPrice: ${sellingPrice})`,
      );
    }
  }

  private validateImageUrl(imageUrl: string): void {
    const allowedExtensions = PARTS_CONSTANTS.FILES.ALLOWED_IMAGE_EXTENSIONS as readonly string[];
    const lower = imageUrl.toLowerCase();
    const lastDot = lower.lastIndexOf('.');
    const extension = lastDot >= 0 ? lower.substring(lastDot) : '';

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ValidationDataException(
        'imageUrl',
        `Недопустимое расширение файла. Разрешены: ${allowedExtensions.join(', ')}`,
      );
    }
  }

  private generatePartNumber(): string {
    if (!PARTS_CONSTANTS.BUSINESS_RULES.AUTO_GENERATE_PART_NUMBER) {
      return '';
    }
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PT-${timestamp}-${random}`;
  }
}
