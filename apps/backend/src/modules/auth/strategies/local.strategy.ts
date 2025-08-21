import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    } catch {
      throw new UnauthorizedException('Неверные учетные данные');
    }
  }
}
