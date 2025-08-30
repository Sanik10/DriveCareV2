// path: apps/backend/src/modules/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    try {
      const ipAddress = (req.ip || (req.connection as any)?.remoteAddress || '') as string;
      const userAgent = (req.headers['user-agent'] || '') as string;
      const twoFactorCode = (req.body as any)?.twoFactorCode || (req.headers['x-2fa-code'] as string) || undefined;
      return await this.authService.validateUser(email, password, ipAddress, userAgent, twoFactorCode);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[Auth] LocalStrategy failed', {
          email,
          reason: err?.message || err,
        });
      }
      // ВАЖНО: не затираем коды и сообщения (например, 429 Too Many Requests)
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException('Неверные учетные данные');
    }
  }
}
