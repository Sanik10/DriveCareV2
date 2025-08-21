export interface ConsentManagementInput {
  companyId: string;
  pdnConsentGiven: boolean;
  consentType: 'create' | 'update' | 'revoke';
  dataCategories: string[];
  processingPurposes: string[];
  retentionPeriod: number;
  userIpAddress: string;
  userAgent: string;
  consentText: string;
}
