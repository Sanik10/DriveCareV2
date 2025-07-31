import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentPriority } from '../../../../database/entities';

export class AvailableSlotDto {
  @ApiProperty({ 
    description: 'ID мастера',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  mechanicId: string;

  @ApiProperty({ 
    description: 'Имя мастера',
    example: 'Сергей Иванов'
  })
  mechanicName: string;

  @ApiProperty({ 
    description: 'Время начала слота',
    example: '2025-01-15T10:00:00.000Z'
  })
  startTime: Date;

  @ApiProperty({ 
    description: 'Время окончания слота',
    example: '2025-01-15T12:00:00.000Z'
  })
  endTime: Date;

  @ApiProperty({ 
    description: 'Уверенность в рекомендации (0-1)',
    example: 0.85
  })
  confidence: number;

  @ApiProperty({ 
    description: 'Общая стоимость',
    example: 5000.00
  })
  totalCost: number;

  @ApiProperty({ 
    description: 'Ориентировочная продолжительность в минутах',
    example: 120
  })
  estimatedDuration: number;

  @ApiProperty({ 
    description: 'Потенциальные конфликты',
    example: []
  })
  conflicts: ConflictInfoDto[];

  @ApiPropertyOptional({ 
    description: 'Причина рекомендации',
    example: 'Предпочитаемый мастер доступен'
  })
  recommendationReason?: string;
}

export class ConflictInfoDto {
  @ApiProperty({ 
    description: 'Тип конфликта',
    enum: ['schedule', 'appointment', 'break', 'holiday'],
    example: 'appointment'
  })
  type: 'schedule' | 'appointment' | 'break' | 'holiday';

  @ApiProperty({ 
    description: 'Описание конфликта',
    example: 'Перекрытие с существующей записью'
  })
  description: string;

  @ApiProperty({ 
    description: 'Время конфликта',
    example: '2025-01-15T11:30:00.000Z'
  })
  conflictTime: Date;

  @ApiProperty({ 
    description: 'Серьезность конфликта',
    enum: ['low', 'medium', 'high'],
    example: 'medium'
  })
  severity: 'low' | 'medium' | 'high';
}

export class SmartScheduleResponseDto {
  @ApiProperty({ 
    description: 'Рекомендуемые слоты',
    type: [AvailableSlotDto]
  })
  recommendedSlots: AvailableSlotDto[];

  @ApiProperty({ 
    description: 'Альтернативные слоты',
    type: [AvailableSlotDto]
  })
  alternatives: AvailableSlotDto[];

  @ApiProperty({ 
    description: 'Следующая доступная дата',
    example: '2025-01-16T00:00:00.000Z'
  })
  nextAvailableDate: Date;

  @ApiProperty({ 
    description: 'Ориентировочное время ожидания в днях',
    example: 2
  })
  estimatedWaitTime: number;

  @ApiPropertyOptional({ 
    description: 'Общие рекомендации',
    example: 'Рекомендуем выбрать утренние часы для лучшего обслуживания'
  })
  generalRecommendation?: string;
}

export class AppointmentTrackingDto {
  @ApiProperty({ 
    description: 'ID записи',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  appointmentId: string;

  @ApiProperty({ 
    description: 'Текущий статус',
    example: 'in_progress'
  })
  status: string;

  @ApiProperty({ 
    description: 'Текущий этап работ',
    example: 'Диагностика двигателя'
  })
  currentStep: string;

  @ApiProperty({ 
    description: 'Прогресс выполнения (0-100%)',
    example: 65
  })
  progress: number;

  @ApiProperty({ 
    description: 'Ориентировочное время завершения',
    example: '2025-01-15T14:30:00.000Z'
  })
  estimatedCompletion: Date;

  @ApiPropertyOptional({ 
    description: 'Фактическая продолжительность (если завершено)',
    example: 145
  })
  actualDuration?: number;

  @ApiPropertyOptional({ 
    description: 'Причина задержки',
    example: 'Обнаружена дополнительная неисправность'
  })
  delayReason?: string;

  @ApiProperty({ 
    description: 'Следующие действия',
    example: ['Замена тормозных колодок', 'Балансировка колес']
  })
  nextActions: string[];

  @ApiProperty({ 
    description: 'Время последнего обновления',
    example: '2025-01-15T12:15:00.000Z'
  })
  lastUpdated: Date;
}

export class BulkOperationResultDto {
  @ApiProperty({ 
    description: 'Количество успешных операций',
    example: 8
  })
  successful: number;

  @ApiProperty({ 
    description: 'Количество неудачных операций',
    example: 2
  })
  failed: number;

  @ApiProperty({ 
    description: 'Детали ошибок',
    example: [
      { appointmentId: 'uuid-1', error: 'Запись уже отменена' },
      { appointmentId: 'uuid-2', error: 'Недостаточно прав доступа' }
    ]
  })
  errors: Array<{
    appointmentId: string;
    error: string;
  }>;

  @ApiProperty({ 
    description: 'Общее сообщение',
    example: 'Операция выполнена: 8 успешно, 2 с ошибками'
  })
  message: string;
}
