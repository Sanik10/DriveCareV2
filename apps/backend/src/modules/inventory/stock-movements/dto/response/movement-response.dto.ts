// src/modules/inventory/stock-movements/dto/response/movement-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType, StockMovementReason } from '../../../constants/inventory.constants';

class MovementPartInfo {
  @ApiProperty({ description: 'ID запчасти' })
  id: string;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Категория' })
  category?: {
    id: string;
    name: string;
  };
}

class MovementUserInfo {
  @ApiProperty({ description: 'ID пользователя' })
  id: string;

  @ApiProperty({ description: 'Имя пользователя' })
  firstName: string;

  @ApiProperty({ description: 'Фамилия пользователя' })
  lastName: string;

  @ApiProperty({ description: 'Email пользователя' })
  email: string;
}

class MovementSupplierInfo {
  @ApiProperty({ description: 'ID поставщика' })
  id: string;

  @ApiProperty({ description: 'Название поставщика' })
  name: string;

  @ApiPropertyOptional({ description: 'Контактное лицо' })
  contactName?: string;
}

export class StockMovementResponseDto {
  @ApiProperty({ description: 'ID движения' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ 
    description: 'Тип движения',
    enum: ['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release']
  })
  type: StockMovementType;

  @ApiProperty({ description: 'Отображаемое название типа' })
  typeDisplay: string;

  @ApiProperty({ 
    description: 'Причина движения',
    enum: ['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction']
  })
  reason: StockMovementReason;

  @ApiProperty({ description: 'Отображаемая причина' })
  reasonDisplay: string;

  @ApiProperty({ description: 'Количество (с учетом знака)', example: 10 })
  quantity: number;

  @ApiProperty({ description: 'Форматированное количество', example: '+10' })
  quantityDisplay: string;

  @ApiPropertyOptional({ description: 'Цена за единицу', example: 1500.00 })
  price?: number;

  @ApiPropertyOptional({ description: 'Общая сумма', example: 15000.00 })
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'ID связанного заказа' })
  orderId?: string;

  @ApiPropertyOptional({ description: 'ID поставщика' })
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Номер документа' })
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Заметки' })
  notes?: string;

  @ApiProperty({ description: 'ID создателя движения' })
  createdBy: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о запчасти' })
  part?: MovementPartInfo;

  @ApiPropertyOptional({ description: 'Информация о создателе' })
  creator?: MovementUserInfo;

  @ApiPropertyOptional({ description: 'Информация о поставщике' })
  supplier?: MovementSupplierInfo;

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Влияние на остаток', enum: ['positive', 'negative', 'neutral'] })
  impactType: 'positive' | 'negative' | 'neutral';

  @ApiPropertyOptional({ description: 'Остаток после операции' })
  runningBalance?: number;

  @ApiProperty({ description: 'Можно ли отменить операцию' })
  canReverse: boolean;

  @ApiPropertyOptional({ description: 'ID обратного движения (если отменено)' })
  reversedByMovementId?: string;

  @ApiPropertyOptional({ description: 'ID исходного движения (для отмены)' })
  reversesMovementId?: string;
}
