import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload, TokenPair } from '../interfaces/token-payload.interface';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createTokenPair(user: User, deviceId: string): Promise<TokenPair> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name as any,
      companyId: user.role.name === 'superadmin' ? null : user.company_id,
      deviceId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION', AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRATION),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRATION', AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRATION),
      deviceId,
    };
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_SECRET'),
    });
  }

  getTokenExpirationTime(): number {
    const expirationString = this.configService.get('JWT_REFRESH_EXPIRATION', AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRATION);
    
    // Преобразуем строку типа "7d" в секунды
    const unit = expirationString.slice(-1);
    const value = parseInt(expirationString.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 7 * 24 * 60 * 60; // По умолчанию 7 дней
    }
  }
}