// path: apps/backend/src/modules/auth/services/security.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AUTH_CONSTANTS, sanitizeForRedisKey } from '../constants/auth.constants';
import { SecurityAttempt } from '../interfaces/session.interface';
import { AuditService, AuditAction, AuditLevel } from '../../../common/audit/audit.service';

@Injectable()
export class SecurityService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  // Атомарная запись попытки (сохранено для обратной совместимости)
  async checkAndRecordFailedAttempt(email: string, ipAddress: string): Promise<{ isBlocked: boolean; attempts: number; blockTime?: number }> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);

    const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `login:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const maxAttempts = Number(this.configService.get('MAX_FAILED_LOGIN_ATTEMPTS')) || AUTH_CONSTANTS.DEFAULTS.MAX_FAILED_ATTEMPTS;
    const blockTime = Number(this.configService.get('LOGIN_BLOCK_TIME')) || AUTH_CONSTANTS.DEFAULTS.LOGIN_BLOCK_TIME;
    const attemptsTtl = Number(this.configService.get('FAILED_ATTEMPTS_TTL')) || AUTH_CONSTANTS.DEFAULTS.FAILED_ATTEMPTS_TTL;

    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, attemptsTtl);
    multi.get(key);
    multi.exists(blockKey);

    const results = await multi.exec();
    const attempts = parseInt(results[2][1] as string, 10);
    const isAlreadyBlocked = results[3][1] === 1;

    if (attempts >= maxAttempts && !isAlreadyBlocked) {
      await this.redis.set(blockKey, '1', 'EX', blockTime);
      await this.auditService.log(AuditAction.USER_LOGIN_BLOCKED, {
        details: { email, ipAddress, attempts, blockTimeSeconds: blockTime },
        ipAddress,
        level: AuditLevel.WARNING,
        status: 'blocked',
      });
      return { isBlocked: true, attempts, blockTime };
    }

    return {
      isBlocked: attempts >= maxAttempts || isAlreadyBlocked,
      attempts,
    };
  }

  // Быстрая проверка без записи (для начала логина)
  async checkFailedLoginAttempts(email: string, ipAddress: string): Promise<boolean> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);

    const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `login:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const maxAttempts = Number(this.configService.get('MAX_FAILED_LOGIN_ATTEMPTS')) || AUTH_CONSTANTS.DEFAULTS.MAX_FAILED_ATTEMPTS;

    const multi = this.redis.multi();
    multi.get(key);
    multi.exists(blockKey);

    const results = await multi.exec();
    const attempts = results[0][1] ? parseInt(results[0][1] as string, 10) : 0;
    const isBlocked = results[1][1] === 1;

    return attempts >= maxAttempts || isBlocked;
  }

  async recordFailedLoginAttempt(email: string, ipAddress: string): Promise<void> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);
    const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;

    await this.redis.incr(key);

    const ttl = await this.redis.ttl(key);
    const attemptsTtl = Number(this.configService.get('FAILED_ATTEMPTS_TTL')) || AUTH_CONSTANTS.DEFAULTS.FAILED_ATTEMPTS_TTL;
    if (ttl === -1) {
      await this.redis.expire(key, attemptsTtl);
    }
  }

  async resetFailedLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);

    const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `login:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const multi = this.redis.multi();
    multi.del(key);
    multi.del(blockKey);
    await multi.exec();
  }

  async getSecurityAttempts(email: string, ipAddress: string): Promise<SecurityAttempt> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);

    const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `login:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const multi = this.redis.multi();
    multi.get(key);
    multi.ttl(blockKey);

    const results = await multi.exec();
    const attempts = results[0][1] ? parseInt(results[0][1] as string, 10) : 0;
    const blockTtl = results[1][1] as number;

    return {
      email,
      ipAddress,
      attempts,
      blockedUntil: blockTtl > 0 ? new Date(Date.now() + blockTtl * 1000) : undefined,
    };
  }

  // ===== 2FA попытки: отдельный счётчик и блокировка (не смешиваем с паролем) =====

  private getTwoFaLimits() {
    const maxAttempts = Number(this.configService.get('MAX_FAILED_2FA_ATTEMPTS')) || 10;       // дефолт мягче
    const blockTime = Number(this.configService.get('TWO_FA_BLOCK_TIME')) || 15 * 60;          // 15 минут
    const attemptsTtl = Number(this.configService.get('TWO_FA_FAILED_ATTEMPTS_TTL')) || 15 * 60;
    return { maxAttempts, blockTime, attemptsTtl };
  }

  async checkTwoFaBlocked(email: string, ipAddress: string): Promise<boolean> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);
    const { maxAttempts } = this.getTwoFaLimits();

    const key = `2fa:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `2fa:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const multi = this.redis.multi();
    multi.get(key);
    multi.exists(blockKey);

    const results = await multi.exec();
    const attempts = results[0][1] ? parseInt(results[0][1] as string, 10) : 0;
    const isBlocked = results[1][1] === 1;

    return attempts >= maxAttempts || isBlocked;
  }

  async recordTwoFaFailedAttempt(email: string, ipAddress: string): Promise<void> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);
    const { maxAttempts, blockTime, attemptsTtl } = this.getTwoFaLimits();

    const key = `2fa:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `2fa:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, attemptsTtl);
    multi.get(key);
    multi.exists(blockKey);

    const results = await multi.exec();
    const attempts = parseInt(results[2][1] as string, 10);
    const isAlreadyBlocked = results[3][1] === 1;

    if (attempts >= maxAttempts && !isAlreadyBlocked) {
      await this.redis.set(blockKey, '1', 'EX', blockTime);
      await this.auditService.log(AuditAction.USER_LOGIN_BLOCKED, {
        details: { reason: '2FA temporarily blocked', email, ipAddress, attempts, blockTimeSeconds: blockTime },
        ipAddress,
        level: AuditLevel.WARNING,
        status: 'blocked',
      });
    }
  }

  async resetTwoFaAttempts(email: string, ipAddress: string): Promise<void> {
    const sanitizedEmail = sanitizeForRedisKey(email);
    const sanitizedIp = sanitizeForRedisKey(ipAddress);

    const key = `2fa:failed:${sanitizedIp}:${sanitizedEmail}`;
    const blockKey = `2fa:blocked:${sanitizedIp}:${sanitizedEmail}`;

    const multi = this.redis.multi();
    multi.del(key);
    multi.del(blockKey);
    await multi.exec();
  }

  // ===== Общая статистика =====
  async getSecurityStats(): Promise<{
    totalBlocked: number;
    activeBlocks: number;
    totalFailedAttempts: number;
  }> {
    let cursor = '0';
    let allKeys: string[] = [];
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'login:*', 'COUNT', 1000);
      cursor = next;
      allKeys = allKeys.concat(keys);
    } while (cursor !== '0');

    const blockedKeys = allKeys.filter((k) => k.includes(':blocked:'));
    const failedKeys = allKeys.filter((k) => k.includes(':failed:'));

    let activeBlocks = 0;
    for (const key of blockedKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) activeBlocks++;
    }

    return {
      totalBlocked: blockedKeys.length,
      activeBlocks,
      totalFailedAttempts: failedKeys.length,
    };
  }
}
