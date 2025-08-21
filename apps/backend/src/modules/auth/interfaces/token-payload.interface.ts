import { AuthRole } from '../types/auth.types';

export interface TokenPayload {
  sub: string;
  email: string;
  role: AuthRole;
  companyId: string | null;
  deviceId: string;
  sessionId: string;
  jti?: string;
  typ?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface CreateTokenPayload {
  userId: string;
  email: string;
  role: AuthRole;
  companyId: string | null;
  deviceId: string;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  expiresIn: string | number;
  deviceId: string;
}
