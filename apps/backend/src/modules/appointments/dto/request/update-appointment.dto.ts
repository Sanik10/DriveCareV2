// path: apps/backend/src/modules/appointments/dto/request/update-appointment.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { AppointmentPriority } from '../../../../database/entities';
import { APPOINTMENTS_CONSTANTS } from '../../constants/appointments.constants';

const sanitize = (v: any) => sanitizeHtml(String(v ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'ID мастера',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID мастера должен быть валидным UUID' })
  mechanicId?: string;

  @ApiPropertyOptional({
    description: 'Время начала записи',
    example: '2025-01-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Некорректный формат даты начала' })
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({
    description: 'Время окончания записи',
    example: '2025-01-15T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Некорректный формат даты окончания' })
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Ориентировочная продолжительность в минутах',
    example: 120,
    minimum: APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION,
    maximum: APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Продолжительность должна быть числом' })
  @Min(APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION, {
    message: `Минимальная продолжительность ${APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION} минут`,
  })
  @Max(APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION, {
    message: `Максимальная продолжительность ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION} минут`,
  })
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Массив ID услуг',
    example: ['service-1-uuid', 'service-2-uuid'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Услуги должны быть массивом' })
  @ArrayMinSize(1, { message: 'Необходимо выбрать хотя бы одну услугу' })
  @ArrayMaxSize(APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT, {
    message: `Максимум ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT} услуг на запись`,
  })
  @IsUUID('4', { each: true, message: 'Каждый ID услуги должен быть валидным UUID' })
  serviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Приоритет записи',
    enum: AppointmentPriority,
  })
  @IsOptional()
  @IsEnum(AppointmentPriority, { message: 'Некорректный приоритет записи' })
  priority?: AppointmentPriority;

  @ApiPropertyOptional({
    description: 'Описание работ',
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
    description: 'Заметки мастера',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Заметки должны быть строкой' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH, {
    message: `Заметки не могут превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.NOTES_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) => sanitize(value))
  mechanicNotes?: string;

  @ApiPropertyOptional({
    description: 'Контактный телефон (РФ)',
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

  @ApiPropertyOptional({
    description: 'Итоговая стоимость',
    example: 5500.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Стоимость должна быть числом с максимум 2 знаками после запятой' })
  @Min(0, { message: 'Стоимость не может быть отрицательной' })
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : parseFloat(value)))
  finalCost?: number;

  @ApiPropertyOptional({
    description: 'Оценка клиента',
    example: 5,
    minimum: APPOINTMENTS_CONSTANTS.RATING.MIN_RATING,
    maximum: APPOINTMENTS_CONSTANTS.RATING.MAX_RATING,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Оценка должна быть числом' })
  @Min(APPOINTMENTS_CONSTANTS.RATING.MIN_RATING, {
    message: `Минимальная оценка ${APPOINTMENTS_CONSTANTS.RATING.MIN_RATING}`,
  })
  @Max(APPOINTMENTS_CONSTANTS.RATING.MAX_RATING, {
    message: `Максимальная оценка ${APPOINTMENTS_CONSTANTS.RATING.MAX_RATING}`,
  })
  rating?: number;

  @ApiPropertyOptional({
    description: 'Отзыв клиента',
    maxLength: APPOINTMENTS_CONSTANTS.VALIDATION.FEEDBACK_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Отзыв должен быть строкой' })
  @MaxLength(APPOINTMENTS_CONSTANTS.VALIDATION.FEEDBACK_MAX_LENGTH, {
    message: `Отзыв не может превышать ${APPOINTMENTS_CONSTANTS.VALIDATION.FEEDBACK_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) => sanitize(value))
  feedback?: string;
}
