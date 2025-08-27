// path: apps/backend/src/modules/payments/guards/webhook-ip-acl.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function normalizeIp(ip?: string): string {
  if (!ip) return '';
  const s = ip.toString().trim();
  // Strip IPv6-mapped IPv4 prefix
  return s.startsWith('::ffff:') ? s.replace('::ffff:', '') : s;
}

function parseAllowedList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  const str = String(raw);
  if (!str.trim()) return [];
  return str.split(',').map((x) => x.trim()).filter(Boolean);
}

function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => {
    const n = Number(p);
    if (Number.isNaN(n) || n < 0 || n > 255) return NaN;
    return n;
  });
  if (nums.some((n) => Number.isNaN(n))) return null;
  return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

function isIpInCidr(ip: string, cidr: string): boolean {
  // IPv4 CIDR only (e.g., "203.0.113.0/24")
  const [range, bitsStr] = cidr.split('/');
  if (!range || !bitsStr) return false;
  const bits = Number(bitsStr);
  if (Number.isNaN(bits) || bits < 0 || bits > 32) return false;
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  if (ipLong === null || rangeLong === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

function isAllowedIp(clientIp: string, allowedEntry: string): boolean {
  // Support exact IP and IPv4 CIDR
  if (allowedEntry.includes('/')) {
    return isIpInCidr(clientIp, allowedEntry);
  }
  return clientIp === allowedEntry;
}

@Injectable()
export class WebhookIpAclGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const env = (this.config.get<string>('NODE_ENV') || 'development').toLowerCase();

    const nested = this.config.get<string[] | string>('billing.webhooks.allowedIps');
    const legacy = this.config.get<string>('WEBHOOK_ALLOWED_IPS');
    const allowed = [
      ...parseAllowedList(nested),
      ...parseAllowedList(legacy),
    ].filter(Boolean);

    // Allow localhost in dev/staging if no ACL configured
    if (allowed.length === 0 && env !== 'production') {
      return true;
    }

    if (allowed.length === 0 && env === 'production') {
      throw new ForbiddenException('Webhook IP ACL is not configured');
    }

    // With trust proxy enabled, req.ip is the left-most (client) IP from X-Forwarded-For
    const candidateIps: string[] = [
      req.ip,
      ...(Array.isArray(req.ips) ? req.ips : []),
      req.connection?.remoteAddress,
      req.socket?.remoteAddress,
      req.headers['x-real-ip'],
    ]
      .map((x: any) => normalizeIp(String(x || '')))
      .filter(Boolean);

    // Unique preserve order
    const uniqueCandidates = Array.from(new Set(candidateIps));

    // Accept if any candidate matches allowed list (exact or CIDR)
    for (const ip of uniqueCandidates) {
      for (const entry of allowed) {
        if (isAllowedIp(ip, entry)) {
          return true;
        }
      }
    }

    // Extra dev convenience: allow loopback in non-prod
    if (env !== 'production' && (uniqueCandidates.includes('127.0.0.1') || uniqueCandidates.includes('::1'))) {
      return true;
    }

    const debugIps = uniqueCandidates.join(', ') || 'unknown';
    throw new ForbiddenException(`Webhook IP not allowed (got: ${debugIps})`);
  }
}
