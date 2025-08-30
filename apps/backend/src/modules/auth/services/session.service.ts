// path: apps/backend/src/modules/auth/services/session.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan } from 'typeorm';
import Redis from 'ioredis';
import { UserSession } from '../../../database/entities/user-session.entity';
import { User } from '../../../database/entities/user.entity';
import { SessionDevice } from '../interfaces/device.interface';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { DeviceService } from './device.service';
import { TokenService } from './token.service';
import { EntityNotFoundException } from '../../../common/exceptions/custom-exceptions';
import { createHmac, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private userSessionRepo: Repository<UserSession>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private deviceService: DeviceService,
    private tokenService: TokenService,
    private config: ConfigService,
  ) {}

  private rtHmac(token: string): string {
    const secret = this.config.get<string>('RT_HMAC_SECRET', 'dev-rt-hmac');
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  /**
   * Создаём новую сессию.
   * - Перед созданием деактивируем все активные сессии для того же (userId + deviceId) — исключаем дубли.
   * - В Redis перезаписываем HMAC RT для пары (userId, deviceId).
   * - Фильтруем по expiresAt при проверках/выдаче списков.
   */
  async createSession(
    user: User,
    userAgent: string,
    ipAddress: string,
  ): Promise<{
    session: UserSession;
    tokens: {
      accessToken: string;
      refreshToken: string;
      refreshJti: string;
      expiresIn: string | number;
      deviceId: string;
    };
  }> {
    const deviceId = this.deviceService.generateDeviceId({ userId: user.id, userAgent, ipAddress });
    const deviceName = this.deviceService.generateDeviceName(userAgent);
    const expiresInSecs = this.tokenService.getTokenExpirationTime(); // refresh TTL (sec)
    const expiresAt = new Date(Date.now() + expiresInSecs * 1000);

    // 0) Удаляем активные дубли для этого устройства
    await this.userSessionRepo.update(
      { userId: user.id, deviceId, isActive: true },
      { isActive: false, lastUsedAt: new Date() },
    );

    // 1) Очистим старый ключ в Redis (на всякий)
    const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(user.id, deviceId);
    await this.redis.del(redisKey);

    // 2) Генерируем sessionId заранее
    const sessionId = randomUUID();

    // 3) Генерируем пару токенов с этим sessionId
    const tokens = await this.tokenService.createTokenPair(user, deviceId, sessionId);

    // 4) Хешируем RT и сохраняем запись
    const pepper = this.config.get<string>('RT_PEPPER', 'dev-rt-pepper');
    const rtHash = await argon2.hash(tokens.refreshToken + pepper);

    const session = this.userSessionRepo.create({
      id: sessionId,
      userId: user.id,
      deviceId,
      deviceName,
      userAgent,
      ipAddress,
      refreshTokenHash: rtHash,
      jti: tokens.refreshJti,
      ipSubnet: this.getIpSubnet(ipAddress),
      expiresAt,
      isActive: true,
      lastUsedAt: null,
      deviceFingerprint: this.deviceService.createDeviceFingerprint(userAgent, ipAddress),
      compromisedAt: null,
    });

    const savedSession = await this.userSessionRepo.save(session);

    // 5) Кладём HMAC RT в Redis
    await this.redis.set(redisKey, this.rtHmac(tokens.refreshToken), 'EX', expiresInSecs);

    return { session: savedSession, tokens };
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    const session = await this.userSessionRepo.findOne({
      where: { id: sessionId, isActive: true, expiresAt: MoreThan(new Date()) },
    });
    return !!session;
  }

  async findActiveSessionByJti(userId: string, jti: string, deviceId?: string): Promise<UserSession | null> {
    const where: any = { userId, jti, isActive: true, expiresAt: MoreThan(new Date()) };
    if (deviceId) where.deviceId = deviceId;
    return this.userSessionRepo.findOne({ where });
  }

  async verifyRtAgainstSession(session: UserSession, refreshToken: string): Promise<boolean> {
    const pepper = this.config.get<string>('RT_PEPPER', 'dev-rt-pepper');
    return argon2.verify(session.refreshTokenHash, refreshToken + pepper);
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

  async removeSessionByJti(userId: string, deviceId: string, jti: string): Promise<void> {
    const session = await this.userSessionRepo.findOne({ where: { userId, deviceId, jti, isActive: true } });
    if (session) {
      session.isActive = false;
      await this.userSessionRepo.save(session);
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, deviceId);
      await this.redis.del(redisKey);
    }
  }

  async removeDeviceSessions(userId: string, deviceId: string): Promise<number> {
    const sessions = await this.userSessionRepo.find({ where: { userId, deviceId, isActive: true } });
    if (sessions.length === 0) throw new EntityNotFoundException('Сессия устройства не найдена');

    for (const s of sessions) {
      s.isActive = false;
      await this.userSessionRepo.save(s);
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, deviceId);
      await this.redis.del(redisKey);
    }
    return sessions.length;
  }

  async removeAllUserSessions(userId: string, excludeDeviceId?: string): Promise<number> {
    const where: any = { userId, isActive: true };
    if (excludeDeviceId) where.deviceId = Not(excludeDeviceId);
    const sessions = await this.userSessionRepo.find({ where });
    for (const s of sessions) {
      s.isActive = false;
      await this.userSessionRepo.save(s);
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, s.deviceId);
      await this.redis.del(redisKey);
    }
    return sessions.length;
  }

  async validateRefreshTokenInRedis(userId: string, deviceId: string, refreshToken: string): Promise<boolean> {
    const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, deviceId);
    const stored = await this.redis.get(redisKey);
    return stored === this.rtHmac(refreshToken);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.userSessionRepo.update({ id: sessionId }, { updatedAt: new Date(), lastUsedAt: new Date() });
  }

  async findSessionById(sessionId: string): Promise<UserSession | null> {
    return this.userSessionRepo.findOne({ where: { id: sessionId, isActive: true } });
  }

  private getIpSubnet(ipAddress: string): string {
    if (!ipAddress) return 'unknown';
    if (ipAddress.includes(':')) return ipAddress.split(':').slice(0, 4).join(':');
    return ipAddress.split('.').slice(0, 3).join('.');
  }
}
