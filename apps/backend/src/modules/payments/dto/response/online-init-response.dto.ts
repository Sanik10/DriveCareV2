// path: apps/backend/src/modules/payments/dto/response/online-init-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnlinePaymentInitResponseDto {
  @ApiProperty({ description: 'ID локального платежа', example: 'a7f2b1d4-2f77-4d0b-9b76-3b2f9a4c1e2a' })
  paymentId!: string;

  @ApiProperty({ description: 'Провайдер', example: 'yookassa', enum: ['yookassa', 'tinkoff'] })
  provider!: 'yookassa' | 'tinkoff';

  @ApiProperty({
    description: 'Технический статус инициализации',
    example: 'pending',
    enum: ['pending', 'processing'],
  })
  status!: 'pending' | 'processing';

  @ApiProperty({
    description: 'URL для редиректа на платёжную страницу',
    example: 'https://yookassa.ru/checkout/confirm?payment_token=...',
  })
  redirectUrl!: string;

  @ApiPropertyOptional({
    description: 'Время истечения ссылки (если известно, ISO 8601)',
    example: '2025-01-31T12:34:56.000Z',
  })
  expiresAt?: string;
}
