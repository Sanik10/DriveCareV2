// path: apps/backend/src/modules/payments/dto/request/online-init.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsObject,
  IsEmail,
  MaxLength,
  ValidateNested,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import sanitizeHtml from 'sanitize-html';
import { PAYMENTS_CONSTANTS } from '../../constants/payments.constants';
import { PaymentCurrency } from '../../types/payments.types';

export class OnlineInitCustomerDto {
  @ApiPropertyOptional({ description: 'Email плательщика', example: 'customer@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Телефон плательщика (E.164)', example: '+79991234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Телефон слишком длинный' })
  phone?: string;
}

export class OnlinePaymentInitDto {
  @ApiProperty({ description: 'ID инвойса', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID(4, { message: 'ID инвойса должен быть валидным UUID' })
  invoiceId!: string;

  @ApiPropertyOptional({
    description: 'Сумма оплаты (если не указана — остаток по инвойсу)',
    example: 5000.0,
    minimum: PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма должна быть числом с максимум 2 знаками после запятой' })
  @Min(PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN, { message: `Минимальная сумма оплаты: ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN}` })
  @Max(PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX, { message: `Максимальная сумма оплаты: ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX}` })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Валюта (по умолчанию RUB)',
    enum: PaymentCurrency,
    example: PaymentCurrency.RUB,
    default: PaymentCurrency.RUB,
  })
  @IsOptional()
  @IsIn(Object.values(PaymentCurrency), { message: 'Некорректная валюта' })
  currency?: PaymentCurrency;

  @ApiPropertyOptional({
    description: 'ID способа оплаты компании (если не указан — будет подобран активный YooKassa метод)',
    example: '789e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID способа оплаты должен быть валидным UUID' })
  paymentMethodId?: string;

  @ApiProperty({
    description: 'URL для возврата после оплаты',
    example: 'https://app.example.com/dashboard/payments/result',
  })
  @IsUrl({}, { message: 'Некорректный URL возврата' })
  returnUrl!: string;

  @ApiPropertyOptional({
    description: 'Локаль платёжной страницы',
    example: 'ru_RU',
    enum: ['ru_RU', 'en_US'],
    default: 'ru_RU',
  })
  @IsOptional()
  @IsIn(['ru_RU', 'en_US'])
  locale?: 'ru_RU' | 'en_US';

  @ApiPropertyOptional({
    description: 'Сразу захватывать платёж после успешной авторизации',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  capture?: boolean;

  @ApiPropertyOptional({
    description: 'Данные плательщика (если известны)',
    type: OnlineInitCustomerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnlineInitCustomerDto)
  customer?: OnlineInitCustomerDto;

  @ApiPropertyOptional({
    description: 'Доп. метаданные (макс. 5KB)',
    example: { source: 'web_app', campaign: 'spring' },
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (size > 5120) {
      throw new Error('Metadata size cannot exceed 5KB');
    }
    return value;
  })
  @IsObject({ message: 'Метаданные должны быть объектом' })
  metadata?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Описание платежа (отобразится в ЛК плательщика)',
    example: 'Оплата счёта INV-2025-00012',
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] }))
  @IsString()
  @MaxLength(255, { message: 'Описание не может превышать 255 символов' })
  description?: string;
}
