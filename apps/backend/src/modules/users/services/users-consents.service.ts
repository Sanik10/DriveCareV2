import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { UserConsent, UserConsentType } from '../../../database/entities/user-consent.entity';

@Injectable()
export class UsersConsentsService {
  constructor(
    @InjectRepository(UserConsent) private readonly repo: Repository<UserConsent>,
    private readonly config: ConfigService,
  ) {}

  private getPolicyVersion(): string {
    return this.config.get<string>('PRIVACY_POLICY_VERSION', '1.0');
  }

  private getPolicyHash(): string {
    const envHash = this.config.get<string>('PRIVACY_POLICY_TEXT_HASH');
    if (envHash) return envHash;
    const text = this.config.get<string>('PRIVACY_POLICY_TEXT', 'DriveCare Privacy Policy RU v1.0');
    return createHash('sha256').update(text).digest('hex');
  }

  async recordRegistrationConsent(userId: string, context?: { ipAddress?: string; userAgent?: string }) {
    const entity = this.repo.create({
      userId,
      consentType: UserConsentType.PDN_PROCESSING,
      policyVersion: this.getPolicyVersion(),
      policyTextHash: this.getPolicyHash(),
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
    });
    await this.repo.save(entity);
  }

  async revokeConsent(userId: string, consentType: UserConsentType) {
    const latest = await this.repo.findOne({
      where: { userId, consentType },
      order: { grantedAt: 'DESC' },
    });
    if (latest && !latest.revokedAt) {
      latest.revokedAt = new Date();
      await this.repo.save(latest);
    }
  }

  async listForUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { grantedAt: 'DESC' },
      select: ['id', 'consentType', 'policyVersion', 'policyTextHash', 'grantedAt', 'revokedAt'],
    });
  }
}
