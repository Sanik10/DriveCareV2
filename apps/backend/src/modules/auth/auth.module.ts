// path: apps/backend/src/modules/auth/auth.module.ts
import { Module, Logger, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { RolesGuard } from './guards/roles.guard';

import { AuditService } from '../../common/audit/audit.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { DeviceService } from './services/device.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';
import { TwoFAService } from './services/twofa.service';

import { UserSession } from '../../database/entities/user-session.entity';
import { Company } from '../../database/entities/company.entity';
import { Role } from '../../database/entities/role.entity';
import { User } from '../../database/entities/user.entity';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const alg = config.get('JWT_ALG', 'HS256');
        const issuer = config.get('JWT_ISSUER', 'drivecare-v2');
        const audience = config.get('JWT_AUDIENCE', 'drivecare-users');

        if (alg === 'RS256') {
          const privateKey = config.get<string>('JWT_PRIVATE_KEY');
          const publicKey = config.get<string>('JWT_PUBLIC_KEY');
          if (!privateKey || !publicKey) throw new Error('RS256 selected but keys not set');
          return {
            privateKey, publicKey,
            signOptions: { algorithm: 'RS256', issuer, audience, expiresIn: config.get<string>('JWT_EXPIRATION') || '15m' },
            verifyOptions: { algorithms: ['RS256'], issuer, audience, clockTolerance: 5 },
          };
        }
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { algorithm: 'HS256', issuer, audience, expiresIn: config.get<string>('JWT_EXPIRATION') || '15m' },
          verifyOptions: { algorithms: ['HS256'], issuer, audience, clockTolerance: 5 },
        };
      },
    }),
    TypeOrmModule.forFeature([UserSession, Company, Role, User]),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 20 },
      { name: 'strict', ttl: 300_000, limit: 3 },
    ]),
    RedisModule, // ⬅️ вместо локального провайдера
    forwardRef(() => UsersModule),
  ],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    SecurityService,
    DeviceService,
    CompanyOnboardingService,
    TwoFAService,
    LocalStrategy,
    JwtStrategy,
    RolesGuard,
    AuditService,
    Logger,
  ],
  controllers: [AuthController],
  exports: [AuthService, TokenService, SessionService, SecurityService, RolesGuard, JwtModule],
})
export class AuthModule {}
