import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { UsersService } from '../../users/users.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwoFAService {
  constructor(private users: UsersService, private config: ConfigService) {
    const issuer = this.config.get('TWOFA_ISSUER', 'DriveCare');
    authenticator.options = { window: 1, step: 30, digits: 6, issuer };
  }

  private encKey() {
    const raw = this.config.get<string>('TOTP_ENC_KEY', '');
    if (!raw) return null;
    return Buffer.from(raw, 'base64');
  }

  private encryptSecret(secret: string): string {
    const key = this.encKey();
    if (!key) return secret;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  private decryptSecret(blob: string): string {
    const key = this.encKey();
    if (!key) return blob;
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  }

  async generateSetup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const issuer = this.config.get('TWOFA_ISSUER', 'DriveCare');
    const label = `${issuer}:${email}`;
    const otpauthUrl = authenticator.keyuri(label, issuer, secret);
    // Сохраняем секрет временно только после подтверждения (enable)
    return { secret, otpauthUrl };
  }

  async enable(userId: string, code: string) {
    const user = await this.users.findById(userId, { with2FA: true });
    const secret = user.twoFactorSecret ? this.decryptSecret(user.twoFactorSecret) : null;
    if (!secret) throw new Error('2FA secret not set (provide secret in /2fa/enable)');
    const ok = authenticator.check(code, secret);
    if (!ok) throw new Error('Invalid 2FA code');
    await this.users.updateTwoFactor(userId, { twoFactorEnabled: true });
    return { success: true };
  }

  async disable(userId: string, code: string) {
    const user = await this.users.findById(userId, { with2FA: true });
    const secret = user.twoFactorSecret ? this.decryptSecret(user.twoFactorSecret) : null;
    if (!secret) return { success: true };
    const ok = authenticator.check(code, secret);
    if (!ok) throw new Error('Invalid 2FA code');
    await this.users.updateTwoFactor(userId, { twoFactorEnabled: false, twoFactorSecret: null });
    return { success: true };
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findById(userId, { with2FA: true });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return false;
    const secret = this.decryptSecret(user.twoFactorSecret);
    return authenticator.check(code, secret);
  }

  async saveSecret(userId: string, plainSecret: string) {
    const enc = this.encryptSecret(plainSecret);
    await this.users.updateTwoFactor(userId, { twoFactorSecret: enc });
    return { success: true };
  }
}
