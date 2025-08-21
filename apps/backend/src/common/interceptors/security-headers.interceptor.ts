// path: apps/backend/src/common/interceptors/security-headers.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🛡️ SECURITY HEADERS INTERCEPTOR
 *
 * Добавляет security headers ко всем HTTP responses:
 * - CSP / HSTS / X-Frame-Options / X-Content-Type-Options
 * - Referrer-Policy / Permissions-Policy
 * - Request correlation ID
 * - Cache-Control: no-store для API по умолчанию
 *
 * Важно: не дублировать заголовки, уже выставленные Helmet/CORS.
 */
@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityHeadersInterceptor.name);
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get('NODE_ENV', 'development');
    this.isDevelopment = environment === 'development';
    this.isProduction = environment === 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Correlation ID: использовать входящий или сгенерировать
    const correlationId = (request.headers['x-request-id'] as string) || request.correlationId || uuidv4();
    (request as any).correlationId = correlationId;

    // Базовые заголовки
    this.addBasicSecurityHeaders(response, correlationId);

    return next.handle().pipe(
      tap(() => {
        this.addAdvancedSecurityHeaders(response, request);
        if (this.isDevelopment) {
          this.logger.debug(`Security headers applied for ${request.method} ${request.url} [${correlationId}]`);
        }
      }),
    );
  }

  private addBasicSecurityHeaders(response: Response, correlationId: string): void {
    if (!response.getHeader('X-Request-ID')) response.setHeader('X-Request-ID', correlationId);
    if (!response.getHeader('X-Content-Type-Options')) response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!response.getHeader('X-Frame-Options')) response.setHeader('X-Frame-Options', 'DENY');
    if (!response.getHeader('X-Permitted-Cross-Domain-Policies')) response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // По умолчанию для API — no-store
    if (!response.getHeader('Cache-Control')) response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    if (!response.getHeader('Pragma')) response.setHeader('Pragma', 'no-cache');
    if (!response.getHeader('Expires')) response.setHeader('Expires', '0');
  }

  private addAdvancedSecurityHeaders(response: Response, request: any): void {
    // CSP — только если не установлен Helmet'ом
    if (!response.getHeader('Content-Security-Policy')) {
      const csp = this.buildContentSecurityPolicy();
      response.setHeader('Content-Security-Policy', csp);
    }

    // HSTS (только production)
    if (this.isProduction && !response.getHeader('Strict-Transport-Security')) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    if (!response.getHeader('Referrer-Policy')) {
      response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    if (!response.getHeader('Permissions-Policy')) {
      response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    }

    if (this.isApiRequest(request)) {
      this.addApiSecurityHeaders(response);
    }

    this.enhanceCorsHeaders(response, request);
  }

  private buildContentSecurityPolicy(): string {
    if (this.isDevelopment) {
      return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https: data:",
        "connect-src 'self' ws: wss:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
    }

    const baseDirectives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https: data:",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "frame-src 'none'",
      "worker-src 'none'",
      "manifest-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    return baseDirectives.join('; ');
  }

  private isApiRequest(request: any): boolean {
    const accept = request.headers.accept || '';
    return request.url.startsWith('/api/') || accept.includes('application/json');
  }

  private addApiSecurityHeaders(response: Response): void {
    if (!response.getHeader('X-API-Version')) {
      response.setHeader('X-API-Version', this.configService.get('APP_VERSION', '2.0'));
    }
    if (!response.getHeader('X-Download-Options')) {
      response.setHeader('X-Download-Options', 'noopen');
    }
  }

  // Не переопределяем заголовки, выставленные CORS-модулем
  private enhanceCorsHeaders(response: Response, request: any): void {
    const origin = request.headers.origin as string | undefined;
    const allowedOrigins = (this.configService.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173') as string)
      .split(',')
      .map((o) => o.trim());

    if (origin && allowedOrigins.includes(origin) && !response.getHeader('Access-Control-Allow-Origin')) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin && this.isDevelopment && !response.getHeader('Access-Control-Allow-Origin')) {
      response.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (!response.getHeader('Access-Control-Allow-Credentials')) {
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (!response.getHeader('Access-Control-Allow-Methods')) {
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    }
    if (!response.getHeader('Access-Control-Allow-Headers')) {
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-ID',
      );
    }
    if (!response.getHeader('Access-Control-Max-Age')) {
      response.setHeader('Access-Control-Max-Age', '86400');
    }
    if (!response.getHeader('Access-Control-Expose-Headers')) {
      response.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Request-ID, X-API-Version');
    }
  }
}
