export type AuthRole =  'superadmin' | 'owner' | 'admin' | 'manager' | 'mechanic';

export type RegistrationFlow = 'company_creation' | 'invite_acceptance';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export type AuditStatus = 'success' | 'failed' | 'error' | 'blocked';