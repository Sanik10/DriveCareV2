import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from '../services/session.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private sessionService: SessionService,
    private securityService: SecurityService
  ) {
    super();
  }

  // ✅ ИСПРАВЛЕНО #8: дополнительные проверки безопасности
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await super.canActivate(context);
    if (!result) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ✅ ДОБАВЛЕНО: дополнительная проверка сессии
    if (user.sessionId) {
      const isSessionActive = await this.sessionService.isSessionActive(user.sessionId);
      if (!isSessionActive) {
        throw new UnauthorizedException('Session expired');
      }
    }

    // ✅ ДОБАВЛЕНО: проверка подозрительной активности
    const ipAddress = request.ip || '';
    const isBlocked = await this.securityService.checkFailedLoginAttempts(user.email, ipAddress);
    if (isBlocked) {
      throw new UnauthorizedException('Access temporarily blocked');
    }

    return true;
  }

  // ✅ ДОБАВЛЕНО: обработка ошибок
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
