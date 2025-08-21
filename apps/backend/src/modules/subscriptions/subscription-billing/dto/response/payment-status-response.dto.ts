import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentStatusResponseDto {
  @ApiProperty() subscriptionId: string;
  @ApiProperty() paymentId: string;
  @ApiProperty({ enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] }) status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() provider: 'yookassa' | 'tinkoff';
  @ApiPropertyOptional() redirectUrl?: string;
}
