// path: apps/backend/src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TypeORMError, QueryFailedError } from 'typeorm';
import { ValidationError } from 'class-validator';
import { ThrottlerException } from '@nestjs/throttler';
import { v4 as uuidv4 } from 'uuid';

import {
  EntityNotFoundException,
  InvalidCredentialsException,
  InactiveUserException,
  TooManyAttemptsException,
  UserExistsException,
  InvalidTokenException,
} from '../exceptions/custom-exceptions';
import {
  CompanyNotFoundException,
  CompanyEmailAlreadyExistsException,
  CompanyAccessDeniedException,
  ResourceOwnershipException,
  ValidationDataException,
} from '../exceptions/domain.exceptions';
import { AuditService, AuditAction, AuditLevel } from '../audit/audit.service';
import { RequestWithUser } from '../../modules/auth/interfaces/request-with-user.interface';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    const environment = this.configService.get('NODE_ENV', 'development');
    this.isDevelopment = environment === 'development';
    this.isProduction = environment === 'production';
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & RequestWithUser & { correlationId?: string }>();
    const response = ctx.getResponse<Response>();

    // Корреляция: принять входящий или использовать из интерсептора, иначе сгенерировать
    const correlationId =
      (request.headers['x-request-id'] as string) || request.correlationId || uuidv4();

    const requestContext = this.extractRequestContext(request, correlationId);
    const exceptionDetails = await this.analyzeException(exception, requestContext);

    // Аудит (не блокируем ответ)
    this.auditExceptionAsync(exceptionDetails, requestContext).catch((auditError) => {
      this.logger.error(`Audit logging failed: ${auditError.message}`);
    });

    const secureResponse = this.generateSecureResponse(exceptionDetails, correlationId);

    // Базовые security-заголовки
    this.addSecurityHeaders(response, correlationId);

    // Логи для мониторинга
    this.logForMonitoring(exceptionDetails, requestContext, correlationId);

    response.status(exceptionDetails.statusCode).json(secureResponse);
  }

  private extractRequestContext(request: Request & RequestWithUser, correlationId: string) {
    return {
      correlationId,
      method: request.method,
      url: this.sanitizeUrl(request.url),
      userAgent: request.headers['user-agent'],
      ipAddress: (request.ip || (request.connection as any)?.remoteAddress) as string,
      userId: request.user?.id,
      companyId: request.user?.companyId,
      userRole: (request.user as any)?.role,
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(request.headers),
    };
  }

  private async analyzeException(exception: unknown, context: any) {
    // Специальные доменные исключения
    if (exception instanceof EntityNotFoundException) {
      return {
        type: 'ENTITY_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        level: AuditLevel.WARNING,
        category: 'DOMAIN_ERROR',
      };
    }
    if (exception instanceof InvalidCredentialsException) {
      return {
        type: 'INVALID_CREDENTIALS',
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
        level: AuditLevel.WARNING,
        category: 'AUTH_ERROR',
      };
    }
    if (exception instanceof InactiveUserException) {
      return {
        type: 'INACTIVE_USER',
        statusCode: HttpStatus.FORBIDDEN,
        message: 'User is inactive',
        level: AuditLevel.WARNING,
        category: 'AUTH_ERROR',
      };
    }
    if (exception instanceof UserExistsException) {
      return {
        type: 'USER_EXISTS',
        statusCode: HttpStatus.CONFLICT,
        message: 'User already exists',
        level: AuditLevel.WARNING,
        category: 'DOMAIN_ERROR',
      };
    }
    if (exception instanceof InvalidTokenException) {
      return {
        type: 'INVALID_TOKEN',
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired token',
        level: AuditLevel.WARNING,
        category: 'AUTH_ERROR',
      };
    }
    if (exception instanceof ResourceOwnershipException || exception instanceof CompanyAccessDeniedException) {
      return {
        type: 'ACCESS_DENIED',
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        level: AuditLevel.WARNING,
        category: 'ACCESS_CONTROL',
      };
    }
    if (exception instanceof ValidationDataException) {
      return {
        type: 'VALIDATION_EXCEPTION',
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        level: AuditLevel.WARNING,
        category: 'VALIDATION_ERROR',
      };
    }
    if (exception instanceof CompanyNotFoundException || exception instanceof CompanyEmailAlreadyExistsException) {
      return {
        type: 'COMPANY_ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Company operation failed',
        level: AuditLevel.WARNING,
        category: 'DOMAIN_ERROR',
      };
    }

    // HTTP Exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    }

    // DB Exceptions
    if (exception instanceof TypeORMError) {
      return this.handleDatabaseException(exception);
    }

    // Throttling
    if (exception instanceof ThrottlerException) {
      return this.handleThrottlerException();
    }

    // class-validator ValidationError[]
    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      return this.handleValidationException(exception as ValidationError[]);
    }

    // Unknown
    return this.handleUnknownException(exception as Error);
  }

  private handleHttpException(exception: HttpException) {
    const status = exception.getStatus();
    const responseBody = exception.getResponse();

    return {
      type: 'HTTP_EXCEPTION',
      statusCode: status,
      message: this.extractHttpMessage(responseBody),
      originalError: this.isDevelopment ? exception.message : undefined,
      stack: this.isDevelopment ? (exception.stack || undefined) : undefined,
      level: status >= 500 ? AuditLevel.ERROR : AuditLevel.WARNING,
      category: this.categorizeHttpStatus(status),
    };
  }

  private handleDatabaseException(exception: TypeORMError) {
    if (exception instanceof QueryFailedError && !this.isProduction) {
      return {
        type: 'QUERY_FAILED',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database query failed',
        level: AuditLevel.ERROR,
        category: 'DATABASE_ERROR',
        query: (exception as QueryFailedError).query,
        parameters: (exception as QueryFailedError).parameters,
        driverError: (exception as QueryFailedError).driverError,
      };
    }

    return {
      type: 'DATABASE_EXCEPTION',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      level: AuditLevel.ERROR,
      category: 'DATABASE_ERROR',
      internalError: (exception as any)?.message,
    };
  }

  private handleThrottlerException() {
    return {
      type: 'RATE_LIMIT_EXCEPTION',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded. Please try again later.',
      level: AuditLevel.WARNING,
      category: 'RATE_LIMITING',
      retryAfter: 60,
    };
  }

  private handleValidationException(errors: ValidationError[]) {
    const validationDetails = this.isProduction ? 'Validation failed' : this.formatValidationErrors(errors);

    return {
      type: 'VALIDATION_EXCEPTION',
      statusCode: HttpStatus.BAD_REQUEST,
      message: validationDetails,
      level: AuditLevel.WARNING,
      category: 'VALIDATION_ERROR',
      fieldErrors: this.isDevelopment ? this.extractFieldErrors(errors) : undefined,
    };
  }

  private handleUnknownException(error: Error) {
    return {
      type: 'UNKNOWN_EXCEPTION',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction ? 'Internal server error' : (error?.message || 'Unknown error'),
      level: AuditLevel.ERROR,
      category: 'UNKNOWN_ERROR',
      originalError: this.isDevelopment ? error?.message : undefined,
      stack: this.isDevelopment ? error?.stack : undefined,
    };
  }

  private async auditExceptionAsync(exceptionDetails: any, context: any): Promise<void> {
    try {
      await this.auditService.log(AuditAction.API_ERROR, {
        level: exceptionDetails.level,
        userId: context.userId,
        companyId: context.companyId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        resourceId: context.correlationId,
        resourceType: 'API_REQUEST',
        details: {
          exceptionType: exceptionDetails.type,
          statusCode: exceptionDetails.statusCode,
          method: context.method,
          url: context.url,
          category: exceptionDetails.category,
          sanitizedMessage: exceptionDetails.message,
          internalError: exceptionDetails.internalError,
        },
        status: 'error',
      });
    } catch (auditError: any) {
      this.logger.error(`Audit logging failed: ${auditError?.message || auditError}`);
    }
  }

  private generateSecureResponse(exceptionDetails: any, correlationId: string) {
    const baseResponse: any = {
      success: false,
      statusCode: exceptionDetails.statusCode,
      message: exceptionDetails.message,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    if (this.isDevelopment && exceptionDetails.originalError) {
      baseResponse.error = exceptionDetails.originalError;
      baseResponse.stack = exceptionDetails.stack;
      baseResponse.fieldErrors = exceptionDetails.fieldErrors;
    }

    return baseResponse;
  }

  private addSecurityHeaders(response: Response, correlationId: string): void {
    if (!response.getHeader('X-Request-ID')) response.setHeader('X-Request-ID', correlationId);
    if (!response.getHeader('X-Content-Type-Options')) response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!response.getHeader('X-Frame-Options')) response.setHeader('X-Frame-Options', 'DENY');
    if (!response.getHeader('Cache-Control')) response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  }

  private logForMonitoring(exceptionDetails: any, context: any, correlationId: string): void {
    const logMessage = `[${correlationId}] ${exceptionDetails.type}: ${exceptionDetails.message}`;
    const details = {
      correlationId,
      statusCode: exceptionDetails.statusCode,
      method: context.method,
      url: context.url,
      userId: context.userId,
      companyId: context.companyId,
      category: exceptionDetails.category,
    };

    if (exceptionDetails.level === AuditLevel.ERROR) {
      this.logger.error(`${logMessage} ${JSON.stringify(details)}`);
    } else {
      this.logger.warn(`${logMessage} ${JSON.stringify(details)}`);
    }
  }

  // Utils

  private sanitizeUrl(url: string): string {
    return url.replace(/([?&])(password|token|secret|key)=[^&]*/gi, '$1$2=***');
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, string> = {};

    Object.keys(headers || {}).forEach((key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else {
        const v = headers[key];
        sanitized[key] = Array.isArray(v) ? v.join(',') : String(v);
      }
    });

    return sanitized;
  }

  private extractHttpMessage(response: any): string {
    if (typeof response === 'string') return response;
    if (response?.message) return Array.isArray(response.message) ? response.message.join(', ') : response.message;
    return 'HTTP Exception occurred';
  }

  private categorizeHttpStatus(status: number): string {
    if (status >= 400 && status < 500) return 'CLIENT_ERROR';
    if (status >= 500) return 'SERVER_ERROR';
    return 'HTTP_EXCEPTION';
  }

  private formatValidationErrors(errors: ValidationError[]): string {
    return errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ');
  }

  private extractFieldErrors(errors: ValidationError[]): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    errors.forEach((error) => {
      if (error.constraints) fieldErrors[error.property] = Object.values(error.constraints);
    });
    return fieldErrors;
  }
}
