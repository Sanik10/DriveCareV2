import { 
  Body, 
  Controller, 
  Post, 
  Req, 
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  HttpException
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
  ApiBadRequestResponse
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

// Сервисы
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// DTO
import { LoginDto } from './dto/request/login.dto';
import { RegisterCompanyDto } from './dto/request/register-company.dto';
import { RegisterInviteDto } from './dto/request/register-invite.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { LogoutDeviceDto } from './dto/request/logout-device.dto';

// Response DTO
import { LoginResponseDto } from './dto/response/login-response.dto';
import { RegisterCompanyResponseDto } from './dto/response/register-company-response.dto';
import { RefreshTokenResponseDto } from './dto/response/refresh-token-response.dto';
import { LogoutResponseDto } from './dto/response/logout-response.dto';
import { UserDto } from './dto/response/login-response.dto';
import { ProfileResponseDto } from '../users/dto/response/profile-response.dto';

// Guards и decorators
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('🔐 Аутентификация')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @ApiOperation({ 
    summary: 'Вход в систему',
    description: 'Аутентификация пользователя по email и паролю. Возвращает JWT токены и информацию о пользователе.'
  })
  @ApiBody({
    type: LoginDto,
    description: 'Данные для входа в систему',
    examples: {
      owner: {
        summary: 'Вход владельца компании',
        description: 'Вход владельца автосервиса',
        value: {
          email: 'owner@autoservice.com',
          password: 'securePassword123'
        }
      },
      superadmin: {
        summary: 'Вход суперадминистратора',
        description: 'Вход системного администратора',
        value: {
          email: 'superadmin@drivecare.com',
          password: 'superSecretPassword'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Успешный вход в систему',
    type: LoginResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Неверные учетные данные',
    example: { message: 'Invalid credentials', statusCode: 401 }
  })
  @ApiForbiddenResponse({ 
    description: '❌ Пользователь заблокирован',
    example: { message: 'User inactive', statusCode: 403 }
  })
  @ApiTooManyRequestsResponse({ 
    description: '⚠️ Слишком много попыток входа (лимит: 10 в минуту)',
    example: { message: 'Too many requests', statusCode: 429 }
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: RequestWithUser): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    const fullUser = await this.usersService.findById(req.user.id);
    return this.authService.generateTokens(fullUser, userAgent, ipAddress);
  }

  @ApiOperation({ 
    summary: '🏢 Регистрация новой компании с владельцем',
    description: 'Создание новой компании и первого пользователя-владельца. Автоматически создаются системные роли для компании.'
  })
  @ApiBody({
    type: RegisterCompanyDto,
    description: 'Данные для создания компании и владельца',
    examples: {
      autoservice: {
        summary: 'Создание автосервиса',
        description: 'Полный пример создания новой компании автосервиса',
        value: {
          companyName: 'АвтоСервис "Профи"',
          companyLegalName: 'ООО "АвтоСервис Профи"',
          companyEmail: 'info@autoservice-profi.ru',
          companyAddress: 'г. Москва, ул. Автомобильная, д. 15',
          companyPhone: '+7 (495) 123-45-67',
          ownerEmail: 'owner@autoservice-profi.ru',
          ownerPassword: 'securePassword123',
          ownerFirstName: 'Иван',
          ownerLastName: 'Петров',
          ownerPhone: '+7 (999) 123-45-67'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: '✅ Компания и владелец успешно созданы',
    type: RegisterCompanyResponseDto
  })
  @ApiConflictResponse({ 
    description: '❌ Пользователь с таким email уже существует',
    example: { message: 'User already exists', statusCode: 409 }
  })
  @ApiBadRequestResponse({ 
    description: '❌ Некорректные данные',
    example: { message: 'Validation failed', statusCode: 400 }
  })
  @ApiTooManyRequestsResponse({ 
    description: '⚠️ Слишком много попыток регистрации (лимит: 3 в минуту)',
    example: { message: 'Too many requests', statusCode: 429 }
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register-company')
  async registerCompany(@Body() registerDto: RegisterCompanyDto, @Req() req: Request): Promise<RegisterCompanyResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    return this.authService.registerCompany(registerDto, ipAddress, userAgent);
  }

  @ApiOperation({ 
	summary: '📨 Регистрация по приглашению (в разработке)',
	description: 'Присоединение к существующей компании по коду приглашения. Функция пока в разработке.'
	})
	@ApiBody({
	type: RegisterInviteDto,
	description: 'Данные для регистрации по приглашению',
	examples: {
		mechanic: {
		summary: 'Регистрация механика',
		description: 'Присоединение механика к компании',
		value: {
			inviteCode: '123e4567-e89b-12d3-a456-426614174000',
			email: 'mechanic@autoservice.com',
			password: 'securePassword123',
			firstName: 'Петр',
			lastName: 'Сидоров',
			phone: '+7 (999) 987-65-43',
			specialization: 'Моторист'
		}
		}
	}
	})
	@ApiResponse({ 
	status: 501, 
	description: '🚧 Функция в разработке',
	example: { 
		message: 'Система приглашений пока не реализована. Пожалуйста, обратитесь к администратору для создания аккаунта.',
		statusCode: 501 
	}
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@HttpCode(HttpStatus.NOT_IMPLEMENTED)
	@Post('register-invite')
	async registerByInvite(@Body() registerDto: RegisterInviteDto, @Req() req: Request) {
	const userAgent = req.headers['user-agent'] || '';
	const ipAddress = req.ip || '';
	
	// Возвращаем понятную ошибку 501 (Not Implemented)
	throw new HttpException(
		'Система приглашений пока не реализована. Пожалуйста, обратитесь к администратору для создания аккаунта.',
		HttpStatus.NOT_IMPLEMENTED
	);
  }

  @ApiOperation({ 
    summary: 'Обновление JWT токена',
    description: 'Получение нового access токена с помощью refresh токена'
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh токен для обновления',
    examples: {
      example1: {
        summary: 'Пример refresh токена',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Токен успешно обновлен',
    type: RefreshTokenResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Недействительный refresh токен',
    example: { message: 'Invalid token', statusCode: 401 }
  })
  @ApiTooManyRequestsResponse({ 
    description: '⚠️ Слишком много запросов на обновление (лимит: 20 в минуту)',
    example: { message: 'Too many requests', statusCode: 429 }
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request): Promise<RefreshTokenResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    return this.authService.refreshToken(refreshTokenDto, userAgent, ipAddress);
  }

  @ApiOperation({ 
    summary: 'Выход из системы',
    description: 'Выход из текущей сессии. Деактивирует refresh токен.'
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh токен текущей сессии',
    examples: {
      example1: {
        summary: 'Пример logout запроса',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Успешный выход из системы',
    type: LogoutResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() { refreshToken }: RefreshTokenDto, @Req() req: RequestWithUser): Promise<LogoutResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    return this.authService.logout(req.user.id, refreshToken, ipAddress, userAgent);
  }

  @ApiOperation({ 
    summary: 'Выход с конкретного устройства',
    description: 'Деактивация всех сессий на указанном устройстве'
  })
  @ApiBody({
    type: LogoutDeviceDto,
    description: 'ID устройства для выхода',
    examples: {
      example1: {
        summary: 'Пример отключения устройства',
        value: {
          deviceId: 'device-uuid-123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Устройство успешно отключено',
    type: LogoutResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-device')
  async logoutDevice(@Body() logoutDeviceDto: LogoutDeviceDto, @Req() req: RequestWithUser): Promise<LogoutResponseDto> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    return this.authService.logoutDevice(req.user.id, logoutDeviceDto, ipAddress, userAgent);
  }

  @ApiOperation({ 
    summary: 'Выход со всех устройств',
    description: 'Деактивация всех сессий пользователя (кроме текущей)'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Выход выполнен со всех устройств',
    example: { 
      success: true, 
      message: 'Выход выполнен со всех устройств',
      deactivatedCount: 3
    }
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all-devices')
  async logoutAllDevices(@Req() req: RequestWithUser): Promise<LogoutResponseDto & { deactivatedCount: number }> {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    
    const currentDeviceId = req.user.deviceId;
    return this.authService.logoutAllDevices(req.user.id, currentDeviceId, ipAddress, userAgent);
  }

  @ApiOperation({ 
    summary: 'Список активных сессий',
    description: 'Получение списка всех активных сессий пользователя'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Список активных сессий',
    example: [
      {
        id: 'session-123',
        deviceId: 'device-uuid-123',
        deviceName: 'iPhone 13 Pro (iOS)',
        deviceInfo: {
          type: 'mobile',
          model: 'iPhone',
          os: 'iOS 17.0',
          browser: 'Safari 17.0'
        },
        ipAddress: '192.168.1.100',
        lastActive: '2025-01-01T12:00:00Z',
        createdAt: '2025-01-01T10:00:00Z'
      }
    ]
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getUserSessions(@Req() req: RequestWithUser) {
    return this.authService.getUserSessions(req.user.id);
  }

  @ApiOperation({ 
    summary: 'Профиль текущего пользователя',
    description: 'Получение полной информации о текущем авторизованном пользователе'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Профиль пользователя',
    type: ProfileResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
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
        isActive: fullUser.isActive,
        role: fullUser.role,
        company_id: fullUser.company_id,
        createdAt: fullUser.createdAt,
      }
    };
  }

  @ApiOperation({ 
    summary: '👑 Список всех пользователей (только для админов и суперадмина)',
    description: 'Получение списка всех пользователей в системе. Доступно администраторам и суперадмину.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Список пользователей',
    type: [UserDto]
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Требуется авторизация',
    example: { message: 'Unauthorized', statusCode: 401 }
  })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав (требуется роль admin или superadmin)',
    example: { message: 'У вас нет прав для выполнения этого действия', statusCode: 403 }
  })
  @ApiTooManyRequestsResponse({ 
    description: '⚠️ Слишком много запросов (лимит: 30 в минуту)',
    example: { message: 'Too many requests', statusCode: 429 }
  })
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get('users')
  async getUsers(): Promise<UserDto[]> {
    return this.usersService.findAll();
  }
}