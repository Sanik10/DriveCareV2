// path: apps/backend/src/modules/subscriptions/subscription-billing/guards/webhook-signature.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

function parseJsonSafe(body: any): any {
  if (!body) return {};
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function getClientIp(req: any): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first.replace('::ffff:', '');
  }
  return (req.ip || '').replace('::ffff:', '');
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const provider = String(req.params?.provider || '').toLowerCase();

    if (!provider) {
      throw new ForbiddenException('Webhook provider is required');
    }

    if (provider === 'tinkoff') {
      const payload = parseJsonSafe(req.body);
      const token = payload?.Token;
      const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
      const password = process.env.TINKOFF_PASSWORD;

      if (!token || !terminalKey || !password) {
        throw new ForbiddenException('Tinkoff webhook: credentials or token missing');
      }

      // sha256(sorted payload + password), excluding Token
      const sortedKeys = Object.keys(payload || {})
        .filter((k) => k !== 'Token' && payload[k] !== undefined && payload[k] !== null)
        .sort();

      let base = '';
      for (const k of sortedKeys) base += String(payload[k]);
      base += password;

      const expected = crypto.createHash('sha256').update(base).digest('hex');
      if (expected !== token) {
        throw new ForbiddenException('Tinkoff webhook: invalid Token');
      }

      // Дополнительно можно сверить TerminalKey при желании
      return true;
    }

    if (provider === 'yookassa') {
      // Optional: IP allowlist
      const allow = (process.env.YOOKASSA_IP_WHITELIST || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      if (allow.length > 0) {
        const ip = getClientIp(req);
        if (!allow.includes(ip)) {
          throw new ForbiddenException(`YooKassa webhook: ip ${ip} not allowed`);
        }
      }

      const payload = parseJsonSafe(req.body);
      const paymentId = payload?.object?.id || payload?.payment_id;
      if (!paymentId) {
        throw new ForbiddenException('YooKassa webhook: invalid payload (missing payment id)');
      }
      return true;
    }

    throw new ForbiddenException(`Unknown webhook provider: ${provider}`);
  }
}
