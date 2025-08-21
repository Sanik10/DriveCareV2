// src/modules/invoices/services/invoices-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Invoice, Payment } from '../../../database/entities';
import { InvoiceResponseDto } from '../dto/response/invoice-response.dto';
import { INVOICE_STATUS_DISPLAY } from '../constants/invoices.constants';
import { InvoiceStatus } from '../types/invoices.types';
import { AuthRole } from '../../auth/types/auth.types';
import { PaymentStatus } from '../../payments/types/payments.types';

@Injectable()
export class InvoicesMapperService {
  mapToResponseDto(invoice: Invoice, userRole?: AuthRole): InvoiceResponseDto {
    const paidAmount = this.calculatePaidAmount(invoice.payments || []);
    const totalAmount = parseFloat(invoice.totalAmount.toString());
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const base: InvoiceResponseDto = {
      id: invoice.id,
      companyId: invoice.companyId,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      amount: parseFloat(invoice.amount.toString()),
      taxAmount: parseFloat(invoice.taxAmount.toString()),
      totalAmount,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,

      order: invoice.order
        ? {
            id: invoice.order.id,
            orderNumber: invoice.order.orderNumber,
            status: invoice.order.status,
            description: invoice.order.description,
            createdAt: invoice.order.createdAt,
          }
        : undefined,

      customer: invoice.order?.customer
        ? {
            id: invoice.order.customer.id,
            firstName: invoice.order.customer.firstName,
            lastName: invoice.order.customer.lastName,
            companyName: invoice.order.customer.companyName,
            email: invoice.order.customer.email,
            phone: invoice.order.customer.phone,
            type: invoice.order.customer.type,
          }
        : undefined,

      vehicle: invoice.order?.vehicle
        ? {
            id: invoice.order.vehicle.id,
            vin: invoice.order.vehicle.vin,
            licensePlate: invoice.order.vehicle.licensePlate,
            year: invoice.order.vehicle.year,
            displayName: this.getVehicleDisplayName(invoice.order.vehicle),
          }
        : undefined,

      company: invoice.company
        ? {
            id: invoice.company.id,
            name: invoice.company.name,
            legalName: invoice.company.legalName,
            taxNumber: (invoice.company as any).taxNumber,
            address: (invoice.company as any).address,
            email: (invoice.company as any).email,
            phone: (invoice.company as any).phone,
          }
        : undefined,

      payments:
        invoice.payments?.map((p) => ({
          id: p.id,
          amount: parseFloat(p.amount.toString()),
          paymentDate: p.paymentDate,
          status: p.status,
          transactionId: p.transactionId,
          paymentMethod: p.paymentMethod?.name,
        })) || [],

      displayStatus: INVOICE_STATUS_DISPLAY[invoice.status] || invoice.status,
      isOverdue: this.isOverdue(invoice),
      daysUntilDue: this.daysUntilDue(invoice),
      remainingAmount,
      paidAmount,
      taxPercentage: this.taxPercentage(invoice),
      canEdit: this.canEdit(invoice),
      canCancel: this.canCancel(invoice),
      canPay: this.canPay(invoice, remainingAmount),
    };

    if (userRole) {
      const effectiveRole = userRole === 'superadmin' ? ('company_admin' as AuthRole) : userRole;
      return plainToInstance(InvoiceResponseDto, base, { groups: [effectiveRole] });
    }
    return base;
  }

  mapArrayToResponseDto(invoices: Invoice[], userRole?: AuthRole): InvoiceResponseDto[] {
    return invoices.map((inv) => this.mapToResponseDto(inv, userRole));
  }

  mapToBasicInfo(invoice: Invoice): {
    id: string;
    invoiceNumber: string;
    companyId: string;
    status: string;
    orderId: string;
    totalAmount: number;
    remainingAmount: number;
  } {
    const paidAmount = this.calculatePaidAmount(invoice.payments || []);
    const totalAmount = parseFloat(invoice.totalAmount.toString());
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      status: invoice.status,
      orderId: invoice.orderId,
      totalAmount,
      remainingAmount: Math.max(0, totalAmount - paidAmount),
    };
  }

  mapToSelectOption(invoice: Invoice): {
    value: string;
    label: string;
    status: string;
    disabled: boolean;
    amount: number;
  } {
    return {
      value: invoice.id,
      label: `${invoice.invoiceNumber} - ${parseFloat(invoice.totalAmount.toString())} ₽`,
      status: invoice.status,
      disabled: invoice.status === InvoiceStatus.CANCELED,
      amount: parseFloat(invoice.totalAmount.toString()),
    };
  }

  private calculatePaidAmount(payments: Payment[]): number {
    return payments
      .filter((p) => p.status === PaymentStatus.PROCESSED)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  }

  private getVehicleDisplayName(vehicle: any): string {
    const parts = [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.year, vehicle.licensePlate].filter(
      Boolean,
    );
    return parts.join(' ') || 'Неизвестный автомобиль';
  }

  private isOverdue(invoice: Invoice): boolean {
    if (invoice.status !== InvoiceStatus.ISSUED) return false;
    return new Date() > new Date(invoice.dueDate);
  }

  private daysUntilDue(invoice: Invoice): number {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private taxPercentage(invoice: Invoice): number {
    const amount = parseFloat(invoice.amount.toString());
    const tax = parseFloat(invoice.taxAmount.toString());
    if (amount <= 0) return 0;
    return Math.round(((tax / amount) * 100) * 100) / 100;
  }

  private canEdit(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.ISSUED;
  }

  private canCancel(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.ISSUED;
  }

  private canPay(invoice: Invoice, remainingAmount: number): boolean {
    return invoice.status === InvoiceStatus.ISSUED && remainingAmount > 0;
  }
}
