// src/modules/inventory/dto/response/inventory-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryStatus } from '../../types/inventory.types';

class PartInfo {
  @ApiProperty({ description: 'ID запчасти' })
  id: string;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд' })
  brand?: string;

  @ApiProperty({ description: 'Себестоимость' })
  costPrice: number;

  @ApiProperty({ description: 'Цена продажи' })
  sellingPrice: number;

  @ApiPropertyOptional({ description: 'Категория запчасти' })
  category?: {
    id: string;
    name: string;
  };
}

export class InventoryResponseDto {
  @ApiProperty({ description: 'ID позиции в инвентаре' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ description: 'Текущее количество на складе', example: 25 })
  quantity: number;

  @ApiProperty({ description: 'Минимальное количество для уведомлений', example: 5 })
  minQuantity: number;

  @ApiPropertyOptional({ description: 'Местоположение на складе', example: 'A1-B2' })
  location?: string;

  @ApiPropertyOptional({ description: 'Дата последнего пополнения' })
  lastRestockDate?: Date;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о запчасти' })
  part?: PartInfo;

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Статус запаса', enum: ['in_stock', 'low_stock', 'out_of_stock', 'overstock'] })
  status: InventoryStatus;

  @ApiProperty({ description: 'Нужно ли пополнение' })
  needsRestock: boolean;

  @ApiProperty({ description: 'Количество до минимума', example: 20 })
  quantityUntilMin: number;

  @ApiProperty({ description: 'Общая стоимость позиции', example: 37500.00 })
  totalValue: number;

  @ApiProperty({ description: 'Процент от минимального остатка', example: 500 })
  minQuantityPercent: number;

  @ApiPropertyOptional({ description: 'Количество в резерве', example: 3 })
  reservedQuantity?: number;

  @ApiProperty({ description: 'Доступно для резервирования', example: 22 })
  availableQuantity: number;

  @ApiPropertyOptional({ description: 'Последнее движение' })
  lastMovement?: {
    date: Date;
    type: string;
    quantity: number;
  };

  @ApiPropertyOptional({ description: 'Дополнительные заметки' })
  notes?: string;
}
