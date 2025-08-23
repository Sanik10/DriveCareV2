// path: apps/backend/src/common/pipes/enhanced-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 🛡️ ENHANCED VALIDATION PIPE
 *
 * Расширенная валидация:
 * - Базовая защита от SQLi/XSS/path traversal
 * - Ограничение размера входных данных
 * - Санитизация ошибок
 * - Блокировка proto-pollution ключей
 *
 * Важно: не заменяет контекстные валидаторы DTO и БД-уровень, а дополняет их.
 */

// ВЫНЕСЕНО ВНЕ КЛАССА, чтобы не обращаться к this до super()
function buildExceptionFactory(isDevelopment: boolean) {
  return (errors: any[]): BadRequestException => {
    if (isDevelopment) {
      const errorMessages = errors.map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(', ')}`;
      });

      return new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
        statusCode: 400,
      });
    } else {
      return new BadRequestException('Validation failed');
    }
  };
}

@Injectable()
export class EnhancedValidationPipe extends ValidationPipe implements PipeTransform {
  private readonly logger = new Logger(EnhancedValidationPipe.name);
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    const environment = configService.get('NODE_ENV', 'development');
    const isDevelopment = environment === 'development';

    // НЕЛЬЗЯ ссылаться на this до super()
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: !isDevelopment,
      validateCustomDecorators: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory: buildExceptionFactory(isDevelopment),
    });

    this.isDevelopment = isDevelopment;
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const startTime = Date.now();

    try {
      if (value && typeof value === 'object' && !(value instanceof Buffer)) {
        this.performSecurityChecks(value, metadata);
      }

      const result = await super.transform(value, metadata);

      const duration = Date.now() - startTime;
      if (duration > 100) {
        this.logger.warn(`Slow validation detected: ${duration}ms for ${metadata.type}`);
      }

      return result;
    } catch (error: any) {
      this.logger.warn(`Validation failed for ${metadata.type}: ${error?.message || error}`);
      throw error;
    }
  }

  private performSecurityChecks(value: any, _metadata: ArgumentMetadata): void {
    this.checkPrototypePollution(value);
    this.checkSqlInjection(value);
    this.checkXssPatterns(value);
    this.checkPathTraversal(value);
    this.checkDataSize(value);
  }

  private checkPrototypePollution(obj: any): void {
    const badKeys = ['__proto__', 'constructor', 'prototype'];
    const scan = (o: any) => {
      if (!o || typeof o !== 'object') return;
      for (const key of Object.keys(o)) {
        if (badKeys.includes(key)) {
          this.logger.error(`Security violation: prototype pollution key "${key}" detected`);
          throw new BadRequestException('Invalid input detected');
        }
        scan(o[key]);
      }
    };
    scan(obj);
  }

  // Минимальный "стойкий" набор — избегаем чрезмерных false-positive
  private checkSqlInjection(obj: any): void {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC(UTE)?|UNION|MERGE)\b)/i,
      /(;|--|\/\*|\*\/)/, // завершающие конструкции
      /\b(OR|AND)\b\s+['"0-9A-Za-z_]+\s*=\s*['"0-9A-Za-z_]+/i,
    ];
    this.checkPatternsRecursively(obj, patterns, 'SQL injection pattern detected', 256);
  }

  private checkXssPatterns(obj: any): void {
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /\bjavascript:/i,
      /\bon\w+\s*=/i, // onload= / onclick=
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i,
      /\beval\s*KATEX_INLINE_OPEN/i,
      /\bexpression\s*KATEX_INLINE_OPEN/i,
    ];
    this.checkPatternsRecursively(obj, patterns, 'XSS pattern detected', 256);
  }

  private checkPathTraversal(obj: any): void {
    const patterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i,
    ];
    this.checkPatternsRecursively(obj, patterns, 'Path traversal pattern detected', 64);
  }

  private checkPatternsRecursively(obj: any, patterns: RegExp[], errorMessage: string, minLength = 0): void {
    if (typeof obj === 'string') {
      const s = obj;
      if (s.length >= minLength) {
        for (const pattern of patterns) {
          if (pattern.test(s)) {
            this.logger.error(`Security violation: ${errorMessage} in value: ${s.substring(0, 200)}`);
            throw new BadRequestException('Invalid input detected');
          }
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => this.checkPatternsRecursively(item, patterns, errorMessage, minLength));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach((value) =>
        this.checkPatternsRecursively(value, patterns, errorMessage, minLength),
      );
    }
  }

  private checkDataSize(obj: any): void {
    // Ограничение полезной нагрузки
    const jsonString = JSON.stringify(obj);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (sizeInBytes > maxSize) {
      this.logger.error(`Request too large: ${sizeInBytes} bytes (max: ${maxSize})`);
      throw new BadRequestException('Request payload too large');
    }
  }
}
