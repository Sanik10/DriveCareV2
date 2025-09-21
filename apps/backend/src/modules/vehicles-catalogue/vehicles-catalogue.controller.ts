// path: apps/backend/src/modules/vehicles-catalogue/vehicles-catalogue.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { VehiclesCatalogueService } from './vehicles-catalogue.service';
import { CreateBrandDto } from './dto/brands/create-brand.dto';
import { UpdateBrandDto } from './dto/brands/update-brand.dto';
import { BrandResponseDto } from './dto/brands/brand-response.dto';
import { CreateModelDto } from './dto/models/create-model.dto';
import { UpdateModelDto } from './dto/models/update-model.dto';
import { ModelResponseDto } from './dto/models/model-response.dto';
import { CreateTypeDto } from './dto/types/create-type.dto';
import { UpdateTypeDto } from './dto/types/update-type.dto';
import { TypeResponseDto } from './dto/types/type-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthWithOwnership } from '../../common';
import { AllowCache } from '../../common/decorators/cache-policy.decorator';
import { CatalogueSuggestResponseDto } from './dto/suggest/suggest-response.dto';
import { MergeBrandDto } from './dto/brands/merge-brand.dto';
import { MergeModelDto } from './dto/models/merge-model.dto';
import { CATALOGUE_CONSTANTS } from './constants/catalogue.constants';
import { ExternalBrandResponseDto } from './dto/external/external-brand-response.dto';
import { ExternalModelResponseDto } from './dto/external/external-model-response.dto';
import { ImportExternalDto } from './dto/external/import-external.dto';
import { ImportExternalResponseDto } from './dto/external/import-external-response.dto';

@ApiTags('🏭 Каталог транспортных средств')
@Controller('vehicles-catalogue')
export class VehiclesCatalogueController {
  constructor(private readonly service: VehiclesCatalogueService) {}

  // ===== BRANDS =====

