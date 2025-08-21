// path: apps/backend/src/modules/inventory/parts/parts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PartsBusinessService } from './services/parts-business.service';
import { PartsDataService } from './services/parts-data.service';
import { PartsMapperService } from './services/parts-mapper.service';
import { PartsValidationService } from './services/parts-validation.service';
import { CreatePartDto } from './dto/request/create-part.dto';
import { UpdatePartDto } from './dto/request/update-part.dto';
import { BulkUpdatePartsDto } from './dto/request/bulk-update-parts.dto';
import { PartResponseDto } from './dto/response/part-response.dto';
import { PaginatedPartsResponseDto } from './dto/response/paginated-parts-response.dto';
import { PartFilter, BulkOperationResult } from './types/parts.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { PARTS_CONSTANTS } from './constants/parts.constants';

@Injectable()
export class PartsService {
  private readonly logger = new Logger(PartsService.name);
  private readonly maxPageSize: number;

  constructor(
    private readonly partsDataService: PartsDataService,
    private readonly partsBusinessService: PartsBusinessService,
    private readonly partsValidationService: PartsValidationService,
    private readonly partsMapperService: PartsMapperService,
    private readonly configService: ConfigService,
  ) {
    this.maxPageSize = this.configService.get<number>('inventory.pagination.maxPageSize', 100);
  }

  async createForUser(createPartDto: CreatePartDto, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Creating part: ${createPartDto.name} for company ${user.companyId}`);
    this.partsValidationService.validateOperationPermissions('create', user.role);
    const createData = await this.partsValidationService.validateCreateData(createPartDto, user.companyId!);
    const part = await this.partsBusinessService.createPart(createData, user);
    this.logger.log(`Part created: ${part.name} (${part.id}) for company ${part.companyId}`);
    return this.partsMapperService.mapToResponseDtoForRole(part, user.role);
  }

  async findAllForUser(user: RequestWithUser['user'], filter: PartFilter = {}): Promise<PaginatedPartsResponseDto> {
    this.logger.log(`Finding parts with filters: ${JSON.stringify(filter)}`);
    this.partsValidationService.validateOperationPermissions('view', user.role);

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit ? Math.min(filter.limit, this.maxPageSize) : PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE;

    const [parts, total] = await this.partsDataService.findWithFilters({ ...filter, page, limit });

    const mappedParts = this.partsMapperService.mapArrayToResponseDtoForRole(parts, user.role);

    const totalValue = mappedParts.reduce((sum, part) => sum + ((part.costPrice ?? 0) * 1), 0);
    const averagePrice = mappedParts.length > 0 ? totalValue / mappedParts.length : 0;
    const activeCount = mappedParts.filter((part) => part.isActive).length;
    const inactiveCount = mappedParts.length - activeCount;
    const totalPages = Math.ceil(total / limit);

    return {
      items: mappedParts,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalValue: Math.round(totalValue * 100) / 100,
      averagePrice: Math.round(averagePrice * 100) / 100,
      activeCount,
      inactiveCount,
    };
  }

  async findOne(id: string, role?: RequestWithUser['user']['role']): Promise<PartResponseDto> {
    this.logger.log(`Finding part: ${id}`);
    const part = await this.partsValidationService.validatePartExists(id);
    return this.partsMapperService.mapToResponseDtoForRole(part, role);
  }

  async update(id: string, updatePartDto: UpdatePartDto, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Updating part: ${id}`);
    this.partsValidationService.validateOperationPermissions('update', user.role);
    const { part, updateData } = await this.partsValidationService.validateUpdateData(id, updatePartDto, user.companyId!);
    const updatedPart = await this.partsBusinessService.updatePart(id, updateData, user);
    this.logger.log(`Part updated: ${updatedPart.name} (${updatedPart.id})`);
    return this.partsMapperService.mapToResponseDtoForRole(updatedPart, user.role);
  }

  async remove(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Removing part: ${id}`);
    this.partsValidationService.validateOperationPermissions('delete', user.role);
    await this.partsValidationService.validateDeletePart(id, user.companyId!);
    await this.partsBusinessService.deletePart(id, user);
    this.logger.log(`Part removed: ${id}`);
  }

  async setActive(id: string, isActive: boolean, user: RequestWithUser['user']): Promise<PartResponseDto> {
    this.logger.log(`Setting part ${id} active status to: ${isActive}`);
    this.partsValidationService.validateOperationPermissions('update', user.role);
    await this.partsValidationService.validatePartOwnership(id, user.companyId!);
    const part = await this.partsBusinessService.setPartActive(id, isActive, user);
    return this.partsMapperService.mapToResponseDtoForRole(part, user.role);
  }

  async searchParts(searchTerm: string, companyId: string, limit: number = 10, role?: RequestWithUser['user']['role']): Promise<PartResponseDto[]> {
    this.logger.log(`Searching parts: "${searchTerm}" for company: ${companyId}`);
    if (searchTerm.length < PARTS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) return [];
    if (searchTerm.length > PARTS_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH) {
      searchTerm = searchTerm.substring(0, PARTS_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH);
    }
    const parts = await this.partsBusinessService.searchParts(searchTerm, companyId, limit);
    return this.partsMapperService.mapArrayToResponseDtoForRole(parts, role);
  }

  async bulkUpdate(
    bulkUpdateDto: BulkUpdatePartsDto,
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<BulkOperationResult> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.partIds.length} parts for company: ${user.companyId}`);
    const { parts, updateData } = await this.partsValidationService.validateBulkUpdate(bulkUpdateDto, user);
    const result = await this.partsBusinessService.bulkUpdateParts(bulkUpdateDto.partIds, updateData, user, idempotencyKey);
    this.logger.log(`Bulk update completed: ${result.successCount} success, ${result.failureCount} failures`);
    return result;
  }

  async getPopularParts(companyId: string, limit: number = 20, role?: RequestWithUser['user']['role']): Promise<PartResponseDto[]> {
    const parts = await this.partsBusinessService.getPopularParts(companyId, limit);
    return this.partsMapperService.mapArrayToResponseDtoForRole(parts, role);
  }

  async getStats(companyId: string): Promise<any> {
    this.logger.log(`Getting parts statistics for company: ${companyId}`);
    return this.partsBusinessService.getPartsStats(companyId);
  }

  async analyzeProfitability(companyId: string): Promise<any> {
    this.logger.log(`Analyzing profitability for company: ${companyId}`);
    return this.partsBusinessService.analyzeProfitability(companyId);
  }

  async exists(partId: string, companyId: string): Promise<boolean> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    return !!part;
  }

  async getBasicInfo(partId: string, companyId: string): Promise<any> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    return part ? this.partsMapperService.mapToBasicInfo(part) : null;
  }

  async getPartWithInventory(partId: string, companyId: string): Promise<PartResponseDto | null> {
    const part = await this.partsBusinessService.getPartWithInventory(partId, companyId);
    return part ? this.partsMapperService.mapToResponseDto(part) : null;
  }

  async getMultipleParts(partIds: string[], companyId: string): Promise<PartResponseDto[]> {
    const parts = await this.partsDataService.findMultipleByIds(partIds, companyId);
    return this.partsMapperService.mapArrayToResponseDto(parts);
  }
}
