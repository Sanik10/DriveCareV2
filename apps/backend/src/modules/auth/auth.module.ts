import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// Основные компоненты
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

// Стратегии
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

// Гарды
import { RolesGuard } from './guards/roles.guard';

// Провайдеры
import { RedisProvider } from './redis.provider';

// Сервисы
import { AuditService } from '../../common/audit/audit.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { DeviceService } from './services/device.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';

// Entities
import { UserSession } from '../../database/entities/user-session.entity';
import { Company } from '../../database/entities/company.entity';
import { Role } from '../../database/entities/role.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRATION', '15m')
        },
      }),
    }),
    TypeOrmModule.forFeature([
      UserSession, 
      Company, 
      Role
    ]),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 60,
    }]),
    UsersModule,
  ],
  providers: [
    // Основной сервис (оркестратор)
    AuthService,
    
    // Микросервисы (по принципу Single Responsibility)
    TokenService,
    SessionService,
    SecurityService,
    DeviceService,
    CompanyOnboardingService,
    
    // Стратегии аутентификации
    LocalStrategy, 
    JwtStrategy, 
    
    // Гарды авторизации
    RolesGuard,
    
    // Внешние провайдеры
    RedisProvider,
    AuditService,
  ],
  controllers: [AuthController],
  exports: [
    AuthService, 
    TokenService,
    SessionService,
    SecurityService,
    RolesGuard, 
    JwtModule
  ],
})
export class AuthModule {}