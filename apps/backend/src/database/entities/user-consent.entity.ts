import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum UserConsentType {
  PDN_PROCESSING = 'pdn_processing',
  MARKETING = 'marketing',
}

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 50 })
  @Index()
  consentType: UserConsentType;

  @Column({ name: 'policy_version', type: 'varchar', length: 20 })
  policyVersion: string;

  @Column({ name: 'policy_text_hash', type: 'varchar', length: 64 })
  policyTextHash: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamp' })
  grantedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;
}
