import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsIP, IsString, MaxLength, IsIn } from 'class-validator';

export class CreateBillingSubscriptionDto {
  @ApiProperty({ description: 'ID тарифа', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID(4)
  tariffId: string;

  @ApiProperty({ description: 'Согласие на обработку ПДн (ФЗ-152)', example: true })
  @IsNotEmpty()
  @IsBoolean()
  pdnConsentGiven: boolean;

  @ApiProperty({ description: 'Ознакомление с правами потребителей', example: true })
  @IsNotEmpty()
  @IsBoolean()
  consumerRightsAcknowledged: boolean;

  // Автопродление отключено политикой — не принимаем true
  @ApiPropertyOptional({ description: 'Автопродление (отключено)', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Способ оплаты', enum: ['manual','bank_transfer','card','mir','sbp','wallet'], example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  @IsIn(['manual','bank_transfer','card','mir','sbp','wallet'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'IP пользователя', example: '192.168.1.10' })
  @IsOptional()
  @IsIP(4)
  userIpAddress?: string;

  @ApiPropertyOptional({ description: 'User-Agent', example: 'Mozilla/5.0 ...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
