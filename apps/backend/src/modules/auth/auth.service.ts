import { Injectable } from '@nestjs/common';
import { 
  InvalidCredentialsException,
  InactiveUserException,
  TooManyAttemptsException,
  InvalidTokenException
} from '../../common/exceptions/custom-exceptions';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/request/login.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { AuditService, AuditAction, AuditLevel } from '../../common/audit/audit.service';
import { RegisterCompanyResponseDto } from './dto/response/register-company-response.dto';

// Импорты наших новых сервисов
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private securityService: SecurityService,
    private companyOnboardingService: CompanyOnboardingService,
  ) {}

  // Валидация пользователя для LocalStrategy
  async validateUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<any> {
    try {
      if (ipAddress) {
        const isBlocked = await this.securityService.checkFailedLoginAttempts(email, ipAddress);
        if (isBlocked) {
          await this.auditService.logLoginFailed({
            details: { email, reason: 'IP temporarily blocked due to multiple failed attempts' },
            ipAddress,
            userAgent,
            level: AuditLevel.WARNING,
          });
          throw new TooManyAttemptsException();
        }
      }
      
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        if (ipAddress) {
          await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        }
        
        await this.auditService.logLoginFailed({
          details: { email, reason: 'User not found' },
          ipAddress,
          userAgent,
        });
        throw new InvalidCredentialsException();
      }
      
      if (!user.isActive) {
        if (ipAddress) {
          await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        }
        
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email, reason: 'User inactive' },
          ipAddress,
          userAgent,
        });
        throw new InactiveUserException();
      }
      
      const isPasswordValid = await this.usersService.comparePasswords(password, user.password_hash);
      
      if (!isPasswordValid) {
        if (ipAddress) {
          await this.securityService.recordFailedLoginAttempt(email, ipAddress);
        }
        
        await this.auditService.logLoginFailed({
          userId: user.id,
          companyId: user.company_id,
          details: { email, reason: 'Invalid password' },
          ipAddress,
          userAgent,
        });
        throw new InvalidCredentialsException();
      }
      
      if (ipAddress) {
        await this.securityService.resetFailedLoginAttempts(email, ipAddress);
      }
      
      return user;
    } catch (error) {
      if (!(error instanceof InvalidCredentialsException) && 
          !(error instanceof InactiveUserException) && 
          !(error instanceof TooManyAttemptsException)) {
        await this.auditService.log(AuditAction.USER_LOGIN_FAILED, {
          details: { email, error: error.message },
          ipAddress,
          userAgent,
          level: AuditLevel.ERROR,
          status: 'error',
        });
      }
      throw error;
    }
  }

  // Генерация токенов - используется LocalAuthGuard
  async generateTokens(user: any, userAgent: string, ipAddress: string) {
	await this.usersService.updateLastLogin(user.id);
	
	const fullUser = await this.usersService.findById(user.id);
	const { session, tokens } = await this.sessionService.createSession(fullUser, userAgent, ipAddress);
	
	await this.auditService.logLogin({
		userId: fullUser.id,
		companyId: fullUser.company_id,
		ipAddress,
		userAgent,
		deviceId: tokens.deviceId,
		details: { email: fullUser.email }
	});
	
	return {
		user: {
		id: fullUser.id,
		email: fullUser.email,
		firstName: fullUser.firstName,
		lastName: fullUser.lastName,
		phone: fullUser.phone,
		isActive: fullUser.isActive,
		role: {
			id: fullUser.role.id,
			name: fullUser.role.name,
		},
		company_id: fullUser.company_id,
		createdAt: fullUser.createdAt,
		},
		...tokens,
	};
  }

  // Регистрация компании + владельца
  async registerCompany(registerDto: RegisterCompanyDto, ipAddress?: string, userAgent?: string) {
    try {
      const result = await this.companyOnboardingService.createCompanyWithOwner(registerDto);
      
      await this.auditService.logRegistration({
        userId: result.owner.id,
        companyId: result.company.id,
        ipAddress,
        userAgent,
        details: { 
          email: result.owner.email,
          companyName: result.company.name,
          registrationType: 'company_creation'
        },
      });
      
      return result;
    } catch (error) {
      await this.auditService.log(AuditAction.USER_REGISTERED, {
        details: { 
          email: registerDto.ownerEmail, 
          companyName: registerDto.companyName,
          error: error.message 
        },
        ipAddress,
        userAgent,
        level: AuditLevel.ERROR,
        status: 'error',
      });
      throw error;
    }
  }

  /*
  // Регистрация по приглашению (пока заглушка - реализуем позже)
  async registerByInvite(registerDto: RegisterInviteDto, ipAddress?: string, userAgent?: string) {
	try {
		// TODO: Добавить логику поиска приглашения по inviteCode
		// Пока что выбрасываем ошибку с информативным сообщением
		
		await this.auditService.log(AuditAction.USER_REGISTERED, {
		details: { 
			email: registerDto.email, 
			inviteCode: registerDto.inviteCode,
			error: 'Invite system not implemented yet' 
		},
		ipAddress,
		userAgent,
		level: AuditLevel.WARNING,
		status: 'not_implemented',
		});
		
		throw new Error('Система приглашений пока не реализована. Пожалуйста, обратитесь к администратору для создания аккаунта.');
	} catch (error) {
		await this.auditService.log(AuditAction.USER_REGISTERED, {
		details: { 
			email: registerDto.email, 
			inviteCode: registerDto.inviteCode,
			error: error.message 
		},
		ipAddress,
		userAgent,
		level: AuditLevel.ERROR,
		status: 'error',
		});
		throw error;
	}
  }
*/

  // Остальные методы используют новые сервисы
  async refreshToken(refreshTokenDto: RefreshTokenDto, userAgent: string, ipAddress: string) {
	try {
		const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);
		
		const session = await this.sessionService.findSessionByRefreshToken(payload.sub, refreshTokenDto.refreshToken);
		if (!session) {
		await this.auditService.logTokenRefreshFailed({
			userId: payload.sub,
			ipAddress,
			userAgent,
			details: { reason: 'Session not found or inactive' },
		});
		throw new InvalidTokenException();
		}
		
		const isValidInRedis = await this.sessionService.validateRefreshTokenInRedis(
		payload.sub, 
		session.deviceId, 
		refreshTokenDto.refreshToken
		);
		
		if (!isValidInRedis) {
		await this.auditService.logTokenRefreshFailed({
			userId: payload.sub,
			ipAddress,
			userAgent,
			deviceId: session.deviceId,
			details: { reason: 'Token not found in Redis or mismatch' },
		});
		throw new InvalidTokenException();
		}
		
		const user = await this.usersService.findById(payload.sub);
		
		await this.sessionService.removeSession(payload.sub, refreshTokenDto.refreshToken);
		
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
			role: {
			id: user.role.id,
			name: user.role.name,
			},
			company_id: user.company_id,
			createdAt: user.createdAt,
		},
		...tokens,
		};
	} catch (error) {
		if (!(error instanceof InvalidTokenException)) {
		await this.auditService.log(AuditAction.USER_TOKEN_REFRESH_FAILED, {
			details: { error: error.message },
			ipAddress,
			userAgent,
			level: AuditLevel.ERROR,
			status: 'error',
		});
		}
		throw new InvalidTokenException();
	}
  }

  async logout(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
    try {
      const session = await this.sessionService.findSessionByRefreshToken(userId, refreshToken);
      
      await this.sessionService.removeSession(userId, refreshToken);
      
      if (session) {
        await this.auditService.logLogout({
          userId,
          ipAddress,
          userAgent,
          deviceId: session.deviceId,
        });
      }
      
      return { success: true };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_LOGOUT, {
        userId,
        ipAddress,
        userAgent,
        details: { error: error.message },
        status: 'error',
        level: AuditLevel.ERROR
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
        details: { sessionsCount }
      });
      
      return { success: true, message: 'Устройство успешно отключено' };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_DEVICE_LOGOUT, {
        userId,
        ipAddress,
        userAgent,
        deviceId: logoutDeviceDto.deviceId,
        details: { error: error.message },
        status: 'error',
        level: AuditLevel.ERROR
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
        details: { 
          excludedCurrentDevice: !!currentDeviceId,
          deactivatedCount
        }
      });
      
      return { 
        success: true, 
        message: 'Выход выполнен со всех устройств',
        deactivatedCount
      };
    } catch (error) {
      await this.auditService.log(AuditAction.USER_ALL_DEVICES_LOGOUT, {
        userId,
        ipAddress,
        userAgent,
        deviceId: currentDeviceId,
        details: { error: error.message },
        status: 'error',
        level: AuditLevel.ERROR
      });
      throw error;
    }
  }

  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }
}