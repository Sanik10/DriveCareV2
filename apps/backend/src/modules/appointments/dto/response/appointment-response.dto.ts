// path: apps/backend/src/modules/appointments/dto/response/appointment-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentPriority } from '../../../../database/entities';

export class AppointmentResponseDto {
  @ApiProperty({ 
    description: 'ID записи',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'ID компании',
    example: '456e7890-e89b-12d3-a456-426614174001'
  })
  companyId: string;

  @ApiProperty({ 
    description: 'ID клиента',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  customerId: string;

  @ApiProperty({ 
    description: 'Имя клиента',
    example: 'Иван Петров'
  })
  customerName: string;

  @ApiProperty({ 
    description: 'ID автомобиля',
    example: '012e3456-e89b-12d3-a456-426614174003'
  })
  vehicleId: string;

  @ApiProperty({ 
    description: 'Информация об автомобиле',
    example: 'Toyota Camry 2020, А123БВ199'
  })
  vehicleInfo: string;

  @ApiProperty({ 
    description: 'ID мастера',
    example: '345e6789-e89b-12d3-a456-426614174004'
  })
  mechanicId: string;

  @ApiProperty({ 
    description: 'Имя мастера',
    example: 'Сергей Иванов'
  })
  mechanicName: string;

  @ApiProperty({ 
    description: 'Время начала',
    example: '2025-01-15T10:00:00.000Z'
  })
  startTime: Date;

  @ApiProperty({ 
    description: 'Время окончания',
    example: '2025-01-15T12:00:00.000Z'
  })
  endTime: Date;

  @ApiProperty({ 
    description: 'Ориентировочная продолжительность в минутах',
    example: 120
  })
  estimatedDuration: number;

  @ApiPropertyOptional({ 
    description: 'Фактическая продолжительность в минутах',
    example: 135
  })
  actualDuration?: number;

  @ApiProperty({ 
    description: 'Статус записи',
    enum: AppointmentStatus,
    example: AppointmentStatus.SCHEDULED
  })
  status: AppointmentStatus;

  @ApiProperty({ 
    description: 'Приоритет записи',
    enum: AppointmentPriority,
    example: AppointmentPriority.NORMAL
  })
  priority: AppointmentPriority;

  @ApiProperty({ 
    description: 'Список услуг',
    example: [
      { id: 'service-1', name: 'Замена масла', price: 2000 },
      { id: 'service-2', name: 'Диагностика', price: 1500 }
    ]
  })
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;

  @ApiPropertyOptional({ 
    description: 'Описание работ',
    example: 'Замена масла и фильтров, диагностика подвески'
  })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Заметки клиента',
    example: 'Прошу уделить особое внимание стуку в подвеске'
  })
  customerNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Заметки мастера',
    example: 'Обнаружен износ тормозных колодок'
  })
  mechanicNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Контактный телефон',
    example: '+7 (495) 123-45-67'
  })
  contactPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Контактный email',
    example: 'customer@example.com'
  })
  contactEmail?: string;

  @ApiProperty({ 
    description: 'Отправлено ли напоминание',
    example: true
  })
  reminderSent: boolean;

  @ApiProperty({ 
    description: 'Отправлено ли подтверждение',
    example: true
  })
  confirmationSent: boolean;

  @ApiPropertyOptional({ 
    description: 'Оценка клиента (1-5)',
    example: 5
  })
  rating?: number;

  @ApiPropertyOptional({ 
    description: 'Отзыв клиента',
    example: 'Отличное обслуживание, быстро и качественно!'
  })
  feedback?: string;

  @ApiPropertyOptional({ 
    description: 'Ориентировочная стоимость',
    example: 5000.00
  })
  estimatedCost?: number;

  @ApiPropertyOptional({ 
    description: 'Итоговая стоимость',
    example: 5500.00
  })
  finalCost?: number;

  @ApiProperty({ 
    description: 'Дата создания',
    example: '2025-01-10T10:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Дата обновления',
    example: '2025-01-10T12:00:00.000Z'
  })
  updatedAt: Date;

  // 🔥 Computed fields
  @ApiProperty({ 
    description: 'Можно ли отменить запись',
    example: true
  })
  canCancel: boolean;

  @ApiProperty({ 
    description: 'Можно ли перенести запись',
    example: true
  })
  canReschedule: boolean;

  @ApiProperty({ 
    description: 'Статус прогресса (0-100%)',
    example: 75
  })
  progressPercentage: number;

  @ApiPropertyOptional({ 
    description: 'Время до начала записи (в минутах)',
    example: 120
  })
  timeUntilStart?: number;
}
