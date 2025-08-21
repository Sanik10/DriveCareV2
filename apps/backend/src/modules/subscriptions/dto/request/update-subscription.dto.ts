// apps/backend/src/modules/subscriptions/dto/request/update-subscription.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDate, IsEnum, IsString, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SubscriptionStatus } from '../../types/subscriptions.types';
import { SUBSCRIPTIONS_CONSTANTS } from '../../constants/subscriptions.constants';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'ID тарифного плана',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID тарифа должен быть валидным UUID' })
  tariffId?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания подписки',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate({ message: 'Дата окончания должна быть валидной датой' })
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Статус подписки',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.SUSPENDED,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, { message: 'Некорректный статус подписки' })
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    example: 'card',
    enum: SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS,
    maxLength: SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Способ оплаты должен быть строкой' })
  @MaxLength(SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH, {
    message: `Способ оплаты не может превышать ${SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH} символов`,
  })
  @IsIn(SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[], { message: 'Неподдерживаемый способ оплаты' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Автоматическое продление подписки',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Автопродление должно быть булевым значением' })
  autoRenew?: boolean;
}
