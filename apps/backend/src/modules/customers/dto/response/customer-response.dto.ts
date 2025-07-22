import { ApiProperty } from '@nestjs/swagger';
import { CustomerType } from '../../../../database/entities/customer.entity';

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ enum: CustomerType })
  type: CustomerType;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  taxNumber: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  source: string;

  @ApiProperty()
  loyaltyPoints: number;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  vehiclesCount?: number;

  @ApiProperty({ required: false })
  displayName?: string;
}
