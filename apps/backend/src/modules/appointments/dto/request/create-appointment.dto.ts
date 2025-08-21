// path: apps/backend/src/modules/appointments/dto/request/create-appointment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  IsPhoneNumber,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { AppointmentPriority } from '../../../../database/entities';
import { APPOINTMENTS_CONSTANTS } from '../../constants/appointments.constants';

const sanitize = (v: any) => sanitizeHtml(String(v ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

export class CreateAppointmentDto {
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
    description: 'ID мастера',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  @IsNotEmpty({ message: 'ID мастера обязателен' })
  @IsUUID('4', { message: 'ID мастера должен быть валидным UUID' })
  mechanicId: string;

  @ApiProperty({
    description: 'Время начала записи',
    example: '2025-01-15T10:00:00.000Z',
  })
  @IsNotEmpty({ message: 'Время начала обязательно' })
  @IsDateString({}, { message: 'Некорректный формат даты начала' })
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({
    description: 'Время окончания записи',
    example: '2025-01-15T12:00:00.000Z',
  })
  @IsNotEmpty({ message: 'Время окончания обязательно' })
  @IsDateString({}, { message: 'Некорректный формат даты окончания' })
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({
    description: 'Ориентировочная продолжительность в минутах',
    example: 120,
    minimum: APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION,
    maximum: APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION,
  })
  @IsNotEmpty({ message: 'Продолжительность обязательна' })
  @IsNumber({}, { message: 'Продолжительность должна быть числом' })
  @Min(APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION, {
    message: `Минимальная продолжительность ${APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION} минут`,
  })
  @Max(APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION, {
    message: `Максимальная продолжительность ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION} минут`,
  })
  estimatedDuration: number;

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

  @ApiPropertyOptional({
    description: 'Приоритет записи',
    enum: AppointmentPriority,
    default: AppointmentPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(AppointmentPriority, { message: 'Некорректный приоритет записи' })
  priority?: AppointmentPriority;

  @ApiPropertyOptional({
    description: 'Описание работ',
    example: 'Замена масла и фильтров, диагностика подвески',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH, {
    message: `Описание не может превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Заметки клиента',
    example: 'Прошу уделить особое внимание стуку в подвеске',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Заметки должны быть строкой' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH, {
    message: `Заметки не могут превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) => sanitize(value))
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'Контактный телефон (РФ)',
    example: '+7 (495) 123-45-67',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsPhoneNumber('RU', { message: 'Телефон должен быть валидным номером РФ' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH, {
    message: `Телефон не может превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH} символов`,
  })
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Контактный email',
    example: 'customer@example.com',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'Некорректный формат email' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH, {
    message: `Email не может превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH} символов`,
  })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Ориентировочная стоимость',
    example: 5000.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Стоимость должна быть числом с максимум 2 знаками после запятой' })
  @Min(0, { message: 'Стоимость не может быть отрицательной' })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : parseFloat(value)))
  estimatedCost?: number;
}
