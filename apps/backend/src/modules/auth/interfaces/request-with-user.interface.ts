import { Request } from 'express';
import { AuthRole } from '../types/auth.types';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: AuthRole;
    companyId: string | null; // null для superadmin
    deviceId?: string;
    firstName?: string;  // ✅ ДОБАВЛЕНО
    lastName?: string;   // ✅ ДОБАВЛЕНО
  };
}