// path: apps/backend/src/modules/auth/services/session.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import Redis from 'ioredis';
import { UserSession } from '../../../database/entities/user-session.entity';
import { User } from '../../../database/entities/user.entity';
import { SessionDevice } from '../interfaces/device.interface';
import { DeviceService } from './device.service';
import { TokenService } from './token.service';
import { EntityNotFoundException } from '../../../common/exceptions/custom-exceptions';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession) private userSessionRepo: Repository<UserSession>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private deviceService: DeviceService,
    private tokenService: TokenService,
  ) {}

  async createSession(user: User, userAgent: string, ipAddress: string) {
    const deviceId = this.deviceService.generateDeviceId({ userId: user.id, userAgent, ipAddress });
    const deviceName = this.deviceService.generateDeviceName(userAgent);
    const expiresInSecs = this.tokenService.getSessionExpirationTime();
    const expiresAt = new Date(Date.now() + expiresInSecs * 1000);

    await this.userSessionRepo.update(
      { userId: user.id, deviceId, isActive: true },
      { isActive: false }
    );

    const sessionId = this.tokenService.generateOpaqueToken();

    const session = this.userSessionRepo.create({
      // id: sessionId,
      userId: user.id,
      deviceId,
      deviceName,
      userAgent,
      ipAddress,
      refreshTokenHash: 'opaque-session',
      jti: sessionId,
      ipSubnet: this.getIpSubnet(ipAddress),
      expiresAt,
      isActive: true,
      deviceFingerprint: this.deviceService.createDeviceFingerprint(userAgent, ipAddress),
    });

    const savedSession = await this.userSessionRepo.save(session);

    const redisPayload = JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      companyId: user.company_id,
      deviceId,
    });

    const pipeline = this.redis.pipeline();
    pipeline.set(`session:${sessionId}`, redisPayload, 'EX', expiresInSecs);
    pipeline.sadd(`user:${user.id}:sessions`, sessionId);
    pipeline.expire(`user:${user.id}:sessions`, expiresInSecs);
    await pipeline.exec();

    return { session: savedSession, sessionId, deviceId, expiresInSecs };
  }

  async getSessionPayload(sessionId: string): Promise<any | null> {
    if (!sessionId) return null;
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) return null;
    
    const expiresInSecs = this.tokenService.getSessionExpirationTime();
    await this.redis.expire(`session:${sessionId}`, expiresInSecs);
    
    return JSON.parse(data);
  }

  async getUserSessions(userId: string): Promise<SessionDevice[]> {
    const sessions = await this.userSessionRepo.find({
      where: { userId, isActive: true, expiresAt: MoreThan(new Date()) },
      select: ['id', 'deviceId', 'deviceName', 'userAgent', 'ipAddress', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });
    
    return sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName || this.deviceService.generateDeviceName(s.userAgent),
      deviceInfo: this.deviceService.parseDeviceInfo(s.userAgent),
      ipAddress: s.ipAddress,
      lastActive: s.updatedAt,
      createdAt: s.createdAt,
    }));
  }

  async removeSession(sessionId: string): Promise<void> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (data) {
      const payload = JSON.parse(data);
      await this.redis.srem(`user:${payload.sub}:sessions`, sessionId);
    }
    await this.redis.del(`session:${sessionId}`);
    await this.userSessionRepo.update({ jti: sessionId }, { isActive: false });
  }

  async removeDeviceSessions(userId: string, deviceId: string): Promise<number> {
    const sessions = await this.userSessionRepo.find({ where: { userId, deviceId, isActive: true } });
    if (sessions.length === 0) throw new EntityNotFoundException('Сессия не найдена');

    const pipeline = this.redis.pipeline();
    for (const s of sessions) {
      s.isActive = false;
      pipeline.del(`session:${s.jti}`);
      pipeline.srem(`user:${userId}:sessions`, s.jti);
    }
    await pipeline.exec();
    await this.userSessionRepo.save(sessions);
    
    return sessions.length;
  }

  async removeAllUserSessions(userId: string, excludeSessionId?: string): Promise<number> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    const pipeline = this.redis.pipeline();
    let deactivatedCount = 0;

    for (const sid of sessionIds) {
      if (sid !== excludeSessionId) {
        pipeline.del(`session:${sid}`);
        pipeline.srem(`user:${userId}:sessions`, sid);
        deactivatedCount++;
      }
    }
    await pipeline.exec();

    const qb = this.userSessionRepo.createQueryBuilder().update(UserSession).set({ isActive: false }).where("userId = :userId", { userId });
    if (excludeSessionId) qb.andWhere("jti != :exclude", { exclude: excludeSessionId });
    await qb.execute();

    return deactivatedCount;
  }

  private getIpSubnet(ipAddress: string): string {
    if (!ipAddress) return 'unknown';
    if (ipAddress.includes(':')) return ipAddress.split(':').slice(0, 4).join(':');
    return ipAddress.split('.').slice(0, 3).join('.');
  }
}
