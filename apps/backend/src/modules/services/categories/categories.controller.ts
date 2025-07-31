import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  Req 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthWithOwnership, ServiceCategoryResource } from '../../../common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryResponseDto } from './dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from './dto/response/paginated-categories-response.dto';
import { CategoriesFilter } from './types/categories.types';

@ApiTags('Service Categories')
@Controller('services/categories')
export class ServiceCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @AuthWithOwnership() // 🛡️ Security: JWT + Roles + Ownership
  @ApiOperation({ summary: 'Получить список категорий услуг' })
  @ApiResponse({ type: PaginatedCategoriesResponseDto })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество элементов на странице' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или описанию' })
  @ApiQuery({ name: 'includeGlobal', required: false, description: 'Включать глобальные категории' })
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filter: CategoriesFilter
  ): Promise<PaginatedCategoriesResponseDto> {
    // 🔒 КРИТИЧНО: фильтрация по принадлежности компании
    return this.categoriesService.findAllForUser(req.user, filter);
  }

  @Get('stats')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить статистику категорий' })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.categoriesService.getStats(req.user);
  }

  @Get('search')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Поиск категорий по названию' })
  @ApiQuery({ name: 'q', required: true, description: 'Поисковый запрос' })
  async search(
    @Query('q') query: string,
    @Req() req: RequestWithUser
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.search(query, req.user);
  }

  @Get('for-select')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить категории для dropdown/select компонентов' })
  async getForSelect(@Req() req: RequestWithUser): Promise<Array<{
    value: string;
    label: string;
    group?: string;
    disabled?: boolean;
  }>> {
    return this.categoriesService.getForSelect(req.user);
  }

  @Get('with-services-count')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить категории с количеством услуг' })
  async getWithServicesCount(@Req() req: RequestWithUser): Promise<Array<CategoryResponseDto & { servicesCount: number }>> {
    return this.categoriesService.getWithServicesCount(req.user);
  }

  @Get('grouped')
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получить сгруппированные категории (глобальные/компании)' })
  async getGrouped(@Req() req: RequestWithUser): Promise<{
    global: CategoryResponseDto[];
    company: CategoryResponseDto[];
  }> {
    return this.categoriesService.getGrouped(req.user);
  }

  @Get(':id')
  @AuthWithOwnership()
  @ServiceCategoryResource() // 🛡️ Проверка: category доступна для компании
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({ type: CategoryResponseDto })
  async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager') // 🔒 Только admin+ могут создавать категории
  @ApiOperation({ summary: 'Создать новую категорию' })
  @ApiResponse({ type: CategoryResponseDto })
  async create(
    @Body() dto: CreateCategoryDto,
    @Req() req: RequestWithUser
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.createForUser(dto, req.user);
  }

  @Post('initialize-global')
  @AuthWithOwnership()
  @Roles('superadmin') // 🔒 Только superadmin может создавать глобальные категории
  @ApiOperation({ summary: 'Инициализировать глобальные категории' })
  async initializeGlobal(@Req() req: RequestWithUser): Promise<CategoryResponseDto[]> {
    return this.categoriesService.initializeGlobal(req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @ServiceCategoryResource() // 🛡️ Нельзя редактировать чужие/глобальные категории
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Обновить категорию' })
  @ApiResponse({ type: CategoryResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @AuthWithOwnership()
  @ServiceCategoryResource() // 🛡️ Нельзя удалять чужие/глобальные категории
  @Roles('owner', 'admin') // 🔒 Только admin+ могут удалять
  @ApiOperation({ summary: 'Удалить категорию' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.categoriesService.remove(id);
    return { message: 'Категория успешно удалена' };
  }
}
