// path: apps/backend/src/modules/services/services.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthWithOwnership, ServiceResource } from '../../common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/request/create-service.dto';
import { UpdateServiceDto } from './dto/request/update-service.dto';
import { BulkUpdateServicesDto } from './dto/request/bulk-update-services.dto';
import { ServiceResponseDto } from './dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from './dto/response/paginated-services-response.dto';
import { ServicesFilter } from './types/services.types';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить список услуг компании' })
  @ApiResponse({ type: PaginatedServicesResponseDto })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество элементов на странице' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или описанию' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Фильтр по статусу активности' })
  async findAll(@Req() req: RequestWithUser, @Query() filter: ServicesFilter): Promise<PaginatedServicesResponseDto> {
    return this.servicesService.findAllForUser(req.user, filter);
  }

  @Get('stats')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить статистику услуг компании' })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.servicesService.getStats(req.user);
  }

  @Get('search')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Поиск услуг по названию' })
  @ApiQuery({ name: 'q', required: true, description: 'Поисковый запрос' })
  async search(@Query('q') query: string, @Req() req: RequestWithUser): Promise<ServiceResponseDto[]> {
    return this.servicesService.search(query, req.user);
  }

  @Get('quick')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить активные услуги для быстрого доступа' })
  async getActiveQuick(
    @Req() req: RequestWithUser,
  ): Promise<Array<{ id: string; name: string; price: number; duration: number }>> {
    return this.servicesService.getActiveQuick(req.user);
  }

  @Get('for-select')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить услуги для dropdown/select компонентов' })
  async getForSelect(
    @Req() req: RequestWithUser,
  ): Promise<Array<{ value: string; label: string; disabled?: boolean; meta?: any }>> {
    return this.servicesService.getForSelect(req.user);
  }

  @Get('category/:categoryId')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить услуги по категории' })
  @ApiResponse({ type: [ServiceResponseDto] })
  async findByCategory(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Req() req: RequestWithUser,
  ): Promise<ServiceResponseDto[]> {
    return this.servicesService.findByCategory(categoryId, req.user);
  }

  @Get('price-range')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить услуги в ценовом диапазоне' })
  @ApiQuery({ name: 'minPrice', required: true, description: 'Минимальная цена' })
  @ApiQuery({ name: 'maxPrice', required: true, description: 'Максимальная цена' })
  async findByPriceRange(
    @Query('minPrice') minPriceStr: string,
    @Query('maxPrice') maxPriceStr: string,
    @Req() req: RequestWithUser,
  ): Promise<ServiceResponseDto[]> {
    const minPrice = Number(minPriceStr);
    const maxPrice = Number(maxPriceStr);
    return this.servicesService.findByPriceRange(minPrice, maxPrice, req.user);
  }

  @Get('quick-services')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить быстрые услуги (до указанного времени)' })
  @ApiQuery({ name: 'maxDuration', required: true, description: 'Максимальная длительность в минутах' })
  async findQuickServices(
    @Query('maxDuration', ParseIntPipe) maxDuration: number,
    @Req() req: RequestWithUser,
  ): Promise<ServiceResponseDto[]> {
    return this.servicesService.findQuickServices(maxDuration, req.user);
  }

  @Get(':id')
  @AuthWithOwnership()
  @ServiceResource()
  @ApiOperation({ summary: 'Получить услугу по ID' })
  @ApiResponse({ type: ServiceResponseDto })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ServiceResponseDto> {
    return this.servicesService.findOne(id);
  }

  @Get(':id/availability')
  @AuthWithOwnership()
  @ServiceResource()
  @ApiOperation({ summary: 'Проверить доступность услуги' })
  async checkAvailability(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ available: boolean; service?: ServiceResponseDto; reason?: string }> {
    return this.servicesService.checkAvailability(id, req.user);
  }

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Создать новую услугу' })
  @ApiResponse({ type: ServiceResponseDto })
  async create(@Body() dto: CreateServiceDto, @Req() req: RequestWithUser): Promise<ServiceResponseDto> {
    return this.servicesService.createForUser(dto, req.user);
  }

  @Post('bulk-update')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Массовое обновление услуг' })
  async bulkUpdate(
    @Body() dto: BulkUpdateServicesDto,
    @Req() req: RequestWithUser,
  ): Promise<{ updated: number; failed: number; message: string }> {
    return this.servicesService.bulkUpdate(dto.serviceIds, dto.updates, req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @ServiceResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Обновить услугу' })
  @ApiResponse({ type: ServiceResponseDto })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateServiceDto,
    @Req() req: RequestWithUser,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, dto, req.user);
  }

  @Post(':id/toggle-status')
  @AuthWithOwnership()
  @ServiceResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Переключить статус активности услуги' })
  async toggleStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.toggleStatus(id, req.user);
  }

  @Delete(':id')
  @AuthWithOwnership()
  @ServiceResource()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Удалить услугу' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.servicesService.remove(id, req.user);
    return { message: 'Услуга успешно удалена' };
  }
}
