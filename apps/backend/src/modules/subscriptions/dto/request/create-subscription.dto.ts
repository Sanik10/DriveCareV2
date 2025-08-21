// apps/backend/src/modules/subscriptions/dto/request/create-subscription.dto.ts
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsDate, IsOptional, IsString, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SUBSCRIPTIONS_CONSTANTS } from '../../constants/subscriptions.constants';

export class CreateSubscriptionDto {
  // companyId не принимаем от клиента — подставляется из req.user.companyId в контроллере
  @ApiHideProperty()
  companyId: string;

  @ApiProperty({
    description: 'ID тарифного плана',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'ID тарифа обязателен' })
  @IsUUID(4, { message: 'ID тарифа должен быть валидным UUID' })
  tariffId: string;

  @ApiPropertyOptional({
    description: 'Дата начала подписки',
    example: '2025-01-01T00:00:00.000Z',
    default: 'Текущая дата',
  })
  @IsOptional()
  @IsDate({ message: 'Дата начала должна быть валидной датой' })
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'Дата окончания подписки',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsNotEmpty({ message: 'Дата окончания обязательна' })
  @IsDate({ message: 'Дата окончания должна быть валидной датой' })
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    example: 'bank_transfer',
    enum: SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS,
    default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD,
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
    example: false,
    default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW,
  })
  @IsOptional()
  @IsBoolean({ message: 'Автопродление должно быть булевым значением' })
  autoRenew?: boolean;
}
