// path: apps/backend/src/modules/work-schedules/dto/request/create-schedule.dto.ts
import { IsString, IsUUID, IsNumber, IsOptional, IsBoolean, IsArray, Min, Max, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WORK_SCHEDULES_CONSTANTS, WORK_SCHEDULES_VALIDATION_MESSAGES, SHIFT_TYPES } from '../../constants/work-schedules.constants';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'ID пользователя (мастера)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Некорректный ID пользователя' })
  userId: string;

  @ApiProperty({
    description: 'День недели (0-6, где 0 = воскресенье)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNumber({}, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_DAY_OF_WEEK })
  @Min(0, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_DAY_OF_WEEK })
  @Max(6, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_DAY_OF_WEEK })
  dayOfWeek: number;

  @ApiPropertyOptional({
    description: 'Время начала работы (HH:MM) — требуется, если не выходной',
    example: '09:00',
  })
  @IsOptional()
  @IsString({ message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Время окончания работы (HH:MM) — требуется, если не выходной',
    example: '18:00',
  })
  @IsOptional()
  @IsString({ message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Является ли день выходным',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDayOff?: boolean;

  @ApiPropertyOptional({
    description: 'Время начала обеденного перерыва (HH:MM)',
    example: '13:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  breakStartTime?: string;

  @ApiPropertyOptional({
    description: 'Время окончания обеденного перерыва (HH:MM)',
    example: '14:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT })
  breakEndTime?: string;

  @ApiPropertyOptional({
    description: 'Коэффициент эффективности мастера',
    example: 1.2,
    minimum: WORK_SCHEDULES_CONSTANTS.MIN_EFFICIENCY,
    maximum: WORK_SCHEDULES_CONSTANTS.MAX_EFFICIENCY,
  })
  @IsOptional()
  @IsNumber({}, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EFFICIENCY })
  @Min(WORK_SCHEDULES_CONSTANTS.MIN_EFFICIENCY, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EFFICIENCY })
  @Max(WORK_SCHEDULES_CONSTANTS.MAX_EFFICIENCY, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EFFICIENCY })
  efficiency?: number;

  @ApiPropertyOptional({
    description: 'Массив ID услуг, которые может выполнять мастер (UUIDv4)',
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Некорректный ID услуги в skillMatrix' })
  skillMatrix?: string[];

  @ApiPropertyOptional({
    description: 'Тип смены',
    example: 'morning',
    enum: Object.values(SHIFT_TYPES),
  })
  @IsOptional()
  @IsEnum(SHIFT_TYPES, { message: 'Некорректный тип смены' })
  shiftType?: string;

  @ApiPropertyOptional({
    description: 'Максимальное количество рабочих дней подряд',
    example: 5,
    minimum: 1,
    maximum: WORK_SCHEDULES_CONSTANTS.MAX_CONSECUTIVE_DAYS,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(WORK_SCHEDULES_CONSTANTS.MAX_CONSECUTIVE_DAYS, { message: WORK_SCHEDULES_VALIDATION_MESSAGES.TOO_MANY_CONSECUTIVE_DAYS })
  maxConsecutiveDays?: number;

  @ApiPropertyOptional({
    description: 'Предпочитаемые дни отдыха (0-6)',
    example: [0, 6],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  preferredDaysOff?: number[];
}
