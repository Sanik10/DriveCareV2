import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsDate, IsOptional, IsEnum, IsString, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '../../types/subscriptions.types';
import { SUBSCRIPTIONS_CONSTANTS } from '../../constants/subscriptions.constants';

export class CreateSubscriptionDto {
  @ApiProperty({ 
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'ID компании обязателен' })
  @IsUUID(4, { message: 'ID компании должен быть валидным UUID' })
  companyId: string;

  @ApiProperty({ 
    description: 'ID тарифного плана',
    example: '456e7890-e89b-12d3-a456-426614174001'
  })
  @IsNotEmpty({ message: 'ID тарифа обязателен' })
  @IsUUID(4, { message: 'ID тарифа должен быть валидным UUID' })
  tariffId: string;

  @ApiPropertyOptional({ 
    description: 'Дата начала подписки',
    example: '2025-01-01T00:00:00.000Z',
    default: 'Текущая дата'
  })
  @IsOptional()
  @IsDate({ message: 'Дата начала должна быть валидной датой' })
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ 
    description: 'Дата окончания подписки',
    example: '2025-12-31T23:59:59.999Z'
  })
  @IsNotEmpty({ message: 'Дата окончания обязательна' })
  @IsDate({ message: 'Дата окончания должна быть валидной датой' })
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ 
    description: 'Статус подписки',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    default: SubscriptionStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, { message: 'Некорректный статус подписки' })
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ 
    description: 'Способ оплаты',
    example: 'bank_transfer',
    maxLength: SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH,
    default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD
  })
  @IsOptional()
  @IsString({ message: 'Способ оплаты должен быть строкой' })
  @MaxLength(SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH, { 
    message: `Способ оплаты не может превышать ${SUBSCRIPTIONS_CONSTANTS.VALIDATION.PAYMENT_METHOD_MAX_LENGTH} символов` 
  })
  paymentMethod?: string;

  @ApiPropertyOptional({ 
    description: 'Автоматическое продление подписки',
    example: false,
    default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW
  })
  @IsOptional()
  @IsBoolean({ message: 'Автопродление должно быть булевым значением' })
  autoRenew?: boolean;
}
