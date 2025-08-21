// path: apps/backend/src/modules/subscriptions/subscription-billing/services/gateways/tinkoff.gateway.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentData, PaymentResult, PaymentStatus } from '../../types/billing.types';
import { PaymentGatewayInterface } from '../../interfaces/payment-gateway.interface';

@Injectable()
export class TinkoffGateway implements PaymentGatewayInterface {
  private readonly apiBase = 'https://securepay.tinkoff.ru/v2';

  private getCreds() {
    const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
    const password = process.env.TINKOFF_PASSWORD;
    if (!terminalKey || !password) {
      throw new BadRequestException('Tinkoff credentials are not configured');
    }
    return { terminalKey, password };
  }

  private sha256Token(params: Record<string, any>): string {
    const { password, ...rest } = params;
    const sorted = Object.keys(rest)
      .filter((k) => rest[k] !== undefined && rest[k] !== null && k.toLowerCase() !== 'token')
      .sort()
      .reduce((acc, k) => {
        acc[k] = rest[k];
        return acc;
      }, {} as Record<string, any>);
    const base = Object.values(sorted).join('') + password;
    return crypto.createHash('sha256').update(base).digest('hex');
  }

  async createPayment(data: PaymentData, opts?: { idempotencyKey?: string }): Promise<PaymentResult> {
    const { terminalKey, password } = this.getCreds();
    const amountKopecks = Math.round(data.amount * 100);
    const orderId = opts?.idempotencyKey || uuidv4();

    const payload: Record<string, any> = {
      TerminalKey: terminalKey,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: 'DriveCare subscription payment',
      Receipt: undefined, // ФЗ-54: отложено/внешняя ККТ
    };
    payload.Token = this.sha256Token({ ...payload, password });

    const res = await axios.post(`${this.apiBase}/Init`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (!res.data?.Success) {
      throw new BadRequestException(`Tinkoff Init failed: ${res.data?.Message || 'unknown'}`);
    }

    const redirectUrl = res.data?.PaymentURL;
    const paymentId = res.data?.PaymentId;

    return {
      id: String(paymentId),
      status: 'pending',
      redirectUrl,
      provider: 'tinkoff',
      raw: res.data,
    };
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const { terminalKey, password } = this.getCreds();
    const payload: Record<string, any> = { TerminalKey: terminalKey, PaymentId: paymentId };
    payload.Token = this.sha256Token({ ...payload, password });

    const res = await axios.post(`${this.apiBase}/GetState`, payload, { timeout: 10000 });

    if (!res.data?.Success) {
      throw new BadRequestException(`Tinkoff GetState failed: ${res.data?.Message || 'unknown'}`);
    }

    const st = res.data?.Status; // NEW, AUTHORIZED, CONFIRMED, CANCELED, REJECTED, REFUNDED
    let status: PaymentStatus['status'] = 'pending';
    if (st === 'CONFIRMED') status = 'succeeded';
    else if (st === 'REJECTED') status = 'failed';
    else if (st === 'CANCELED') status = 'cancelled'; // было failed
    else if (st === 'REFUNDED') status = 'refunded';

    return { id: String(paymentId), status };
  }

  async handleWebhook(payload: any): Promise<{ paymentId: string; status: PaymentStatus['status'] }> {
    const { password } = this.getCreds();
    const token = payload?.Token;
    if (!token) throw new BadRequestException('Tinkoff webhook: missing Token');

    const toVerify: Record<string, any> = { ...payload, password };
    const expected = this.sha256Token(toVerify);
    if (expected !== token) {
      throw new BadRequestException('Tinkoff webhook: invalid Token');
    }

    const paymentId = payload?.PaymentId || payload?.PaymentID || payload?.paymentId;
    if (!paymentId) {
      throw new BadRequestException('Tinkoff webhook: missing PaymentId');
    }

    const status = await this.checkPaymentStatus(String(paymentId));
    return { paymentId: String(paymentId), status: status.status };
  }
}
