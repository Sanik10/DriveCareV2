// path: apps/backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InvalidCredentialsException, InactiveUserException, TooManyAttemptsException, InvalidTokenException } from '../../common/exceptions/custom-exceptions';
import { UsersService } from '../users/users.service';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { AuditService, AuditAction, AuditLevel } from '../../common/audit/audit.service';
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
      if (ipAddress) {
        const loginBlocked = await this.securityService.checkFailedLoginAttempts(email, ipAddress);
        if (loginBlocked) {
          await this.auditService.logLoginFailed({ details: { email: this.maskEmail(email), reason: 'IP temporarily blocked' }, ipAddress, userAgent, level: AuditLevel.WARNING });
          throw new TooManyAttemptsException();
        }
      }

      const user = await this.usersService.findByEmail(email);
      if (!user) {
        if (ipAddress) await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        await this.auditService.logLoginFailed({ details: { email: this.maskEmail(email), reason: 'User not found' }, ipAddress, userAgent });
        throw new InvalidCredentialsException();
      }

      if (!user.isActive) {
        await this.auditService.logLoginFailed({ userId: user.id, companyId: user.company_id, details: { email: this.maskEmail(email), reason: 'User inactive' }, ipAddress, userAgent });
        throw new InactiveUserException();
      }

      const isPasswordValid = await this.usersService.comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        if (ipAddress) await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        await this.auditService.logLoginFailed({ userId: user.id, companyId: user.company_id, details: { email: this.maskEmail(email), reason: 'Invalid password' }, ipAddress, userAgent });
        throw new InvalidCredentialsException();
      }

      if (user.twoFactorEnabled) {
        if (ipAddress) {
          const twoFaBlocked = await this.securityService.checkTwoFaBlocked(email, ipAddress);
          if (twoFaBlocked) {
            await this.auditService.logLoginFailed({ userId: user.id, companyId: user.company_id, details: { email: this.maskEmail(email), reason: '2FA temporarily blocked' }, ipAddress, userAgent, level: AuditLevel.WARNING });
            throw new TooManyAttemptsException();
          }
        }
        const ok = !!twoFactorCode && (await this.twoFA.verify(user.id, twoFactorCode));
        if (!ok) {
          if (ipAddress) await this.securityService.recordTwoFaFailedAttempt(email, ipAddress);
          await this.auditService.logLoginFailed({ userId: user.id, companyId: user.company_id, details: { email: this.maskEmail(email), reason: '2FA required or invalid' }, ipAddress, userAgent });
          throw new UnauthorizedException('Требуется код 2FA или он неверен');
        }
      }

      await this.usersService.upgradePasswordHashIfNeeded(user.id, password, user.password_hash);

      if (ipAddress) {
        await this.securityService.resetFailedLoginAttempts(email, ipAddress);
        await this.securityService.resetTwoFaAttempts(email, ipAddress);
      }

      return user;
    } catch (error) {
      if (!(error instanceof InvalidCredentialsException) && !(error instanceof InactiveUserException) && !(error instanceof TooManyAttemptsException) && !(error instanceof UnauthorizedException)) {
        await this.auditService.log(AuditAction.USER_LOGIN_FAILED, { details: { email: this.maskEmail(email), error: error?.message || String(error) }, ipAddress, userAgent, level: AuditLevel.ERROR, status: 'error' });
      }
      throw error;
    }
  }

  async generateTokens(user: any, userAgent: string, ipAddress: string) {
    await this.usersService.updateLastLogin(user.id);
    const fullUser = await this.usersService.findById(user.id);

    const { sessionId, deviceId, expiresInSecs } = await this.sessionService.createSession(fullUser, userAgent, ipAddress);

    await this.auditService.logLogin({
      userId: fullUser.id,
      companyId: fullUser.company_id,
      ipAddress,
      userAgent,
      deviceId,
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
      sessionId,
      deviceId,
      expiresInSecs,
    };
  }

  async registerCompany(registerDto: RegisterCompanyDto, ipAddress?: string, userAgent?: string) {
    try {
      const result = await this.companyOnboardingService.createCompanyWithOwner(registerDto);
      await this.auditService.logRegistration({ userId: result.owner.id, companyId: result.company.id, ipAddress, userAgent, details: { email: this.maskEmail(result.owner.email), companyName: result.company.name, registrationType: 'company_creation', pdnConsent: true, policyVersion: '1.0' } });
      return result;
    } catch (error) {
      await this.auditService.log(AuditAction.USER_REGISTERED, { details: { email: this.maskEmail(registerDto.ownerEmail), companyName: registerDto.companyName, error: error?.message || String(error) }, ipAddress, userAgent, level: AuditLevel.ERROR, status: 'error' });
      throw error;
    }
  }

  async registerByInvite(registerDto: RegisterInviteDto, ipAddress?: string, userAgent?: string) {
    const dto: any = registerDto;
    if (!dto.token || !dto.password) throw new InvalidTokenException();

    try {
      const invite = await this.invitations.getPendingInviteOrThrow(dto.token);
      const existing = await this.usersService.findByEmail(invite.email);
      if (existing) throw new InvalidTokenException();

      const createPayload: any = { email: invite.email, password: dto.password, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, company_id: invite.companyId, role_id: invite.roleId };
      const created = await this.usersBusinessService.createUser(createPayload, invite.invitedByUserId, { ipAddress: ipAddress || '', userAgent: userAgent || '' });

      await this.invitations.consumeInvite(dto.token, (created as any).id);

      const sessionResult = await this.generateTokens({ id: (created as any).id }, userAgent || '', ipAddress || '');

      await this.auditService.logRegistration({ userId: (created as any).id, companyId: invite.companyId, ipAddress, userAgent, details: { email: this.maskEmail(invite.email), registrationType: 'invite', invitedBy: invite.invitedByUserId } });

      return sessionResult;
    } catch (error) {
      await this.auditService.log(AuditAction.USER_REGISTERED, { details: { reason: 'invite_registration_failed', error: error?.message || String(error) }, ipAddress, userAgent, status: 'error', level: AuditLevel.ERROR });
      throw error;
    }
  }

  async logoutSession(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    try {
      await this.sessionService.removeSession(sessionId);
      await this.auditService.logLogout({ userId, ipAddress, userAgent });
      return { success: true };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_LOGOUT, { userId, ipAddress, userAgent, details: { error: error?.message || String(error) }, status: 'error', level: AuditLevel.ERROR });
      throw error;
    }
  }

  async logoutDevice(userId: string, logoutDeviceDto: LogoutDeviceDto, ipAddress?: string, userAgent?: string) {
    try {
      const sessionsCount = await this.sessionService.removeDeviceSessions(userId, logoutDeviceDto.deviceId);
      await this.auditService.logDeviceLogout({ userId, ipAddress, userAgent, deviceId: logoutDeviceDto.deviceId, details: { sessionsCount } });
      return { success: true, message: 'Устройство успешно отключено' };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_DEVICE_LOGOUT, { userId, ipAddress, userAgent, deviceId: logoutDeviceDto.deviceId, details: { error: error?.message || String(error) }, status: 'error', level: AuditLevel.ERROR });
      throw error;
    }
  }

  async logoutAllDevices(userId: string, currentSessionId?: string, ipAddress?: string, userAgent?: string) {
    try {
      const deactivatedCount = await this.sessionService.removeAllUserSessions(userId, currentSessionId);
      await this.auditService.logAllDevicesLogout({ userId, ipAddress, userAgent, details: { excludedCurrentDevice: false, deactivatedCount } });
      return { success: true, message: 'Выход выполнен со всех устройств', deactivatedCount };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_ALL_DEVICES_LOGOUT, { userId, ipAddress, userAgent, details: { error: error?.message || String(error) }, status: 'error', level: AuditLevel.ERROR });
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
    const safeDomainName = parts[0].length <= 2 ? '*'.repeat(parts[0].length) : parts[0][0] + '*'.repeat(parts[0].length - 2) + parts[0][parts[0].length - 1];
    return `${safeName}@${safeDomainName}.${parts.slice(1).join('.')}`;
  }
}
