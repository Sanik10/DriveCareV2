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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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

@ApiTags('🏭 Каталог транспортных средств')
@Controller('vehicles-catalogue')
export class VehiclesCatalogueController {
  constructor(private readonly service: VehiclesCatalogueService) {}

  // 🏭 ========== BRANDS ENDPOINTS ==========

  @Post('brands')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin') // 🔒 Только платформенные роли могут создавать бренды
  @ApiOperation({
    summary: 'Создание нового бренда',
    description: 'Создание бренда автомобиля. Доступно только платформенным администраторам.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: BrandResponseDto })
  @ApiBadRequestResponse({ description: 'Бренд с таким названием уже существует' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createBrand(@Body() createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    return this.service.createBrand(createBrandDto);
  }

  @Get('brands')
  @AuthWithOwnership() // 🔒 Авторизация обязательна, но каталог глобальный
  @AllowCache(3600, 'public')
  @ApiOperation({
    summary: 'Получение списка брендов',
    description: 'Получение списка всех активных брендов автомобилей.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию бренда' })
  @ApiQuery({ name: 'country', required: false, description: 'Фильтр по стране' })
  @ApiQuery({ name: 'page', required: false, description: 'Страница (>=1)', schema: { default: 1 } })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Размер страницы (по умолчанию 50, максимум ограничен конфигом)',
    schema: { default: 50 },
  })
  @ApiResponse({ status: HttpStatus.OK, type: [BrandResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getBrands(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<BrandResponseDto[]> {
    return this.service.getBrands({ search, country, page, limit });
  }

  @Get('brands/:id')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение бренда по ID' })
  @ApiResponse({ status: HttpStatus.OK, type: BrandResponseDto })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getBrand(@Param('id') id: string): Promise<BrandResponseDto> {
    return this.service.getBrand(id);
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

  @Delete('brands/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('superadmin') // 🔒 Только суперадмин может удалять
  @ApiOperation({ summary: 'Удаление бренда (только суперадмин)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBadRequestResponse({ description: 'Невозможно удалить бренд с привязанными моделями' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteBrand(@Param('id') id: string): Promise<void> {
    return this.service.deleteBrand(id);
  }

  // 🚗 ========== MODELS ENDPOINTS ==========

  @Post('models')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Создание новой модели автомобиля' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ModelResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createModel(@Body() createModelDto: CreateModelDto): Promise<ModelResponseDto> {
    return this.service.createModel(createModelDto);
  }

  @Get('models')
  @AuthWithOwnership()
  @AllowCache(3600, 'public')
  @ApiOperation({ summary: 'Получение списка моделей' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Фильтр по бренду' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию модели' })
  @ApiQuery({ name: 'page', required: false, description: 'Страница (>=1)', schema: { default: 1 } })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Размер страницы (по умолчанию 50, максимум ограничен конфигом)',
    schema: { default: 50 },
  })
  @ApiResponse({ status: HttpStatus.OK, type: [ModelResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getModels(
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<ModelResponseDto[]> {
    return this.service.getModels({ brandId, search, page, limit });
  }

  @Get('models/:id')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение модели по ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ModelResponseDto })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getModel(@Param('id') id: string): Promise<ModelResponseDto> {
    return this.service.getModel(id);
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

  // 🚙 ========== TYPES ENDPOINTS ==========

  @Post('types')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Создание нового типа ТС' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TypeResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createType(@Body() createTypeDto: CreateTypeDto): Promise<TypeResponseDto> {
    return this.service.createType(createTypeDto);
  }

  @Get('types')
  @AuthWithOwnership()
  @AllowCache(3600, 'public')
  @ApiOperation({ summary: 'Получение списка типов ТС' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию типа' })
  @ApiQuery({ name: 'page', required: false, description: 'Страница (>=1)', schema: { default: 1 } })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Размер страницы (по умолчанию 50, максимум ограничен конфигом)',
    schema: { default: 50 },
  })
  @ApiResponse({ status: HttpStatus.OK, type: [TypeResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getTypes(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<TypeResponseDto[]> {
    return this.service.getTypes({ search, page, limit });
  }

  @Get('types/:id')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение типа ТС по ID' })
  @ApiResponse({ status: HttpStatus.OK, type: TypeResponseDto })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getType(@Param('id') id: string): Promise<TypeResponseDto> {
    return this.service.getType(id);
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
}
