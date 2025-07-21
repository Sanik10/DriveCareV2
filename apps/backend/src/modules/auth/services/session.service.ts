import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import Redis from 'ioredis';
import { UserSession } from '../../../database/entities/user-session.entity';
import { User } from '../../../database/entities/user.entity';
import { CreateSessionData } from '../interfaces/session.interface';
import { SessionDevice } from '../interfaces/device.interface';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { DeviceService } from './device.service';
import { TokenService } from './token.service';
import { EntityNotFoundException, InvalidTokenException } from '../../../common/exceptions/custom-exceptions';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private deviceService: DeviceService,
    private tokenService: TokenService,
  ) {}

  async createSession(user: User, userAgent: string, ipAddress: string): Promise<{
    session: UserSession;
    tokens: { accessToken: string; refreshToken: string; expiresIn: string; deviceId: string };
  }> {
    // Генерируем deviceId
    const deviceId = this.deviceService.generateDeviceId({
      userId: user.id,
      userAgent,
      ipAddress
    });

    // Создаём токены
    const tokens = await this.tokenService.createTokenPair(user, deviceId);

    // Создаём сессию в базе
    const expiresIn = this.tokenService.getTokenExpirationTime();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const sessionData: CreateSessionData = {
      userId: user.id,
      deviceId,
      deviceName: this.deviceService.generateDeviceName(userAgent),
      userAgent,
      ipAddress,
      refreshToken: tokens.refreshToken,
      expiresAt,
    };

    const session = this.userSessionRepository.create(sessionData);
    await this.userSessionRepository.save(session);

    // Сохраняем в Redis
    const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(user.id, deviceId);
    await this.redis.set(redisKey, tokens.refreshToken, 'EX', expiresIn);

    return { session, tokens };
  }

  async findSessionByRefreshToken(userId: string, refreshToken: string): Promise<UserSession | null> {
    return this.userSessionRepository.findOne({
      where: { 
        userId,
        refreshToken,
        isActive: true
      }
    });
  }

  async getUserSessions(userId: string): Promise<SessionDevice[]> {
    const sessions = await this.userSessionRepository.find({
      where: { 
        userId,
        isActive: true
      },
      select: ['id', 'deviceId', 'deviceName', 'userAgent', 'ipAddress', 'createdAt', 'updatedAt']
    });
    
    return sessions.map(session => ({
      id: session.id,
      deviceId: session.deviceId,
      deviceName: session.deviceName || this.deviceService.generateDeviceName(session.userAgent),
      deviceInfo: this.deviceService.parseDeviceInfo(session.userAgent),
      ipAddress: session.ipAddress,
      lastActive: session.updatedAt,
      createdAt: session.createdAt
    }));
  }

  async removeSession(userId: string, refreshToken: string): Promise<void> {
    const session = await this.userSessionRepository.findOne({
      where: { userId, refreshToken }
    });
    
    if (session) {
      session.isActive = false;
      await this.userSessionRepository.save(session);
      
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, session.deviceId);
      await this.redis.del(redisKey);
    }
  }

  async removeDeviceSessions(userId: string, deviceId: string): Promise<number> {
    const sessions = await this.userSessionRepository.find({
      where: { 
        userId,
        deviceId,
        isActive: true
      }
    });
    
    if (sessions.length === 0) {
      throw new EntityNotFoundException('Сессия устройства не найдена');
    }
    
    for (const session of sessions) {
      session.isActive = false;
      await this.userSessionRepository.save(session);
      
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, deviceId);
      await this.redis.del(redisKey);
    }
    
    return sessions.length;
  }

  async removeAllUserSessions(userId: string, excludeDeviceId?: string): Promise<number> {
    const whereClause: any = { 
      userId, 
      isActive: true 
    };
    
    if (excludeDeviceId) {
      whereClause.deviceId = Not(excludeDeviceId);
    }
    
    const sessions = await this.userSessionRepository.find({ where: whereClause });
    
    for (const session of sessions) {
      session.isActive = false;
      await this.userSessionRepository.save(session);
      
      const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, session.deviceId);
      await this.redis.del(redisKey);
    }
    
    return sessions.length;
  }

  async validateRefreshTokenInRedis(userId: string, deviceId: string, refreshToken: string): Promise<boolean> {
    const redisKey = AUTH_CONSTANTS.REDIS_KEYS.REFRESH_TOKEN(userId, deviceId);
    const storedToken = await this.redis.get(redisKey);
    
    return storedToken === refreshToken;
  }
}