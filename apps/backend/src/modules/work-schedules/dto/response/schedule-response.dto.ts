// src/modules/work-schedules/dto/response/schedule-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleResponseDto {
  @ApiProperty({ description: 'ID расписания' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID пользователя' })
  userId: string;

  @ApiPropertyOptional({ description: 'Информация о пользователе' })
  user?: {
    firstName: string;
    lastName: string;
    specialization?: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'День недели (0-6)' })
  dayOfWeek: number;

  @ApiProperty({ description: 'Название дня недели' })
  dayName: string;

  @ApiProperty({ description: 'Время начала работы' })
  startTime: string;

  @ApiProperty({ description: 'Время окончания работы' })
  endTime: string;

  @ApiProperty({ description: 'Является ли выходным днем' })
  isDayOff: boolean;

  @ApiPropertyOptional({ description: 'Время начала обеда' })
  breakStartTime?: string;

  @ApiPropertyOptional({ description: 'Время окончания обеда' })
  breakEndTime?: string;

  @ApiProperty({ description: 'Коэффициент эффективности' })
  efficiency: number;

  @ApiPropertyOptional({ description: 'Навыки мастера' })
  skillMatrix?: string[];

  @ApiPropertyOptional({ description: 'Названия услуг' })
  skillNames?: string[];

  @ApiProperty({ description: 'Тип смены' })
  shiftType: string;

  @ApiProperty({ description: 'Максимальное количество дней подряд' })
  maxConsecutiveDays: number;

  @ApiPropertyOptional({ description: 'Предпочитаемые дни отдыха' })
  preferredDaysOff?: number[];

  @ApiProperty({ description: 'Активен ли график' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Статистика рабочего времени' })
  workingHours?: {
    totalHours: number;
    effectiveHours: number;
    breakHours: number;
  };

  @ApiPropertyOptional({ description: 'Текущая загрузка' })
  currentLoad?: {
    scheduledAppointments: number;
    estimatedWorkload: number;
    availableHours: number;
    utilizationRate: number;
  };

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;
}
