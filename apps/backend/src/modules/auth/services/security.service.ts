import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
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

  async checkFailedLoginAttempts(email: string, ipAddress: string): Promise<boolean> {
    const key = AUTH_CONSTANTS.REDIS_KEYS.FAILED_LOGIN(ipAddress, email);
    
    const attempts = await this.redis.get(key);
    const maxAttempts = this.configService.get('MAX_FAILED_LOGIN_ATTEMPTS', AUTH_CONSTANTS.DEFAULTS.MAX_FAILED_ATTEMPTS);
    
    if (attempts && parseInt(attempts, 10) >= maxAttempts) {
      const blockKey = AUTH_CONSTANTS.REDIS_KEYS.BLOCKED_LOGIN(ipAddress, email);
      const isBlocked = await this.redis.exists(blockKey);
      
      if (!isBlocked) {
        const blockTime = this.configService.get('LOGIN_BLOCK_TIME', AUTH_CONSTANTS.DEFAULTS.LOGIN_BLOCK_TIME);
        await this.redis.set(blockKey, '1', 'EX', blockTime);
        
        await this.auditService.log(AuditAction.USER_LOGIN_BLOCKED, {
          details: { email, ipAddress, blockTimeSeconds: blockTime },
          ipAddress,
          level: AuditLevel.WARNING,
          status: 'blocked'
        });
        
        return true;
      }
      return true;
    }
    
    return false;
  }

  async recordFailedLoginAttempt(email: string, ipAddress: string): Promise<void> {
    const key = AUTH_CONSTANTS.REDIS_KEYS.FAILED_LOGIN(ipAddress, email);
    
    await this.redis.incr(key);
    
    const ttl = await this.redis.ttl(key);
    if (ttl === -1) {
      await this.redis.expire(key, AUTH_CONSTANTS.DEFAULTS.FAILED_ATTEMPTS_TTL);
    }
  }

  async resetFailedLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const key = AUTH_CONSTANTS.REDIS_KEYS.FAILED_LOGIN(ipAddress, email);
    await this.redis.del(key);
  }

  async getSecurityAttempts(email: string, ipAddress: string): Promise<SecurityAttempt> {
    const key = AUTH_CONSTANTS.REDIS_KEYS.FAILED_LOGIN(ipAddress, email);
    const blockKey = AUTH_CONSTANTS.REDIS_KEYS.BLOCKED_LOGIN(ipAddress, email);
    
    const attempts = await this.redis.get(key);
    const blockTtl = await this.redis.ttl(blockKey);
    
    return {
      email,
      ipAddress,
      attempts: attempts ? parseInt(attempts, 10) : 0,
      blockedUntil: blockTtl > 0 ? new Date(Date.now() + blockTtl * 1000) : undefined,
    };
  }
}