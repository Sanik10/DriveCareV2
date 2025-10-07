// path: apps/backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Inject, forwardRef, Logger } from '@nestjs/common';
import {
  InvalidCredentialsException,
  InactiveUserException,
  TooManyAttemptsException,
  InvalidTokenException,
} from '../../common/exceptions/custom-exceptions';
import { UsersService } from '../users/users.service';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { AuditService, AuditAction, AuditLevel } from '../../common/audit/audit.service';

import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';
import { TwoFAService } from './services/twofa.service';

import { UsersInvitationsService } from '../users/services/users-invitations.service';
import { UsersBusinessService } from '../users/services/users-business.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private securityService: SecurityService,
    private companyOnboardingService: CompanyOnboardingService,
    private twoFA: TwoFAService,
    @Inject(forwardRef(() => UsersInvitationsService))
    private invitations: UsersInvitationsService,
    @Inject(forwardRef(() => UsersBusinessService))
    private usersBusinessService: UsersBusinessService,
  ) {}

  async validateUser(email: string, password: string, ipAddress?: string, userAgent?: string, twoFactorCode?: string): Promise<any> {
    try {
      // 1) Проверка блокировки по логин-попыткам (без записи)
      if (ipAddress) {
        const loginBlocked = await this.securityService.checkFailedLoginAttempts(email, ipAddress);
        if (loginBlocked) {
          await this.auditService.logLoginFailed({
            details: { email: this.maskEmail(email), reason: 'IP temporarily blocked' },
            ipAddress,
            userAgent,
            level: AuditLevel.WARNING,
          });
          throw new TooManyAttemptsException();
        }
      }

      // 2) Пользователь
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        if (ipAddress) await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        await this.auditService.logLoginFailed({
          details: { email: this.maskEmail(email), reason: 'User not found' },
          ipAddress,
          userAgent,
        });
        throw new InvalidCredentialsException();
      }

      if (!user.isActive) {
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email: this.maskEmail(email), reason: 'User inactive' },
          ipAddress,
          userAgent,
        });
        throw new InactiveUserException();
      }

      // 3) Пароль
      const isPasswordValid = await this.usersService.comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        if (ipAddress) await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email: this.maskEmail(email), reason: 'Invalid password' },
          ipAddress,
          userAgent,
        });
        throw new InvalidCredentialsException();
      }

      // 4) 2FA (отдельные лимиты/счётчик)
      if (user.twoFactorEnabled) {
        if (ipAddress) {
          const twoFaBlocked = await this.securityService.checkTwoFaBlocked(email, ipAddress);
          if (twoFaBlocked) {
            await this.auditService.logLoginFailed({
              userId: user.id,
              companyId: user.company_id,
              details: { email: this.maskEmail(email), reason: '2FA temporarily blocked' },
              ipAddress,
              userAgent,
              level: AuditLevel.WARNING,
            });
            throw new TooManyAttemptsException();
          }
        }

        const ok = !!twoFactorCode && (await this.twoFA.verify(user.id, twoFactorCode));
        if (!ok) {
          if (ipAddress) await this.securityService.recordTwoFaFailedAttempt(email, ipAddress);
          await this.auditService.logLoginFailed({
            userId: user.id,
            companyId: user.company_id,
            details: { email: this.maskEmail(email), reason: '2FA required or invalid' },
            ipAddress,
            userAgent,
          });
          // Явно указываем на 2FA, чтобы фронт подсветил поле
          throw new UnauthorizedException('Требуется код 2FA или он неверен');
        }
      }

      // 5) Апгрейд хеша при необходимости
      await this.usersService.upgradePasswordHashIfNeeded(user.id, password, user.password_hash);

      // 6) Успешный вход — сбрасываем счётчики
      if (ipAddress) {
        await this.securityService.resetFailedLoginAttempts(email, ipAddress);
        await this.securityService.resetTwoFaAttempts(email, ipAddress);
      }

      return user;
    } catch (error) {
      if (
        !(error instanceof InvalidCredentialsException) &&
        !(error instanceof InactiveUserException) &&
        !(error instanceof TooManyAttemptsException) &&
        !(error instanceof UnauthorizedException)
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
        twoFactorEnabled: fullUser.twoFactorEnabled,
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

  /**
   * 🔧 УЛУЧШЕНО: Детальное логирование регистрации по приглашению
   */
  async registerByInvite(registerDto: RegisterInviteDto, ipAddress?: string, userAgent?: string) {
    const dto: any = registerDto as any;
    const token: string = dto.token;
    const password: string = dto.password;
    const firstName: string | undefined = dto.firstName;
    const lastName: string | undefined = dto.lastName;
    const phone: string | undefined = dto.phone;

    this.logger.log(`Register by invite started: token=${token?.substring(0, 16)}...`);

    if (!token || !password) {
      this.logger.error(`Missing required fields: token=${!!token}, password=${!!password}`);
      throw new InvalidTokenException();
    }

    try {
      // 1) Проверка и получение инвайта
      this.logger.debug(`Validating invite token: ${token.substring(0, 16)}...`);
      const invite = await this.invitations.getPendingInviteOrThrow(token);
      this.logger.log(`✅ Valid invite found: id=${invite.id}, email=${invite.email}, companyId=${invite.companyId}`);

      // 2) Проверка, что пользователь ещё не существует
      const existing = await this.usersService.findByEmail(invite.email);
      if (existing) {
        this.logger.error(`User already exists: email=${invite.email}`);
        throw new InvalidTokenException(); // email уже занят
      }

      // 3) Создание пользователя через бизнес-сервис
      this.logger.debug(`Creating user: email=${invite.email}, roleId=${invite.roleId}`);
      const createPayload: any = {
        email: invite.email,
        password,
        firstName,
        lastName,
        phone,
        company_id: invite.companyId,
        role_id: invite.roleId,
      };

      const created = await this.usersBusinessService.createUser(createPayload, invite.invitedByUserId, {
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      });

      this.logger.log(`✅ User created: id=${(created as any).id}, email=${invite.email}`);

      // 4) Отмечаем инвайт как принятый
      await this.invitations.consumeInvite(token, (created as any).id);
      this.logger.log(`✅ Invite consumed: id=${invite.id}`);

      // 5) Автологин: выдаём токены
      this.logger.debug(`Generating tokens for new user: id=${(created as any).id}`);
      const { tokens, user } = await this.generateTokens({ id: (created as any).id }, userAgent || '', ipAddress || '');

      // 6) Аудит
      await this.auditService.logRegistration({
        userId: (created as any).id,
        companyId: invite.companyId,
        ipAddress,
        userAgent,
        details: {
          email: this.maskEmail(invite.email),
          registrationType: 'invite',
          invitedBy: invite.invitedByUserId,
        },
      });

      this.logger.log(`✅ Register by invite completed successfully: userId=${(created as any).id}, email=${invite.email}`);

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn as any,
        deviceId: tokens.deviceId,
      };
    } catch (error) {
      this.logger.error(`Register by invite failed: ${error?.message || String(error)}`);
      
      await this.auditService.log(AuditAction.USER_REGISTERED, {
        details: { reason: 'invite_registration_failed', error: error?.message || String(error) },
        ipAddress,
        userAgent,
        status: 'error',
        level: AuditLevel.ERROR,
      });
      throw error;
    }
  }

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

      await this.sessionService.removeSessionByJti(payload.sub, session.deviceId, payload.jti!);

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
          twoFactorEnabled: user.twoFactorEnabled,
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
      const deactivatedCount = await this.sessionService.removeAllUserSessions(userId);
      await this.auditService.logAllDevicesLogout({
        userId,
        ipAddress,
        userAgent,
        deviceId: currentDeviceId,
        details: { excludedCurrentDevice: false, deactivatedCount },
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
