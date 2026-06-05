// path: apps/backend/src/modules/auth/auth.controller.ts
import { Body, Controller, Post, Req, UseGuards, Get, HttpCode, HttpStatus, UsePipes, ForbiddenException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiTooManyRequestsResponse, ApiConflictResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/request/login.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';
import { LoginResponseDto, UserDto } from './dto/response/login-response.dto';
import { RegisterCompanyResponseDto } from './dto/response/register-company-response.dto';
import { LogoutResponseDto } from './dto/response/logout-response.dto';
import { ProfileResponseDto } from '../users/dto/response/profile-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { ConfigService } from '@nestjs/config';
import { TwoFAService } from './services/twofa.service';

type SameSiteOpt = 'lax' | 'strict' | 'none';

@ApiTags('🔐 Аутентификация')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private config: ConfigService,
    private twoFA: TwoFAService,
  ) {}

  private resolveCookieSecurity(): { secure: boolean; sameSite: SameSiteOpt } {
    const env = (this.config.get<string>('NODE_ENV') || 'development').toLowerCase();
    const isProd = env === 'production';
    const sameSite = (this.config.get<string>('COOKIE_SAMESITE', 'strict') || 'strict').toLowerCase() as SameSiteOpt;
    const rawSecure = this.config.get<string>('COOKIE_SECURE');
    let secure = typeof rawSecure === 'string' ? rawSecure.toLowerCase() === 'true' : isProd;
    if (sameSite === 'none') secure = true;
    return { secure, sameSite };
  }

  private setSessionCookie(res: Response, sid: string, maxAgeSecs: number) {
    const { secure, sameSite } = this.resolveCookieSecurity();
    const domain = this.config.get<string>('COOKIE_DOMAIN')?.trim();
    
    res.cookie('sid', sid, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: maxAgeSecs * 1000,
      ...(domain ? { domain } : {}),
    });
    res.setHeader('Cache-Control', 'no-store');
  }

  private clearSessionCookie(res: Response) {
    const { secure, sameSite } = this.resolveCookieSecurity();
    const domain = this.config.get<string>('COOKIE_DOMAIN')?.trim();

    res.clearCookie('sid', {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(domain ? { domain } : {}),
    });
  }

  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() _loginDto: LoginDto, @Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req as any).ip || '';
    const fullUser = await this.usersService.findById(req.user.id);
    const result = await this.authService.generateTokens(fullUser, userAgent, ipAddress);
    
    this.setSessionCookie(res, result.sessionId, result.expiresInSecs);
    return { user: result.user } as any;
  }

  @ApiOperation({ summary: '🏢 Регистрация новой компании с владельцем' })
  @ApiBody({ type: RegisterCompanyDto })
  @Throttle({ strict: { limit: 3, ttl: 300_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.CREATED)
  @Post('register-company')
  async registerCompany(@Body() registerDto: RegisterCompanyDto, @Req() req: any): Promise<RegisterCompanyResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    return this.authService.registerCompany(registerDto, ipAddress, userAgent);
  }

  @ApiOperation({ summary: '📨 Регистрация по приглашению' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.CREATED)
  @Post('register-invite')
  async registerByInvite(@Body() registerDto: RegisterInviteDto, @Req() req: any, @Res({ passthrough: true }) res: Response): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const result = await this.authService.registerByInvite(registerDto, ipAddress, userAgent);
    
    this.setSessionCookie(res, result.sessionId, result.expiresInSecs);
    return { user: result.user } as any;
  }

  @ApiOperation({ summary: 'Проверка активности сессии' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(): Promise<{ success: boolean }> {
    return { success: true };
  }

  @ApiOperation({ summary: 'Выход из системы' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LogoutResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    this.clearSessionCookie(res);
    if (req.user.sessionId) {
      await this.authService.logoutSession(req.user.id, req.user.sessionId, ipAddress, userAgent);
    }
    return { success: true };
  }

  @ApiOperation({ summary: 'Выход с конкретного устройства' })
  @ApiBody({ type: LogoutDeviceDto })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('logout-device')
  async logoutDevice(@Body() logoutDeviceDto: LogoutDeviceDto, @Req() req: RequestWithUser): Promise<LogoutResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    return this.authService.logoutDevice(req.user.id, logoutDeviceDto, ipAddress, userAgent);
  }

  @ApiOperation({ summary: 'Выход со всех устройств' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: { limit: 2, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('logout-all-devices')
  async logoutAllDevices(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LogoutResponseDto & { deactivatedCount: number }> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    this.clearSessionCookie(res);
    return this.authService.logoutAllDevices(req.user.id, req.user.sessionId, ipAddress, userAgent);
  }

  @ApiOperation({ summary: 'Список активных сессий' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  @Get('sessions')
  async getUserSessions(@Req() req: RequestWithUser) {
    return this.authService.getUserSessions(req.user.id);
  }

  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('me')
  async getProfile(@Req() req: RequestWithUser): Promise<ProfileResponseDto> {
    const fullUser = await this.usersService.findById(req.user.id);
    return {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        phone: fullUser.phone,
        specialization: fullUser.specialization,
        isActive: fullUser.isActive,
        role: { id: fullUser.role.id, name: fullUser.role.name },
        company_id: fullUser.company_id,
        twoFactorEnabled: fullUser.twoFactorEnabled,
        createdAt: fullUser.createdAt,
        lastLoginAt: fullUser.lastLoginAt,
      },
    } as any;
  }

  @ApiOperation({ summary: '2FA: подготовка (секрет и otpauth URL)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async twoFaSetup(@Req() req: RequestWithUser) {
    return this.twoFA.generateSetup(req.user.id, req.user.email);
  }

  @ApiOperation({ summary: '2FA: включить' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async twoFaEnable(@Req() req: RequestWithUser, @Body('secret') secret: string, @Body('code') code: string) {
    await this.twoFA.saveSecret(req.user.id, secret);
    return this.twoFA.enable(req.user.id, code);
  }

  @ApiOperation({ summary: '2FA: отключить' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async twoFaDisable(@Req() req: RequestWithUser, @Body('code') code: string) {
    return this.twoFA.disable(req.user.id, code);
  }

  @ApiOperation({ summary: '👑 Список пользователей (мульти-тенант)' })
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'company_owner', 'superadmin', 'platform_admin')
  @Get('users')
  async getUsers(@Req() req: RequestWithUser): Promise<UserDto[]> {
    const userRole = req.user.role;
    if (['superadmin', 'platform_admin'].includes(userRole)) {
      return this.usersService.findAll();
    }
    if (!req.user.companyId) {
      throw new ForbiddenException('У вас нет доступа к пользователям');
    }
    return this.usersService.findByCompanyId(req.user.companyId);
  }
}
