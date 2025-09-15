// path: apps/backend/src/modules/payments/services/yookassa-payments.client.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { PaymentCurrency } from '../types/payments.types';

type YkReceiptItem = {
  description: string;
  quantity: string | number;
  amount: { value: string; currency: string };
  vat_code: number;
  payment_mode?: string;
  payment_subject?: string;
};

type YkReceipt = {
  customer?: { email?: string; phone?: string };
  items: YkReceiptItem[];
  tax_system_code?: number;
};

@Injectable()
export class YooKassaPaymentsClient {
  private readonly apiBase = 'https://api.yookassa.ru/v3';

  private getAuth() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secret = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secret) {
      throw new BadRequestException('YooKassa credentials are not configured');
    }
    return { username: shopId, password: secret };
  }

  private authConfig(shopId?: string, secret?: string): AxiosRequestConfig['auth'] {
    if (shopId && secret) return { username: shopId, password: secret };
    // fallback to global
    return this.getAuth();
  }

  private asMoney(value: number): string {
    // 2 decimals, dot separator
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  async createPayment(params: {
    shopId?: string;
    secret?: string;
    idempotenceKey: string;
    amount: number;
    currency?: PaymentCurrency;
    description: string;
    returnUrl: string;
    locale?: 'ru_RU' | 'en_US';
    capture?: boolean;
    receipt?: YkReceipt;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string; confirmationUrl: string; expiresAt?: string }> {
    const {
      shopId,
      secret,
      idempotenceKey,
      amount,
      currency = 'RUB',
      description,
      returnUrl,
      locale = 'ru_RU',
      capture = true,
      receipt,
      metadata,
    } = params;

    const payload: any = {
      amount: {
        value: this.asMoney(amount),
        currency,
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
        locale,
      },
      capture,
      description,
    };

    if (receipt && receipt.items?.length) {
      payload.receipt = receipt;
    }

    if (metadata) {
      // Огранием количество и длину ключей по best practice (YK лимит до 16 ключей, 128 символов)
      const limited: Record<string, string> = {};
      const entries = Object.entries(metadata).slice(0, 16);
      for (const [k, v] of entries) {
        if (k.length <= 128) {
          limited[k] = typeof v === 'string' ? v.slice(0, 256) : String(v).slice(0, 256);
        }
      }
      payload.metadata = limited;
    }

    const res = await axios.post(`${this.apiBase}/payments`, payload, {
      auth: this.authConfig(shopId, secret),
      headers: { 'Idempotence-Key': idempotenceKey },
      timeout: 15000,
    });

    const data = res.data || {};
    const confirmationUrl = data?.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      throw new BadRequestException('YooKassa response does not contain confirmation_url');
    }

    return {
      id: data.id,
      status: data.status,
      confirmationUrl,
      expiresAt: data?.expires_at,
    };
  }

  /**
   * Verify payment status server-to-server.
   * Maps YooKassa statuses to simplified union: 'succeeded' | 'canceled' | 'pending'
   */
  async checkPaymentStatus(paymentId: string, creds?: { shopId: string; secret: string }): Promise<'succeeded' | 'canceled' | 'pending'> {
    const res = await axios.get(`${this.apiBase}/payments/${paymentId}`, {
      auth: this.authConfig(creds?.shopId, creds?.secret),
      timeout: 10000,
    });

    const st = res?.data?.status;
    if (st === 'succeeded') return 'succeeded';
    if (st === 'canceled') return 'canceled';
    return 'pending';
  }
}
