// src/modules/work-schedules/dto/request/optimize-request.dto.ts
import { IsBoolean, IsNumber, IsOptional, IsArray, IsUUID, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizationObjectivesDto {
  @ApiPropertyOptional({ description: 'Максимизировать использование рабочего времени', default: true })
  @IsOptional()
  @IsBoolean()
  maximizeUtilization?: boolean;

  @ApiPropertyOptional({ description: 'Минимизировать сверхурочное время', default: true })
  @IsOptional()
  @IsBoolean()
  minimizeOvertime?: boolean;

  @ApiPropertyOptional({ description: 'Сбалансировать рабочую нагрузку', default: true })
  @IsOptional()
  @IsBoolean()
  balanceWorkload?: boolean;

  @ApiPropertyOptional({ description: 'Учитывать предпочтения сотрудников', default: false })
  @IsOptional()
  @IsBoolean()
  respectPreferences?: boolean;
}

export class OptimizationConstraintsDto {
  @ApiProperty({ description: 'Минимальное количество сотрудников в час', example: 2 })
  @IsNumber()
  @Min(1)
  minStaffPerHour: number;

  @ApiPropertyOptional({ description: 'Максимальное количество часов подряд', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  maxConsecutiveHours?: number;

  @ApiPropertyOptional({ 
    description: 'Обязательные навыки в смене',
    example: ['brake-repair', 'engine-diagnostics'] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  requiredSkillMatrix?: string[];

  @ApiPropertyOptional({ description: 'Обязательные перерывы', default: true })
  @IsOptional()
  @IsBoolean()
  mandatoryBreaks?: boolean;
}

export class OptimizeRequestDto {
  @ApiProperty({
    description: 'Дата начала периода оптимизации',
    example: '2024-08-01'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Дата окончания периода оптимизации',
    example: '2024-08-31'
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Цели оптимизации',
    type: OptimizationObjectivesDto 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptimizationObjectivesDto)
  objectives?: OptimizationObjectivesDto;

  @ApiProperty({
    description: 'Ограничения оптимизации',
    type: OptimizationConstraintsDto
  })
  @ValidateNested()
  @Type(() => OptimizationConstraintsDto)
  constraints: OptimizationConstraintsDto;

  @ApiPropertyOptional({
    description: 'Конкретные пользователи для оптимизации (если не указано - все)',
    example: ['user-1', 'user-2']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];
}
