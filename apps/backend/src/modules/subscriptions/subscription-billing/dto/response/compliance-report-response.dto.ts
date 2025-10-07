// path: apps/backend/src/modules/subscriptions/subscription-billing/dto/response/compliance-report-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ComplianceReportResponseDto {
  @ApiProperty() dataLocalized: boolean;
  @ApiProperty() pdnConsentGiven: boolean;
  @ApiProperty() consumerRightsRespected: boolean;
  @ApiProperty() mirPaymentSupported: boolean;
  @ApiProperty() complianceScore: number;
  @ApiProperty({ type: [String] }) recommendations: string[];
}
