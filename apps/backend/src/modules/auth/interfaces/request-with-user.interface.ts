import { Request } from 'express';
import { AuthRole } from '../types/auth.types';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: AuthRole;
    companyId: string | null; // null для superadmin
    deviceId?: string;
    sessionId?: string;
    firstName?: string;
    lastName?: string;
  };
  // 🔥 ДОБАВЛЕНО: Correlation ID для трекинга requests
  correlationId?: string;
  // 🔥 ДОБАВЛЕНО: Request ID для audit trails
  requestId?: string;
  // 🔥 ДОБАВЛЕНО: Request timestamp
  requestTimestamp?: Date;
}

// 🔥 НОВЫЙ: Расширенный интерфейс для audit logging
export interface AuditRequestWithUser extends RequestWithUser {
  correlationId: string; // Required для audit
  requestId: string; // Required для audit
  requestTimestamp: Date; // Required для audit
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string; // Device fingerprint
}
