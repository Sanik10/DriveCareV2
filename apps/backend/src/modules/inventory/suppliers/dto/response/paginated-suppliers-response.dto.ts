// src/modules/inventory/suppliers/dto/response/paginated-suppliers-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SupplierResponseDto } from './supplier-response.dto';

export class PaginatedSuppliersResponseDto {
  @ApiProperty({ 
    description: 'Список поставщиков', 
    type: [SupplierResponseDto] 
  })
  items: SupplierResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество поставщиков', 
    example: 245 
  })
  total: number;

  @ApiProperty({ 
    description: 'Номер страницы', 
    example: 1 
  })
  page: number;

  @ApiProperty({ 
    description: 'Размер страницы', 
    example: 25 
  })
  limit: number;

  @ApiProperty({ 
    description: 'Общее количество страниц', 
    example: 10 
  })
  totalPages: number;

  @ApiProperty({ 
    description: 'Сводная информация по текущей странице'
  })
  summary: {
    activeSuppliers: number;
    inactiveSuppliers: number;
    averageRating: number;
    totalValue: number;
    topPerformers: number; // Количество топ-поставщиков на странице
  };

  @ApiProperty({ 
    description: 'Информация о примененных фильтрах'
  })
  filters: {
    search?: string;
    isActive?: boolean;
    hasRecentDeliveries?: boolean;
    minRating?: number;
    city?: string;
    country?: string;
    supplierType?: string;
    hasActiveFilters: boolean;
  };

  @ApiProperty({ 
    description: 'Статистика по типам поставщиков'
  })
  typeBreakdown: {
    manufacturer: number;
    distributor: number;
    wholesaler: number;
    retailer: number;
    service_provider: number;
    other: number;
  };
}
