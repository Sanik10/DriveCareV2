// src/modules/inventory/parts/dto/response/part-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartCategoryDto {
  @ApiProperty({ description: 'ID категории' })
  id: string;

  @ApiProperty({ description: 'Название категории' })
  name: string;

  @ApiPropertyOptional({ description: 'Код категории' })
  code?: string;
}

export class PartResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор запчасти' })
  id: string;

  @ApiProperty({ description: 'ID компании-владельца' })
  companyId: string;

  @ApiProperty({ description: 'ID категории' })
  categoryId: string;

  @ApiProperty({ description: 'Информация о категории', type: PartCategoryDto })
  category: PartCategoryDto;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер/артикул запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд/производитель' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Описание запчасти' })
  description?: string;

  @ApiProperty({ description: 'Себестоимость (цена закупки)' })
  costPrice: number;

  @ApiProperty({ description: 'Цена продажи' })
  sellingPrice: number;

  @ApiProperty({ description: 'Наценка в процентах' })
  marginPercent: number;

  @ApiProperty({ description: 'Прибыль с единицы' })
  profitPerUnit: number;

  @ApiPropertyOptional({ description: 'URL изображения' })
  imageUrl?: string;

  @ApiProperty({ description: 'Активна ли запчасть' })
  isActive: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата последнего обновления' })
  updatedAt: Date;

  // Дополнительные вычисляемые поля
  @ApiPropertyOptional({ description: 'Текущий остаток на складе' })
  currentStock?: number;

  @ApiPropertyOptional({ description: 'Минимальный остаток' })
  minStock?: number;

  @ApiPropertyOptional({ description: 'Нужно ли пополнение' })
  needsRestock?: boolean;

  @ApiPropertyOptional({ description: 'Статус наличия' })
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';

  @ApiPropertyOptional({ description: 'Дата последнего движения' })
  lastMovementDate?: Date;

  @ApiPropertyOptional({ description: 'Общее количество заказов с этой запчастью' })
  totalOrders?: number;

  @ApiPropertyOptional({ description: 'Популярность (0-100)' })
  popularityScore?: number;
}
