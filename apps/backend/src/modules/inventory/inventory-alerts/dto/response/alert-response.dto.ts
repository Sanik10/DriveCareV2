// src/modules/inventory/inventory-alerts/dto/response/alert-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertPriority } from '../../../constants/inventory.constants';

class AlertPartInfo {
  @ApiProperty({ description: 'ID запчасти' })
  id: string;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд' })
  brand?: string;

  @ApiProperty({ description: 'Категория' })
  category: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Текущий остаток' })
  currentStock: number;

  @ApiProperty({ description: 'Минимальный остаток' })
  minStock: number;
}

class AlertMetadataInfo {
  @ApiPropertyOptional({ description: 'Нехватка количества' })
  shortage?: number;

  @ApiPropertyOptional({ description: 'Прогноз исчерпания (дни)' })
  estimatedRunOutDays?: number;

  @ApiPropertyOptional({ description: 'Избыток количества' })
  excessQuantity?: number;

  @ApiPropertyOptional({ description: 'Дата последнего движения' })
  lastMovementDate?: Date;

  @ApiPropertyOptional({ description: 'Автоматически создан' })
  automaticallyCreated?: boolean;

  @ApiPropertyOptional({ description: 'ID связанного движения' })
  relatedMovementId?: string;
}

export class AlertResponseDto {
  @ApiProperty({ description: 'ID уведомления' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ 
    description: 'Тип уведомления',
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'] 
  })
  type: AlertType;

  @ApiProperty({ description: 'Отображаемое название типа' })
  typeDisplay: string;

  @ApiProperty({ 
    description: 'Приоритет',
    enum: ['low', 'medium', 'high', 'critical'] 
  })
  priority: AlertPriority;

  @ApiProperty({ description: 'Отображаемый приоритет' })
  priorityDisplay: string;

  @ApiProperty({ description: 'Заголовок уведомления' })
  title: string;

  @ApiProperty({ description: 'Текст уведомления' })
  message: string;

  @ApiProperty({ description: 'Активно ли уведомление' })
  isActive: boolean;

  @ApiProperty({ description: 'Отклонено ли уведомление' })
  isDismissed: boolean;

  @ApiPropertyOptional({ description: 'Кем отклонено' })
  dismissedBy?: string;

  @ApiPropertyOptional({ description: 'Когда отклонено' })
  dismissedAt?: Date;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiProperty({ description: 'Информация о запчасти' })
  part: AlertPartInfo;

  @ApiPropertyOptional({ description: 'Метаданные уведомления' })
  metadata?: AlertMetadataInfo;

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Уровень срочности' })
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Можно ли отклонить' })
  canDismiss: boolean;

  @ApiProperty({ description: 'Возраст уведомления (часы)' })
  ageInHours: number;

  @ApiPropertyOptional({ description: 'Время до автоотклонения (часы)' })
  autoExpiresInHours?: number;

  @ApiPropertyOptional({ description: 'Предполагаемая стоимость нехватки' })
  estimatedShortageValue?: number;

  @ApiPropertyOptional({ description: 'Рекомендуемые действия' })
  recommendedActions?: string[];
}
