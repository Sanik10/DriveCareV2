// path: apps/backend/src/modules/auth/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { SecurityService } from '../services/security.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private sessionService: SessionService,
    private securityService: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const sid = request.cookies?.sid || this.extractTokenFromHeader(request);
    if (!sid) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = await this.sessionService.getSessionPayload(sid);
    if (!payload) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const ipAddress = request.ip || '';
    const isBlocked = await this.securityService.checkFailedLoginAttempts(payload.email, ipAddress);
    if (isBlocked) {
      throw new UnauthorizedException('Access temporarily blocked');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      sessionId: sid,
      deviceId: payload.deviceId,
    };
    
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
