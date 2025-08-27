// path: apps/backend/src/modules/payments/services/yookassa-payments.client.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

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

  /**
   * Verify payment status server-to-server.
   * Maps YooKassa statuses to simplified union: 'succeeded' | 'canceled' | 'pending'
   */
  async checkPaymentStatus(paymentId: string): Promise<'succeeded' | 'canceled' | 'pending'> {
    const res = await axios.get(`${this.apiBase}/payments/${paymentId}`, {
      auth: this.getAuth(),
      timeout: 10000,
    });

    const st = res?.data?.status;
    if (st === 'succeeded') return 'succeeded';
    if (st === 'canceled') return 'canceled';
    // 'pending' | 'waiting_for_capture' and others treated as pending
    return 'pending';
  }
}
