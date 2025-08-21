// path: apps/backend/src/modules/appointments/dto/request/smart-schedule.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentPriority } from '../../../../database/entities';
import { APPOINTMENTS_CONSTANTS } from '../../constants/appointments.constants';

export class SmartScheduleDto {
  @ApiProperty({
    description: 'ID клиента',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID клиента обязателен' })
  @IsUUID('4', { message: 'ID клиента должен быть валидным UUID' })
  customerId: string;

  @ApiProperty({
    description: 'ID автомобиля',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'ID автомобиля обязателен' })
  @IsUUID('4', { message: 'ID автомобиля должен быть валидным UUID' })
  vehicleId: string;

  @ApiProperty({
    description: 'Массив ID услуг',
    example: ['service-1-uuid', 'service-2-uuid'],
    type: [String],
  })
  @IsNotEmpty({ message: 'Необходимо выбрать хотя бы одну услугу' })
  @IsArray({ message: 'Услуги должны быть массивом' })
  @ArrayMinSize(1, { message: 'Необходимо выбрать хотя бы одну услугу' })
  @ArrayMaxSize(APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT, {
    message: `Максимум ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT} услуг на запись`,
  })
  @IsUUID('4', { each: true, message: 'Каждый ID услуги должен быть валидным UUID' })
  serviceIds: string[];

  @ApiProperty({
    description: 'Приоритет записи',
    enum: AppointmentPriority,
    default: AppointmentPriority.NORMAL,
  })
  @IsNotEmpty({ message: 'Приоритет обязателен' })
  @IsEnum(AppointmentPriority, { message: 'Некорректный приоритет записи' })
  priority: AppointmentPriority;

  @ApiPropertyOptional({
    description: 'Предпочитаемая дата',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Некорректный формат предпочитаемой даты' })
  @Type(() => Date)
  preferredDate?: Date;

  @ApiPropertyOptional({
    description: 'Начало временного окна (формат HH:mm)',
    example: '09:00',
  })
  @IsOptional()
  @IsString({ message: 'Время должно быть строкой' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время должно быть в формате HH:mm' })
  preferredTimeStart?: string;

  @ApiPropertyOptional({
    description: 'Конец временного окна (формат HH:mm)',
    example: '17:00',
  })
  @IsOptional()
  @IsString({ message: 'Время должно быть строкой' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время должно быть в формате HH:mm' })
  preferredTimeEnd?: string;

  @ApiPropertyOptional({
    description: 'Предпочитаемый мастер',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID мастера должен быть валидным UUID' })
  preferredMechanicId?: string;

  @ApiPropertyOptional({
    description: 'Максимальное время ожидания в днях',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Время ожидания должно быть числом' })
  @Min(1, { message: 'Минимальное время ожидания 1 день' })
  @Max(APPOINTMENTS_CONSTANTS.DEFAULTS.BOOKING_ADVANCE_DAYS, {
    message: `Максимальное время ожидания ${APPOINTMENTS_CONSTANTS.DEFAULTS.BOOKING_ADVANCE_DAYS} дней`,
  })
  maxWaitingDays?: number;

  @ApiPropertyOptional({
    description: 'Разрешить запись на выходные',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Параметр выходных должен быть булевым' })
  allowWeekends?: boolean;
}

export class TimeRangeDto {
  @ApiProperty({ description: 'Начало диапазона (HH:mm)', example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время должно быть в формате HH:mm' })
  start: string;

  @ApiProperty({ description: 'Конец диапазона (HH:mm)', example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Время должно быть в формате HH:mm' })
  end: string;
}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Массив ID услуг',
    type: [String],
  })
  @IsNotEmpty({ message: 'Необходимо выбрать хотя бы одну услугу' })
  @IsArray({ message: 'Услуги должны быть массивом' })
  @ArrayMinSize(1, { message: 'Необходимо выбрать хотя бы одну услугу' })
  @IsUUID('4', { each: true, message: 'Каждый ID услуги должен быть валидным UUID' })
  serviceIds: string[];

  @ApiProperty({
    description: 'Дата для проверки',
    example: '2025-01-15',
  })
  @IsNotEmpty({ message: 'Дата обязательна' })
  @IsDateString({}, { message: 'Некорректный формат даты' })
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({
    description: 'Временной диапазон',
    example: { start: '09:00', end: '17:00' },
    type: TimeRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange?: TimeRangeDto;
}
