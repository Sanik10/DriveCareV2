import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '../../../../../database/entities/subscription.entity';

export class BillingTariffInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() priceMonthly: number;
  @ApiProperty() priceYearly: number;
  @ApiPropertyOptional() maxUsers?: number;
  @ApiPropertyOptional() maxCustomers?: number;
  @ApiPropertyOptional() maxVehicles?: number;
  @ApiPropertyOptional() maxOrders?: number;
}

export class BillingSubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiPropertyOptional({ type: BillingTariffInfoDto }) tariff?: BillingTariffInfoDto;
  @ApiProperty() startDate: Date;
  @ApiProperty() endDate: Date;
  @ApiProperty({ enum: SubscriptionStatus }) status: SubscriptionStatus;
  @ApiProperty() paymentMethod: string;
  @ApiProperty({ description: 'Автопродление отключено' }) autoRenew: boolean;
  @ApiProperty() daysUntilExpiration: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