  @Post('brands')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
  @ApiOperation({ summary: 'Создание нового бренда' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BrandResponseDto })
  @ApiBadRequestResponse({ description: 'Бренд с таким названием уже существует' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createBrand(@Body() createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    return this.service.createBrand(createBrandDto);
  }

  @Get('brands')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение списка брендов (без кэширования для backoffice)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'isActive', required: false, description: 'true|false' })
  @ApiQuery({ name: 'isVerified', required: false, description: 'true|false' })
  @ApiQuery({ name: 'page', required: false, schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 50 } })
  @ApiResponse({ status: HttpStatus.OK, type: [BrandResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getBrands(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<BrandResponseDto[]> {
    return this.service.getBrands({ search, country, isActive, isVerified, page, limit } as any);
  }

  @Patch('brands/:id')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Обновление бренда' })
  @ApiResponse({ status: HttpStatus.OK, type: BrandResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateBrand(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto): Promise<BrandResponseDto> {
    return this.service.updateBrand(id, updateBrandDto);
  }

  @Patch('brands/:id/verify')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Подтвердить/снять подтверждение бренда' })
  @ApiQuery({ name: 'isVerified', required: true, schema: { default: true } })
  @ApiResponse({ status: HttpStatus.OK, type: BrandResponseDto })
  async verifyBrand(
    @Param('id') id: string,
    @Query('isVerified', ParseBoolPipe) isVerified: boolean,
  ): Promise<BrandResponseDto> {
    return this.service.verifyBrand(id, isVerified);
  }

  @Delete('brands/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Удаление бренда (только суперадмин)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBadRequestResponse({ description: 'Невозможно удалить бренд с привязанными моделями' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteBrand(@Param('id') id: string): Promise<void> {
    return this.service.deleteBrand(id);
  }

  @Post('brands/:id/merge')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Слияние бренда с другим брендом' })
  @ApiParam({ name: 'id', description: 'Исходный бренд' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async mergeBrand(
    @Param('id') id: string,
    @Body() body: MergeBrandDto,
  ): Promise<void> {
    if (!body?.targetBrandId) throw new BadRequestException('targetBrandId is required');
    await this.service.mergeBrand(id, body.targetBrandId);
  }

  // ===== MODELS =====

  @Post('models')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
  @ApiOperation({ summary: 'Создание новой модели' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ModelResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createModel(@Body() createModelDto: CreateModelDto): Promise<ModelResponseDto> {
    return this.service.createModel(createModelDto);
  }

  @Get('models')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение списка моделей (без кэширования для backoffice)' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, description: 'true|false' })
  @ApiQuery({ name: 'isVerified', required: false, description: 'true|false' })
  @ApiQuery({ name: 'page', required: false, schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 50 } })
  @ApiResponse({ status: HttpStatus.OK, type: [ModelResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getModels(
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<ModelResponseDto[]> {
    return this.service.getModels({ brandId, search, isActive, isVerified, page, limit } as any);
  }

  @Patch('models/:id')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Обновление модели' })
  @ApiResponse({ status: HttpStatus.OK, type: ModelResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateModel(@Param('id') id: string, @Body() updateModelDto: UpdateModelDto): Promise<ModelResponseDto> {
    return this.service.updateModel(id, updateModelDto);
  }

  @Patch('models/:id/verify')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Подтвердить/снять подтверждение модели' })
  @ApiQuery({ name: 'isVerified', required: true, schema: { default: true } })
  @ApiResponse({ status: HttpStatus.OK, type: ModelResponseDto })
  async verifyModel(
    @Param('id') id: string,
    @Query('isVerified', ParseBoolPipe) isVerified: boolean,
  ): Promise<ModelResponseDto> {
    return this.service.verifyModel(id, isVerified);
  }

  @Delete('models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Удаление модели (только суперадмин)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteModel(@Param('id') id: string): Promise<void> {
    return this.service.deleteModel(id);
  }

  @Post('models/:id/merge')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Слияние модели с другой моделью' })
  @ApiParam({ name: 'id', description: 'Исходная модель' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async mergeModel(
    @Param('id') id: string,
    @Body() body: MergeModelDto,
  ): Promise<void> {
    if (!body?.targetModelId) throw new BadRequestException('targetModelId is required');
    await this.service.mergeModel(id, body.targetModelId);
  }

  // ===== TYPES =====

  @Post('types')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
  @ApiOperation({ summary: 'Создание нового типа ТС' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TypeResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createType(@Body() createTypeDto: CreateTypeDto): Promise<TypeResponseDto> {
    return this.service.createType(createTypeDto);
  }

  @Get('types')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение списка типов ТС (без кэширования для backoffice)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 50 } })
  @ApiResponse({ status: HttpStatus.OK, type: [TypeResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getTypes(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<TypeResponseDto[]> {
    return this.service.getTypes({ search, page, limit });
  }

  @Patch('types/:id')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Обновление типа ТС' })
  @ApiResponse({ status: HttpStatus.OK, type: TypeResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateType(@Param('id') id: string, @Body() updateTypeDto: UpdateTypeDto): Promise<TypeResponseDto> {
    return this.service.updateType(id, updateTypeDto);
  }

  @Patch('types/:id/verify')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Подтвердить/снять подтверждение типа ТС' })
  @ApiQuery({ name: 'isVerified', required: true, schema: { default: true } })
  @ApiResponse({ status: HttpStatus.OK, type: TypeResponseDto })
  async verifyType(
    @Param('id') id: string,
    @Query('isVerified', ParseBoolPipe) isVerified: boolean,
  ): Promise<TypeResponseDto> {
    return this.service.verifyType(id, isVerified);
  }

  @Delete('types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Удаление типа ТС (только суперадмин)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteType(@Param('id') id: string): Promise<void> {
    return this.service.deleteType(id);
  }

  // ===== SUGGEST =====

  @Get('suggest')
  @AuthWithOwnership()
  @ApiOperation({
    summary: 'Фаззи-подсказки по брендам и моделям',
    description: 'Возвращает ближайшие совпадения по брендам и моделям. Можно ограничивать по brandId.',
  })
  @ApiQuery({ name: 'q', required: true, description: `Строка поиска (минимум ${CATALOGUE_CONSTANTS.SUGGEST.MIN_QUERY_LENGTH} символа)` })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'limitBrands', required: false })
  @ApiQuery({ name: 'limitModels', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: CatalogueSuggestResponseDto })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async suggest(
    @Query('q') q: string,
    @Query('brandId') brandId?: string,
    @Query('limitBrands', new DefaultValuePipe(CATALOGUE_CONSTANTS.SUGGEST.MAX_BRANDS), ParseIntPipe) limitBrands?: number,
    @Query('limitModels', new DefaultValuePipe(CATALOGUE_CONSTANTS.SUGGEST.MAX_MODELS), ParseIntPipe) limitModels?: number,
  ) {
    return this.service.suggest(q, brandId, limitBrands, limitModels);
  }

  // ===== EXTERNAL SOURCES =====

  @Get('external/brands')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @AllowCache(3600, 'public')
  @ApiOperation({ summary: 'Внешние бренды (например, NHTSA)' })
  @ApiQuery({ name: 'source', required: false, schema: { default: 'nhtsa', enum: ['nhtsa'] } })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 100 } })
  @ApiResponse({ status: HttpStatus.OK, type: [ExternalBrandResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async externalBrands(
    @Query('source', new DefaultValuePipe('nhtsa')) source: 'nhtsa',
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ): Promise<ExternalBrandResponseDto[]> {
    return this.service.externalBrands(source, search, limit);
  }

  @Get('external/models')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @AllowCache(3600, 'public')
  @ApiOperation({ summary: 'Внешние модели по бренду (например, NHTSA)' })
  @ApiQuery({ name: 'source', required: false, schema: { default: 'nhtsa', enum: ['nhtsa'] } })
  @ApiQuery({ name: 'brandName', required: true })
  @ApiQuery({ name: 'limit', required: false, schema: { default: 200 } })
  @ApiResponse({ status: HttpStatus.OK, type: [ExternalModelResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async externalModels(
    @Query('source', new DefaultValuePipe('nhtsa')) source: 'nhtsa',
    @Query('brandName') brandName: string,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit?: number,
  ): Promise<ExternalModelResponseDto[]> {
    if (!brandName?.trim()) {
      throw new BadRequestException('brandName is required');
    }
    return this.service.externalModels(source, brandName, limit);
  }

  @Post('import/external')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Импорт брендов/моделей из внешнего источника' })
  @ApiResponse({ status: HttpStatus.OK, type: ImportExternalResponseDto })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async importExternal(@Body() dto: ImportExternalDto): Promise<ImportExternalResponseDto> {
    return this.service.importFromExternal(dto);
  }
}
