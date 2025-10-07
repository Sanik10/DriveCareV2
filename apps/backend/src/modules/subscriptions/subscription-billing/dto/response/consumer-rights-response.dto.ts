// path: apps/backend/src/modules/subscriptions/subscription-billing/dto/response/consumer-rights-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ConsumerRightsResponseDto {
  @ApiProperty() canCancel: boolean;
  @ApiProperty() coolingOffActive: boolean;
  @ApiProperty() refundPolicy: string;
}
