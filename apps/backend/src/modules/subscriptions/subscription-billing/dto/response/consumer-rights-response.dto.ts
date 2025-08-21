import { ApiProperty } from '@nestjs/swagger';

export class ConsumerRightsResponseDto {
  @ApiProperty() canCancel: boolean;
  @ApiProperty() coolingOffActive: boolean;
  @ApiProperty() refundPolicy: string;
}
