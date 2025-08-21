import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { TokenPayload } from '../interfaces/token-payload.interface';
import { SessionService } from '../services/session.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private moduleRef: ModuleRef
  ) {
    const alg = config.get('JWT_ALG', 'HS256');
    const issuer = config.get('JWT_ISSUER', 'drivecare-v2');
    const audience = config.get('JWT_AUDIENCE', 'drivecare-users');

    const secretOrPublic = alg === 'RS256'
      ? config.get<string>('JWT_PUBLIC_KEY')
      : config.get<string>('JWT_SECRET');

    if (!secretOrPublic) {
      throw new Error('JWT secret/public key is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretOrPublic,
      algorithms: [alg],
      issuer,
      audience,
      clockTolerance: 5,
    });
  }

  async validate(payload: TokenPayload) {
    try {
      if (!payload.sub || !payload.sessionId) throw new UnauthorizedException('Invalid token payload');

      const sessionService = this.moduleRef.get(SessionService, { strict: false });
      const usersService = this.moduleRef.get(UsersService, { strict: false });

      const isSessionActive = await sessionService.isSessionActive(payload.sessionId);
      if (!isSessionActive) throw new UnauthorizedException('Session expired or invalid');

      const user = await usersService.findById(payload.sub);
      if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId,
        user,
      };
    } catch {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
