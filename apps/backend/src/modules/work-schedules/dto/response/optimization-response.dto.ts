// src/modules/work-schedules/dto/response/optimization-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleRecommendationDto {
  @ApiProperty({ description: 'Тип рекомендации' })
  type: string;

  @ApiPropertyOptional({ description: 'ID пользователя' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Имя пользователя' })
  userName?: string;

  @ApiProperty({ description: 'Описание рекомендации' })
  description: string;

  @ApiProperty({ description: 'Воздействие на систему' })
  impact: {
    utilizationChange: number;
    workloadChange: number;
    customerSatisfactionChange: number;
  };

  @ApiProperty({ description: 'Приоритет', enum: ['high', 'medium', 'low'] })
  priority: string;

  @ApiProperty({ description: 'Сложность реализации', enum: ['easy', 'moderate', 'complex'] })
  effort: string;
}

export class ScheduleConflictDto {
  @ApiProperty({ description: 'Тип конфликта' })
  type: string;

  @ApiPropertyOptional({ description: 'ID пользователя' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Имя пользователя' })
  userName?: string;

  @ApiProperty({ description: 'Дата конфликта' })
  date: Date;

  @ApiPropertyOptional({ description: 'Временной диапазон' })
  timeRange?: { start: string; end: string };

  @ApiProperty({ description: 'Описание конфликта' })
  description: string;

  @ApiProperty({ description: 'Серьезность', enum: ['critical', 'high', 'medium', 'low'] })
  severity: string;

  @ApiProperty({ description: 'Предлагаемые решения' })
  suggestedResolution: string[];
}

export class OptimizationResponseDto {
  @ApiProperty({ description: 'Успешность оптимизации' })
  success: boolean;

  @ApiProperty({ description: 'Улучшения' })
  improvements: {
    utilizationIncrease: number;
    overtimeReduction: number;
    workloadBalance: number;
  };

  @ApiProperty({ description: 'Рекомендации', type: [ScheduleRecommendationDto] })
  recommendations: ScheduleRecommendationDto[];

  @ApiProperty({ description: 'Конфликты', type: [ScheduleConflictDto] })
  conflicts: ScheduleConflictDto[];

  @ApiProperty({ description: 'Время выполнения (мс)' })
  executionTime: number;

  @ApiPropertyOptional({ description: 'Дополнительная информация' })
  metadata?: {
    totalSchedulesAnalyzed: number;
    optimizationIterations: number;
    algorithmVersion: string;
  };
}
