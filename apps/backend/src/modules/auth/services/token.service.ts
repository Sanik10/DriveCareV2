// path: apps/backend/src/modules/auth/services/token.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private config: ConfigService) {}

  generateOpaqueToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  getSessionExpirationTime(): number {
    const expirationString = this.config.get<string>('SESSION_EXPIRATION', '7d');
    const unit = expirationString.slice(-1);
    const value = parseInt(expirationString.slice(0, -1), 10);
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 7 * 24 * 60 * 60;
    }
  }
}
