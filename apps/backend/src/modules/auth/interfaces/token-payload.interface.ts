import { AuthRole } from '../types/auth.types';

export interface TokenPayload {
  sub: string;
  email: string;
  role: AuthRole;
  companyId: string | null; // null для superadmin
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  deviceId: string;
}