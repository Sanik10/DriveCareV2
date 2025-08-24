// path: apps/backend/src/common/interceptors/audit-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditLevel } from '../audit/audit.service';
import { RequestWithUser } from '../../modules/auth/interfaces/request-with-user.interface';

/**
 * 🔍 AUDIT LOGGING INTERCEPTOR
 *
 * Автоматическое логирование всех API requests:
 * ✅ Request/Response audit trails
 * ✅ Performance monitoring
 * ✅ Security event logging
 * ✅ User activity tracking
 * ✅ Error audit logging
 *
 * Важно: не логировать ПДн/секреты в details.
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request & RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const requestInfo = this.extractRequestInfo(request);

    if (this.isSensitiveEndpoint(request)) {
      this.logRequestStart(requestInfo).catch((e) => {
        this.logger.error(`Failed to log request start: ${e.message}`);
      });
    }

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - startTime;
        this.logSuccessfulResponse(requestInfo, response, duration, responseData).catch((e) => {
          this.logger.error(`Failed to log successful response: ${e.message}`);
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logErrorResponse(requestInfo, response, duration, error).catch((e) => {
          this.logger.error(`Failed to log error response: ${e.message}`);
        });
        throw error;
      }),
    );
  }

  private extractRequestInfo(request: Request & RequestWithUser) {
    return {
      method: request.method,
      url: this.sanitizeUrl(request.url),
      correlationId: (request as any).correlationId || request.headers['x-request-id'],
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip || (request.connection as any)?.remoteAddress,
      userId: request.user?.id,
      companyId: request.user?.companyId,
      userRole: request.user?.role,
      contentType: request.headers['content-type'],
      contentLength: request.headers['content-length'],
      safeHeaders: this.sanitizeHeaders(request.headers),
    };
  }

  private isSensitiveEndpoint(request: Request): boolean {
    const sensitiveEndpoints = [
      '/auth/login',
      '/auth/logout',
      '/auth/register',
      '/auth/refresh',
      '/companies',
      '/users',
      '/payments',
      '/subscriptions',
      '/payment-methods',
    ];
    return sensitiveEndpoints.some((endpoint) => request.url.includes(endpoint));
  }

  private async logRequestStart(requestInfo: any): Promise<void> {
    await this.auditService.log(AuditAction.API_REQUEST_STARTED, {
      level: AuditLevel.INFO,
      userId: requestInfo.userId,
      companyId: requestInfo.companyId,
      ipAddress: requestInfo.ipAddress as string,
      userAgent: requestInfo.userAgent as string,
      details: {
        action: 'request_start',
        method: requestInfo.method,
        url: requestInfo.url,
        correlationId: requestInfo.correlationId,
        contentType: requestInfo.contentType,
      },
      status: 'started',
    });
  }

  private async logSuccessfulResponse(requestInfo: any, response: Response, duration: number, responseData: any): Promise<void> {
    const auditAction = this.determineAuditAction(requestInfo, response.statusCode, true);

    await this.auditService.log(auditAction, {
      level: AuditLevel.INFO,
      userId: requestInfo.userId,
      companyId: requestInfo.companyId,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      details: {
        action: 'request_completed',
        method: requestInfo.method,
        url: requestInfo.url,
        statusCode: response.statusCode,
        duration,
        correlationId: requestInfo.correlationId,
        responseSize: this.getResponseSize(responseData),
        hasResponseData: !!responseData,
        headers: requestInfo.safeHeaders,
      },
      status: 'success',
    });

    if (duration > 5000) {
      this.logger.warn(`Slow request detected: ${requestInfo.method} ${requestInfo.url} - ${duration}ms [${requestInfo.correlationId}]`);
    }
  }

  private async logErrorResponse(requestInfo: any, _response: Response, duration: number, error: any): Promise<void> {
    const status = error?.status || 500;
    const auditAction = this.determineAuditAction(requestInfo, status, false);

    await this.auditService.log(auditAction, {
      level: this.getErrorLevel(status),
      userId: requestInfo.userId,
      companyId: requestInfo.companyId,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      details: {
        action: 'request_failed',
        method: requestInfo.method,
        url: requestInfo.url,
        statusCode: status,
        duration,
        correlationId: requestInfo.correlationId,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        headers: requestInfo.safeHeaders,
      },
      status: 'error',
    });
  }

  private determineAuditAction(requestInfo: any, statusCode: number, isSuccess: boolean): AuditAction {
    if (requestInfo.url.includes('/auth/login')) {
      return isSuccess ? AuditAction.USER_LOGIN : AuditAction.USER_LOGIN_FAILED;
    }
    if (requestInfo.url.includes('/auth/logout')) {
      return AuditAction.USER_LOGOUT;
    }
    if (requestInfo.url.includes('/auth/register')) {
      return AuditAction.USER_REGISTERED;
    }
    if (requestInfo.url.includes('/companies') && requestInfo.method === 'POST') {
      return isSuccess ? AuditAction.COMPANY_CREATED : AuditAction.API_ERROR;
    }
    if (requestInfo.url.includes('/users') && requestInfo.method === 'PATCH') {
      return isSuccess ? AuditAction.USER_PROFILE_UPDATED : AuditAction.USER_PROFILE_UPDATE_FAILED;
    }
    if (requestInfo.url.includes('/payments')) {
      if (isSuccess) return AuditAction.PAYMENT_PROCESSED;
      return AuditAction.PAYMENT_FAILED;
    }
    if (requestInfo.url.includes('/subscriptions')) {
      return isSuccess ? AuditAction.SUBSCRIPTION_UPDATED : AuditAction.API_ERROR;
    }

    // По умолчанию: успешные запросы — API_REQUEST_COMPLETED, ошибки — API_ERROR
    return isSuccess ? AuditAction.API_REQUEST_COMPLETED : AuditAction.API_ERROR;
  }

  private getErrorLevel(statusCode: number): AuditLevel {
    if (statusCode >= 500) return AuditLevel.ERROR;
    if (statusCode >= 400) return AuditLevel.WARNING;
    return AuditLevel.INFO;
  }

  private getResponseSize(responseData: any): number {
    try {
      if (!responseData) return 0;
      return Buffer.byteLength(JSON.stringify(responseData), 'utf8');
    } catch {
      return 0;
    }
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/([?&])(password|token|secret|key)=[^&]*/gi, '$1$2=***');
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, string> = {};
    Object.keys(headers).forEach((key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else if (key.toLowerCase().startsWith('x-')) {
        sanitized[key] = Array.isArray(headers[key]) ? (headers[key] as any[]).join(',') : (headers[key] as any);
      }
    });
    // Явно оставляем безопасные служебные X-* заголовки
    if (headers['x-request-id']) sanitized['x-request-id'] = headers['x-request-id'] as string;
    if (headers['x-idempotency-key']) sanitized['x-idempotency-key'] = headers['x-idempotency-key'] as string;
    return sanitized;
  }
}
