// apps/backend/src/modules/customers/dto/response/customer-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { CustomerType } from '../../../../database/entities/customer.entity';
import { Expose } from 'class-transformer';

export class CustomerResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  companyId: string;

  @ApiProperty({ enum: CustomerType })
  @Expose()
  type: CustomerType;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  companyName: string;

  @ApiProperty()
  @Expose()
  taxNumber: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  phone: string;

  // Свободные тексты скрываем в группе "redacted" (PII минимизация)
  @ApiProperty()
  @Expose({ groups: ['pii'] })
  address: string;

  @ApiProperty()
  @Expose()
  source: string;

  @ApiProperty()
  @Expose()
  loyaltyPoints: number;

  @ApiProperty()
  @Expose({ groups: ['pii'] })
  notes: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty({ required: false })
  @Expose()
  vehiclesCount?: number;

  @ApiProperty({ required: false })
  @Expose()
  displayName?: string;
}
