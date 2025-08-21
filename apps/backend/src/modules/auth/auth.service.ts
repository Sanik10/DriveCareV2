import { Injectable } from '@nestjs/common';
import {
  InvalidCredentialsException,
  InactiveUserException,
  TooManyAttemptsException,
  InvalidTokenException,
} from '../../common/exceptions/custom-exceptions';
import { UsersService } from '../users/users.service';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { AuditService, AuditAction, AuditLevel } from '../../common/audit/audit.service';

import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';
import { TwoFAService } from './services/twofa.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private securityService: SecurityService,
    private companyOnboardingService: CompanyOnboardingService,
    private twoFA: TwoFAService,
  ) {}

  async validateUser(email: string, password: string, ipAddress?: string, userAgent?: string, twoFactorCode?: string): Promise<any> {
    try {
      let securityResult: { isBlocked: boolean; attempts: number; blockTime?: number } | null = null;

      if (ipAddress) {
        securityResult = await this.securityService.checkAndRecordFailedAttempt(email, ipAddress);
        if (securityResult.isBlocked) {
          await this.auditService.logLoginFailed({
            details: { email: this.maskEmail(email), reason: 'IP temporarily blocked', attempts: securityResult.attempts, blockTime: securityResult.blockTime },
            ipAddress,
            userAgent,
            level: AuditLevel.WARNING,
          });
          throw new TooManyAttemptsException();
        }
      }

      const user = await this.usersService.findByEmail(email);
      if (!user) {
        await this.auditService.logLoginFailed({ details: { email: this.maskEmail(email), reason: 'User not found', attempts: securityResult?.attempts || 0 }, ipAddress, userAgent });
        throw new InvalidCredentialsException();
      }

      if (!user.isActive) {
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email: this.maskEmail(email), reason: 'User inactive', attempts: securityResult?.attempts || 0 },
          ipAddress,
          userAgent,
        });
        throw new InactiveUserException();
      }

      const isPasswordValid = await this.usersService.comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email: this.maskEmail(email), reason: 'Invalid password', attempts: securityResult?.attempts || 0 },
          ipAddress,
          userAgent,
        });
        throw new InvalidCredentialsException();
      }

      if (user.twoFactorEnabled) {
        if (!twoFactorCode || !(await this.twoFA.verify(user.id, twoFactorCode))) {
          await this.auditService.logLoginFailed({
            userId: user.id,
            companyId: user.company_id,
            details: { email: this.maskEmail(email), reason: '2FA required or invalid', attempts: securityResult?.attempts || 0 },
            ipAddress,
            userAgent,
          });
          throw new InvalidCredentialsException();
        }
      }

      if (ipAddress) {
        await this.securityService.resetFailedLoginAttempts(email, ipAddress);
      }

      return user;
    } catch (error) {
      if (
        !(error instanceof InvalidCredentialsException) &&
        !(error instanceof InactiveUserException) &&
        !(error instanceof TooManyAttemptsException)
      ) {
        await this.auditService.log(AuditAction.USER_LOGIN_FAILED, {
          details: { email: this.maskEmail(email), error: error?.message || String(error) },
          ipAddress,
          userAgent,
          level: AuditLevel.ERROR,
          status: 'error',
        });
      }
      throw error;
    }
  }

  async generateTokens(user: any, userAgent: string, ipAddress: string) {
    await this.usersService.updateLastLogin(user.id);
    const fullUser = await this.usersService.findById(user.id);

    const { tokens } = await this.sessionService.createSession(fullUser, userAgent, ipAddress);

    await this.auditService.logLogin({
      userId: fullUser.id,
      companyId: fullUser.company_id,
      ipAddress,
      userAgent,
      deviceId: tokens.deviceId,
      details: { email: this.maskEmail(fullUser.email) },
    });

    return {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        phone: fullUser.phone,
        isActive: fullUser.isActive,
        role: { id: fullUser.role.id, name: fullUser.role.name },
        company_id: fullUser.company_id,
        createdAt: fullUser.createdAt,
      },
      tokens,
    };
  }

  async registerCompany(registerDto: RegisterCompanyDto, ipAddress?: string, userAgent?: string) {
    try {
      const result = await this.companyOnboardingService.createCompanyWithOwner(registerDto);

      await this.auditService.logRegistration({
        userId: result.owner.id,
        companyId: result.company.id,
        ipAddress,
        userAgent,
        details: {
          email: this.maskEmail(result.owner.email),
          companyName: result.company.name,
          registrationType: 'company_creation',
          pdnConsent: true,
          policyVersion: '1.0',
        },
      });

      return result;
    } catch (error) {
      await this.auditService.log(AuditAction.USER_REGISTERED, {
        details: { email: this.maskEmail(registerDto.ownerEmail), companyName: registerDto.companyName, error: error?.message || String(error) },
        ipAddress,
        userAgent,
        level: AuditLevel.ERROR,
        status: 'error',
      });
      throw error;
    }
  }

  // Новый refresh: принимает RT из cookie
  async refreshTokenRaw(refreshToken: string, userAgent: string, ipAddress: string) {
    try {
      if (!refreshToken) throw new InvalidTokenException();
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      const session = await this.sessionService.findActiveSessionByJti(payload.sub, payload.jti!, payload.deviceId);
      if (!session) {
        await this.auditService.logTokenRefreshFailed({
          userId: payload.sub, ipAddress, userAgent, deviceId: payload.deviceId,
          details: { reason: 'Session not found by jti/device' },
        });
        throw new InvalidTokenException();
      }

      const isValidInRedis = await this.sessionService.validateRefreshTokenInRedis(payload.sub, session.deviceId, refreshToken);
      const isValidInDb = await this.sessionService.verifyRtAgainstSession(session, refreshToken);

      if (!isValidInRedis || !isValidInDb) {
        // reuse detected — ревок всех сессий устройства
        await this.sessionService.removeDeviceSessions(payload.sub, session.deviceId);
        await this.auditService.logTokenRefreshFailed({
          userId: payload.sub, ipAddress, userAgent, deviceId: session.deviceId,
          details: { reason: 'Refresh token reuse detected — device sessions revoked' },
          level: AuditLevel.ERROR,
        });
        throw new InvalidTokenException();
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user.isActive) {
        await this.auditService.logTokenRefreshFailed({
          userId: payload.sub, ipAddress, userAgent, deviceId: session.deviceId,
          details: { reason: 'User inactive' },
        });
        throw new InvalidTokenException();
      }

      // деактивируем старую jti
      await this.sessionService.removeSessionByJti(payload.sub, session.deviceId, payload.jti!);

      // создаём новую сессию
      const { tokens } = await this.sessionService.createSession(user, userAgent, ipAddress);

      await this.auditService.logTokenRefresh({
        userId: user.id,
        companyId: user.company_id,
        ipAddress,
        userAgent,
        deviceId: session.deviceId,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isActive: user.isActive,
          role: { id: user.role.id, name: user.role.name },
          company_id: user.company_id,
          createdAt: user.createdAt,
        },
        tokens,
      };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_TOKEN_REFRESH_FAILED, {
        details: { error: error?.message || String(error) },
        ipAddress,
        userAgent,
        level: AuditLevel.ERROR,
        status: 'error',
      });
      throw new InvalidTokenException();
    }
  }

  async logoutByRt(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      const session = await this.sessionService.findActiveSessionByJti(userId, payload.jti!, payload.deviceId);
      if (session) {
        await this.sessionService.removeSessionByJti(userId, session.deviceId, payload.jti!);
        await this.auditService.logLogout({ userId, ipAddress, userAgent, deviceId: session.deviceId });
      }
      return { success: true };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_LOGOUT, {
        userId, ipAddress, userAgent, details: { error: error?.message || String(error) }, status: 'error', level: AuditLevel.ERROR,
      });
      throw error;
    }
  }

  async logoutDevice(userId: string, logoutDeviceDto: LogoutDeviceDto, ipAddress?: string, userAgent?: string) {
    try {
      const sessionsCount = await this.sessionService.removeDeviceSessions(userId, logoutDeviceDto.deviceId);
      await this.auditService.logDeviceLogout({
        userId,
        ipAddress,
        userAgent,
        deviceId: logoutDeviceDto.deviceId,
        details: { sessionsCount },
      });
      return { success: true, message: 'Устройство успешно отключено' };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_DEVICE_LOGOUT, {
        userId,
        ipAddress,
        userAgent,
        deviceId: logoutDeviceDto.deviceId,
        details: { error: error?.message || String(error) },
        status: 'error',
        level: AuditLevel.ERROR,
      });
      throw error;
    }
  }

  async logoutAllDevices(userId: string, currentDeviceId?: string, ipAddress?: string, userAgent?: string) {
    try {
      const deactivatedCount = await this.sessionService.removeAllUserSessions(userId, currentDeviceId);
      await this.auditService.logAllDevicesLogout({
        userId,
        ipAddress,
        userAgent,
        deviceId: currentDeviceId,
        details: { excludedCurrentDevice: !!currentDeviceId, deactivatedCount },
      });
      return { success: true, message: 'Выход выполнен со всех устройств', deactivatedCount };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_ALL_DEVICES_LOGOUT, {
        userId,
        ipAddress,
        userAgent,
        deviceId: currentDeviceId,
        details: { error: error?.message || String(error) },
        status: 'error',
        level: AuditLevel.ERROR,
      });
      throw error;
    }
  }

  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  async getUserSecurityStats(userId: string, ipAddress?: string): Promise<{ activeSessions: number; lastLogin: Date | null; securityAttempts?: any }> {
    const user = await this.usersService.findById(userId);
    const sessions = await this.sessionService.getUserSessions(userId);
    let securityAttempts = null;
    if (ipAddress) {
      securityAttempts = await this.securityService.getSecurityAttempts(user.email, ipAddress);
    }
    return { activeSessions: sessions.length, lastLogin: user.lastLoginAt, securityAttempts };
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [name, domain] = email.split('@');
    const safeName = name.length <= 2 ? '*'.repeat(name.length) : name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    const parts = domain.split('.');
    const safeDomainName =
      parts[0].length <= 2 ? '*'.repeat(parts[0].length) : parts[0][0] + '*'.repeat(parts[0].length - 2) + parts[0][parts[0].length - 1];
    return `${safeName}@${safeDomainName}.${parts.slice(1).join('.')}`;
  }
}
