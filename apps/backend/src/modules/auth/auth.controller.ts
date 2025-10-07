// path: apps/backend/src/modules/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
  UsePipes,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

// Services
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// DTO
import { LoginDto } from './dto/request/login.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';

// Response DTO
import { LoginResponseDto } from './dto/response/login-response.dto';
import { RegisterCompanyResponseDto } from './dto/response/register-company-response.dto';
import { RefreshTokenResponseDto } from './dto/response/refresh-token-response.dto';
import { LogoutResponseDto } from './dto/response/logout-response.dto';
import { UserDto } from './dto/response/login-response.dto';
import { ProfileResponseDto } from '../users/dto/response/profile-response.dto';

// Guards and decorators
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { RequestWithUser } from './interfaces/request-with-user.interface';

// Security pipe
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

  private getApiAuthPath(): string {
    const apiPrefix = (this.config.get<string>('API_PREFIX', 'api/v1') || 'api/v1').replace(/^\/+|\/+$/g, '');
    return `/${apiPrefix}/auth`;
  }

  private getCookieDomain(): string | undefined {
    const domain = (this.config.get<string>('COOKIE_DOMAIN') || '').trim();
    return domain.length > 0 ? domain : undefined;
  }

  private resolveCookieSecurity(): { secure: boolean; sameSite: SameSiteOpt } {
    const env = (this.config.get<string>('NODE_ENV') || 'development').toLowerCase();
    const isProd = env === 'production';
    const sameSite = (this.config.get<string>('COOKIE_SAMESITE', 'strict') || 'strict').toLowerCase() as SameSiteOpt;

    const rawSecure = this.config.get<string>('COOKIE_SECURE');
    let secure =
      typeof rawSecure === 'string'
        ? rawSecure.toLowerCase() === 'true'
        : isProd;

    if (sameSite === 'none') {
      secure = true;
    }
    return { secure, sameSite };
  }

  private setRtCookie(res: Response, token: string) {
    const maxAge = this.config.get<number>('RT_COOKIE_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1000);
    const { secure, sameSite } = this.resolveCookieSecurity();
    const path = this.getApiAuthPath();
    const domain = this.getCookieDomain();

    res.cookie('rt', token, {
      httpOnly: true,
      secure,
      sameSite,
      path,
      maxAge,
      ...(domain ? { domain } : {}),
    });
    res.setHeader('Cache-Control', 'no-store');
  }

  private clearRtCookie(res: Response) {
    const { secure, sameSite } = this.resolveCookieSecurity();
    const path = this.getApiAuthPath();
    const domain = this.getCookieDomain();

    res.clearCookie('rt', {
      httpOnly: true,
      secure,
      sameSite,
      path,
      ...(domain ? { domain } : {}),
    });
  }

  private assertRefreshRequestOriginAllowed(req: any) {
    const originsEnv = (this.config.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173') || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || '').trim();
    const allowed = new Set<string>([...originsEnv, ...(frontendUrl ? [frontendUrl] : [])].map((o) => o.replace(/\/+$/, '')));

    const origin = (req.headers?.origin as string | undefined)?.replace(/\/+$/, '');
    const referer = (req.headers?.referer as string | undefined)?.replace(/\/+$/, '');

    if (origin) {
      if (!allowed.has(origin)) {
        throw new ForbiddenException('Cross-origin refresh is not allowed');
      }
      return;
    }

    if (referer) {
      const ok = Array.from(allowed).some((o) => referer.startsWith(o));
      if (!ok) {
        throw new ForbiddenException('Cross-origin refresh is not allowed (referer)');
      }
      return;
    }
  }

  @ApiOperation({
    summary: 'Вход в систему',
    description: 'Аутентификация пользователя. Access в JSON, refresh — в HttpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '✅ Успешный вход', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Неверные учетные данные' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много попыток входа (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() _loginDto: LoginDto, @Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req as any).ip || '';
    const fullUser = await this.usersService.findById(req.user.id);
    const { tokens, user } = await this.authService.generateTokens(fullUser, userAgent, ipAddress);
    this.setRtCookie(res, tokens.refreshToken);
    // Добавим refreshToken в тело ответа для совместимости фронта (в dev)
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn as any,
      deviceId: tokens.deviceId,
    } as any;
  }

  @ApiOperation({ summary: '🏢 Регистрация новой компании с владельцем' })
  @ApiBody({ type: RegisterCompanyDto })
  @ApiResponse({ status: 201, description: '✅ Компания и владелец созданы', type: RegisterCompanyResponseDto })
  @ApiConflictResponse({ description: '❌ Пользователь с таким email уже существует' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много попыток регистрации (лимит: 3 в минуту)' })
  @Throttle({ strict: { limit: 3, ttl: 300_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.CREATED)
  @Post('register-company')
  async registerCompany(@Body() registerDto: RegisterCompanyDto, @Req() req: any): Promise<RegisterCompanyResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || '';
    return this.authService.registerCompany(registerDto, ipAddress, userAgent);
  }

  @ApiOperation({ summary: '📨 Регистрация по приглашению', description: 'Создание пользователя по инвайту + автологин' })
  @ApiResponse({ status: 201, description: '✅ Пользователь создан и авторизован', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или истёкший токен приглашения' })
  @ApiConflictResponse({ description: '❌ Пользователь с таким email уже существует' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много попыток регистрации (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.CREATED)
  @Post('register-invite')
  async registerByInvite(
    @Body() registerDto: RegisterInviteDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const result = await this.authService.registerByInvite(registerDto, ipAddress, userAgent);
    this.setRtCookie(res, result.refreshToken);
    return result as any;
  }

  @ApiOperation({ summary: 'Обновление access по refresh (HttpOnly cookie)' })
  @ApiResponse({ status: 200, description: '✅ Токен обновлен', type: RefreshTokenResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Недействительный refresh токен' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(@Req() req: any, @Res({ passthrough: true }) res: Response): Promise<RefreshTokenResponseDto> {
    this.assertRefreshRequestOriginAllowed(req);

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const rt = req.cookies?.rt;
    const result = await this.authService.refreshTokenRaw(rt, userAgent, ipAddress);
    this.setRtCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn as any,
      deviceId: result.tokens.deviceId,
    } as any;
  }

  @ApiOperation({ summary: 'Выход из системы (по cookie RT)' })
  @ApiResponse({ status: 200, description: '✅ Выход выполнен', type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(EnhancedValidationPipe)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LogoutResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const rt = (req as any).cookies?.rt;
    this.clearRtCookie(res);
    if (rt) {
      await this.authService.logoutByRt(req.user.id, rt, ipAddress, userAgent);
    }
    return { success: true };
  }

  @ApiOperation({ summary: 'Выход с конкретного устройства' })
  @ApiBody({ type: LogoutDeviceDto })
  @ApiResponse({ status: 200, description: '✅ Устройство отключено', type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
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
  @ApiResponse({ status: 200, description: '✅ Выход выполнен со всех устройств' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: { limit: 2, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('logout-all-devices')
  async logoutAllDevices(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<LogoutResponseDto & { deactivatedCount: number }> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    this.clearRtCookie(res);
    return this.authService.logoutAllDevices(req.user.id, undefined, ipAddress, userAgent);
  }

  @ApiOperation({ summary: 'Список активных сессий' })
  @ApiResponse({ status: 200, description: '✅ Список активных сессий' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  @Get('sessions')
  async getUserSessions(@Req() req: RequestWithUser) {
    return this.authService.getUserSessions(req.user.id);
  }

  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: '✅ Профиль', type: ProfileResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
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

  @ApiOperation({
    summary: '👑 Список пользователей (мульти-тенант)',
    description: 'SuperAdmin — всех; остальные — только свою компанию.',
  })
  @ApiResponse({ status: 200, description: '✅ Список пользователей', type: [UserDto] })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
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
