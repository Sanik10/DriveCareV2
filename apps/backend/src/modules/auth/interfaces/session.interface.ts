import { SessionStatus } from '../types/auth.types';

export interface CreateSessionData {
  userId: string;
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityAttempt {
  email: string;
  ipAddress: string;
  attempts: number;
  blockedUntil?: Date;
}