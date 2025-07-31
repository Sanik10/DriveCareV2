// src/modules/work-schedules/dto/response/capacity-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CapacityTimeSlotDto {
  @ApiProperty({ description: 'Время начала слота' })
  startTime: string;

  @ApiProperty({ description: 'Время окончания слота' })
  endTime: string;

  @ApiProperty({ description: 'Требуемое количество сотрудников' })
  requiredStaff: number;

  @ApiProperty({ description: 'Доступное количество сотрудников' })
  availableStaff: number;

  @ApiProperty({ description: 'Коэффициент использования (0-1)' })
  utilizationRate: number;

  @ApiProperty({ description: 'Уровень риска', enum: ['low', 'medium', 'high', 'critical'] })
  riskLevel: string;

  @ApiPropertyOptional({ description: 'Требуемые навыки' })
  skillsRequired?: string[];

  @ApiPropertyOptional({ description: 'Доступные навыки' })
  skillsAvailable?: string[];
}

export class MechanicCapacityDto {
  @ApiProperty({ description: 'ID мастера' })
  userId: string;

  @ApiProperty({ description: 'Имя мастера' })
  userName: string;

  @ApiProperty({ description: 'Специализация' })
  specialization: string;

  @ApiProperty({ description: 'Дата' })
  date: Date;

  @ApiProperty({ description: 'Рабочие часы' })
  workingHours: {
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    totalHours: number;
    effectiveHours: number;
  };

  @ApiProperty({ description: 'Навыки мастера' })
  skillMatrix: string[];

  @ApiProperty({ description: 'Коэффициент эффективности' })
  efficiency: number;

  @ApiProperty({ description: 'Текущая загрузка' })
  currentLoad: {
    scheduledAppointments: number;
    estimatedWorkload: number;
    availableHours: number;
    utilizationRate: number;
  };

  @ApiProperty({ description: 'Предпочтения' })
  preferences: {
    shiftType: string;
    maxConsecutiveDays: number;
    preferredDaysOff: number[];
  };
}

export class CapacityResponseDto {
  @ApiProperty({ description: 'Дата анализа' })
  date: Date;

  @ApiProperty({ description: 'Общая загрузка' })
  overallUtilization: number;

  @ApiProperty({ description: 'Временные слоты', type: [CapacityTimeSlotDto] })
  timeSlots: CapacityTimeSlotDto[];

  @ApiProperty({ description: 'Загрузка мастеров', type: [MechanicCapacityDto] })
  mechanics: MechanicCapacityDto[];

  @ApiPropertyOptional({ description: 'Рекомендации' })
  recommendations?: string[];

  @ApiPropertyOptional({ description: 'Предупреждения' })
  warnings?: string[];
}
