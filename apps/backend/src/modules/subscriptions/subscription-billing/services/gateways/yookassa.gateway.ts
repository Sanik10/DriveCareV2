// path: apps/backend/src/modules/subscriptions/subscription-billing/services/gateways/yookassa.gateway.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PaymentData, PaymentResult, PaymentStatus } from '../../types/billing.types';
import { PaymentGatewayInterface } from '../../interfaces/payment-gateway.interface';

@Injectable()
export class YooKassaGateway implements PaymentGatewayInterface {
  private readonly apiBase = 'https://api.yookassa.ru/v3';

  private getAuth() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secret = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secret) {
      throw new BadRequestException('YooKassa credentials are not configured');
    }
    return { username: shopId, password: secret };
  }

  async createPayment(data: PaymentData, opts?: { idempotencyKey?: string }): Promise<PaymentResult> {
    const idempotenceKey = opts?.idempotencyKey || uuidv4();
    const baseFrontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const returnUrl = `${baseFrontend}/dashboard/payments/result?context=subscription`;

    const payload = {
      amount: { value: data.amount.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: returnUrl },
      capture: true,
      description: 'DriveCare subscription payment',
      metadata: data.metadata || {},
    };

    const res = await axios.post(`${this.apiBase}/payments`, payload, {
      auth: this.getAuth(),
      headers: { 'Idempotence-Key': idempotenceKey, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const payment = res.data;
    const redirectUrl = payment?.confirmation?.confirmation_url || payment?.confirmation?.return_url;

    // PaymentResult.status допускает только 'pending' | 'succeeded' | 'failed'
    let status: PaymentResult['status'] = 'pending';
    if (payment.status === 'succeeded') status = 'succeeded';
    if (payment.status === 'canceled') status = 'failed';

    return {
      id: payment.id,
      status,
      redirectUrl,
      provider: 'yookassa',
      raw: payment,
    };
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const res = await axios.get(`${this.apiBase}/payments/${paymentId}`, {
      auth: this.getAuth(),
      timeout: 10000,
    });

    const st = res.data?.status;
    let status: PaymentStatus['status'] = 'pending';
    if (st === 'succeeded') status = 'succeeded';
    else if (st === 'canceled') status = 'cancelled';

    return { id: paymentId, status };
  }

  async handleWebhook(payload: any): Promise<{ paymentId: string; status: PaymentStatus['status'] }> {
    const obj = payload?.object;
    const paymentId = obj?.id || payload?.payment_id;
    if (!paymentId) {
      throw new BadRequestException('Invalid YooKassa webhook payload');
    }
    const status = await this.checkPaymentStatus(paymentId);
    return { paymentId, status: status.status };
  }
}
