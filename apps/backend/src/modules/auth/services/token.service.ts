// path: apps/backend/src/modules/auth/services/token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload, TokenPair, CreateTokenPayload } from '../interfaces/token-payload.interface';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { User } from '../../../database/entities/user.entity';
import { randomUUID } from 'crypto';

type SupportedAlgs = 'HS256' | 'HS384' | 'HS512' | 'RS256';

@Injectable()
export class TokenService {
  constructor(private jwtService: JwtService, private config: ConfigService) {}

  /**
   * Генерирует пару токенов. Важно:
   * - Access подписываем секретом JWT_SECRET (или приватным ключом при RS256)
   * - Refresh подписываем JWT_REFRESH_SECRET (или тем же приватным ключом при RS256)
   * - В payload добавляем sessionId и deviceId
   * - kid (keyid) добавляем только если это валидная непустая строка (иначе jsonwebtoken бросит "keyid must be a string")
   */
  async createTokenPair(user: User, deviceId: string, sessionId: string): Promise<TokenPair> {
    const basePayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name as any,
      companyId: user.role.name === 'superadmin' ? null : user.company_id,
      deviceId,
      sessionId,
    };

    const issuer = this.config.get<string>('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get<string>('JWT_AUDIENCE', 'drivecare-users');
    const kidRaw = this.config.get<string>('JWT_KID');
    const hasKid = typeof kidRaw === 'string' && kidRaw.trim().length > 0;
    const kid = hasKid ? kidRaw!.trim() : undefined;

    const alg = (this.config.get<string>('JWT_ALG', 'HS256') as SupportedAlgs) || 'HS256';

    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    // Секреты/ключи
    const accessSecretOrPrivate =
      alg === 'RS256'
        ? (this.config.get<string>('JWT_PRIVATE_KEY') as string)
        : (this.config.get<string>('JWT_SECRET') as string);

    const refreshSecretOrPrivate =
      alg === 'RS256'
        ? (this.config.get<string>('JWT_PRIVATE_KEY') as string)
        : (this.config.get<string>('JWT_REFRESH_SECRET') as string);

    const accessExpiresIn = this.config.get<string | number>(
      'JWT_EXPIRATION',
      AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRATION,
    );

    const refreshExpiresIn = this.config.get<string | number>(
      'JWT_REFRESH_EXPIRATION',
      AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION,
    );

    // Опции подписи access
    const accessOptions: Record<string, any> = {
      jwtid: accessJti,
      issuer,
      audience,
      expiresIn: accessExpiresIn,
      algorithm: alg as any,
      secret: accessSecretOrPrivate,
    };
    if (kid) accessOptions.keyid = kid; // добавляем keyid только если валиден

    const accessToken = this.jwtService.sign({ ...basePayload, typ: 'access' }, accessOptions);

    // Опции подписи refresh
    const refreshOptions: Record<string, any> = {
      jwtid: refreshJti,
      issuer,
      audience,
      expiresIn: refreshExpiresIn,
      algorithm: alg as any,
      secret: refreshSecretOrPrivate,
    };
    if (kid) refreshOptions.keyid = kid;

    const refreshToken = this.jwtService.sign({ ...basePayload, typ: 'refresh' }, refreshOptions);

    return {
      accessToken,
      refreshToken,
      refreshJti,
      expiresIn: accessExpiresIn,
      deviceId,
    };
  }

  verifyRefreshToken(token: string): TokenPayload {
    const alg = (this.config.get<string>('JWT_ALG', 'HS256') as SupportedAlgs) || 'HS256';
    const issuer = this.config.get<string>('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get<string>('JWT_AUDIENCE', 'drivecare-users');

    const secretOrPublic =
      alg === 'RS256'
        ? (this.config.get<string>('JWT_PUBLIC_KEY') as string)
        : (this.config.get<string>('JWT_REFRESH_SECRET') as string);

    return this.jwtService.verify(token, {
      secret: secretOrPublic,
      algorithms: [alg as any],
      issuer,
      audience,
      clockTolerance: 5,
    }) as TokenPayload;
  }

  verifyAccessToken(token: string): TokenPayload {
    const alg = (this.config.get<string>('JWT_ALG', 'HS256') as SupportedAlgs) || 'HS256';
    const issuer = this.config.get<string>('JWT_ISSUER', 'drivecare-v2');
    const audience = this.config.get<string>('JWT_AUDIENCE', 'drivecare-users');

    const secretOrPublic =
      alg === 'RS256'
        ? (this.config.get<string>('JWT_PUBLIC_KEY') as string)
        : (this.config.get<string>('JWT_SECRET') as string);

    return this.jwtService.verify(token, {
      secret: secretOrPublic,
      algorithms: [alg as any],
      issuer,
      audience,
      clockTolerance: 5,
    }) as TokenPayload;
  }

  /**
   * Возвращает TTL refresh-токена в секундах (по строковому значению из ENV)
   * Примеры: "7d" → 604800, "12h" → 43200, "30m" → 1800
   */
  getTokenExpirationTime(): number {
    const expirationString = this.config.get<string>(
      'JWT_REFRESH_EXPIRATION',
      AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION,
    );
    const unit = expirationString.slice(-1);
    const value = parseInt(expirationString.slice(0, -1), 10);
    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60;
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 7 * 24 * 60 * 60;
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
