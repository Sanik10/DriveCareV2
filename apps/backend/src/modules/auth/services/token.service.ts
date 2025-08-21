import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload, TokenPair, CreateTokenPayload } from '../interfaces/token-payload.interface';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { User } from '../../../database/entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async createTokenPair(user: User, deviceId: string, sessionId: string): Promise<TokenPair> {
    const basePayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name as any,
      companyId: user.role.name === 'superadmin' ? null : user.company_id,
      deviceId,
      sessionId,
    };

    const issuer = this.config.get('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get('JWT_AUDIENCE', 'drivecare-users');
    const kid = this.config.get('JWT_KID');

    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = this.jwtService.sign({ ...basePayload, typ: 'access' }, {
      jwtid: accessJti,
      issuer,
      audience,
      keyid: kid,
      expiresIn: this.config.get('JWT_EXPIRATION', AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRATION),
    });

    const refreshToken = this.jwtService.sign({ ...basePayload, typ: 'refresh' }, {
      jwtid: refreshJti,
      issuer,
      audience,
      keyid: kid,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION),
    });

    return {
      accessToken,
      refreshToken,
      refreshJti,
      expiresIn: this.config.get('JWT_EXPIRATION', AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRATION),
      deviceId,
    };
  }

  verifyRefreshToken(token: string): TokenPayload {
    const alg = this.config.get('JWT_ALG', 'HS256');
    const issuer = this.config.get('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get('JWT_AUDIENCE', 'drivecare-users');
    const secretOrPublic = alg === 'RS256'
      ? this.config.get<string>('JWT_PUBLIC_KEY')
      : this.config.get<string>('JWT_REFRESH_SECRET');

    return this.jwtService.verify(token, {
      secret: secretOrPublic,
      algorithms: [alg as any],
      issuer,
      audience,
      clockTolerance: 5,
    }) as TokenPayload;
  }

  verifyAccessToken(token: string): TokenPayload {
    const alg = this.config.get('JWT_ALG', 'HS256');
    const issuer = this.config.get('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get('JWT_AUDIENCE', 'drivecare-users');
    const secretOrPublic = alg === 'RS256'
      ? this.config.get<string>('JWT_PUBLIC_KEY')
      : this.config.get<string>('JWT_SECRET');

    return this.jwtService.verify(token, {
      secret: secretOrPublic,
      algorithms: [alg as any],
      issuer,
      audience,
      clockTolerance: 5,
    }) as TokenPayload;
  }

  getTokenExpirationTime(): number {
    const expirationString = this.config.get('JWT_REFRESH_EXPIRATION', AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION);
    const unit = expirationString.slice(-1);
    const value = parseInt(expirationString.slice(0, -1));
    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 7 * 24 * 60 * 60;
    }
  }

  createRefreshPayload(user: User, deviceId: string, sessionId: string): CreateTokenPayload {
    return {
      userId: user.id,
      email: user.email,
      role: user.role.name as any,
      companyId: user.role.name === 'superadmin' ? null : user.company_id,
      deviceId,
      sessionId,
    };
  }
}
