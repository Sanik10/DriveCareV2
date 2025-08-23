// path: apps/backend/src/modules/services/services/services-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Service } from '../../../database/entities';
import { ServiceResponseDto } from '../dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from '../dto/response/paginated-services-response.dto';
import { ServiceStats, ServiceWithCategory } from '../types/services.types';

@Injectable()
export class ServicesMapperService {
  /**
   * 🔥 Маппинг Service entity -> ServiceResponseDto
   */
  mapToResponseDto(service: Service): ServiceResponseDto {
    return {
      id: service.id,
      companyId: service.companyId, // 🔒 Всегда включаем для audit
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      price: Number(service.price), // Decimal -> number для JSON
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * 🔥 Маппинг массива services -> array DTO
   */
  mapArrayToResponseDto(services: Service[]): ServiceResponseDto[] {
    return services.map(service => this.mapToResponseDto(service));
  }

  /**
   * 🔥 Маппинг для пагинированного ответа
   */
  mapToPaginatedResponse(
    services: Service[],
    total: number,
    page: number,
    limit: number
  ): PaginatedServicesResponseDto {
    return {
      data: this.mapArrayToResponseDto(services),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * 🔥 Маппинг service с дополнительными данными категории
   */
  mapToDetailedResponseDto(service: ServiceWithCategory): ServiceResponseDto & { categoryName: string } {
    const baseDto = this.mapToResponseDto(service as Service);
    
    return {
      ...baseDto,
      categoryName: service.categoryName,
    };
  }

  /**
   * 📊 Маппинг статистики услуг
   */
  mapStatsToResponse(stats: ServiceStats): any {
    return {
      summary: {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        activationRate: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
      },
      averages: {
        price: Math.round(stats.avgPrice * 100) / 100, // 2 decimal places
        duration: Math.round(stats.avgDuration),
        pricePerHour: stats.avgDuration > 0 ? Math.round((stats.avgPrice / (stats.avgDuration / 60)) * 100) / 100 : 0,
      },
      categories: stats.byCategory.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        count: cat.count,
        percentage: stats.total > 0 ? Math.round((cat.count / stats.total) * 100) : 0,
      })),
    };
  }

  /**
   * 🔥 Маппинг для быстрого списка (без лишних полей)
   */
  mapToQuickListDto(services: Service[]): Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    isActive: boolean;
  }> {
    return services.map(service => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
      duration: service.durationMinutes,
      isActive: service.isActive,
    }));
  }

  /**
   * 🔥 Маппинг для dropdown/select компонентов
   */
  mapToSelectOptions(services: Service[]): Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }> {
    return services.map(service => ({
      value: service.id,
      label: `${service.name} (${service.price}₽, ${service.durationMinutes}мин)`,
      disabled: !service.isActive,
      meta: {
        price: Number(service.price),
        duration: service.durationMinutes,
        categoryId: service.categoryId,
      },
    }));
  }

  /**
   * 🔥 Маппинг результата bulk операций
   */
  mapBulkOperationResult(
    updated: number,
    total: number,
    errors: string[] = []
  ): {
    updated: number;
    failed: number;
    total: number;
    successRate: number;
    errors: string[];
    message: string;
  } {
    const failed = total - updated;
    const successRate = total > 0 ? Math.round((updated / total) * 100) : 0;

    return {
      updated,
      failed,
      total,
      successRate,
      errors,
      message: errors.length > 0 
        ? `Обновлено ${updated} из ${total} услуг. Есть ошибки.`
        : `Успешно обновлено ${updated} из ${total} услуг.`,
    };
  }

  /**
   * 🔥 Маппинг для экспорта данных
   */
  mapForExport(services: Service[]): Array<{
    name: string;
    category: string;
    price: string;
    duration: string;
    status: string;
    created: string;
  }> {
    return services.map(service => ({
      name: service.name,
      category: service.categoryId, // TODO: Replace with actual category name
      price: `${service.price}₽`,
      duration: `${service.durationMinutes} мин`,
      status: service.isActive ? 'Активна' : 'Неактивна',
      created: service.createdAt.toLocaleDateString('ru-RU'),
    }));
  }

  /**
   * 📱 Маппинг для мобильного API (упрощенный)
   */
  mapToMobileDto(services: Service[]): Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }> {
    return services
      .filter(service => service.isActive)
      .map(service => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.durationMinutes,
      }));
  }
}
