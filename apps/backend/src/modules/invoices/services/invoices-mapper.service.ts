// src/modules/invoices/services/invoices-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Invoice, Payment } from '../../../database/entities';
import { InvoiceResponseDto } from '../dto/response/invoice-response.dto';
import { INVOICE_STATUS_DISPLAY } from '../constants/invoices.constants';
import { InvoiceStatus } from '../types/invoices.types';

@Injectable()
export class InvoicesMapperService {
  
  /**
   * 🎯 Основной маппинг Invoice Entity → ResponseDto
   */
  mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    const paidAmount = this.calculatePaidAmount(invoice.payments || []);
    const remainingAmount = Math.max(0, parseFloat(invoice.totalAmount.toString()) - paidAmount);
    
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      amount: parseFloat(invoice.amount.toString()),
      taxAmount: parseFloat(invoice.taxAmount.toString()),
      totalAmount: parseFloat(invoice.totalAmount.toString()),
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      
      // 🔗 Связанная информация (если загружена)
      order: invoice.order ? {
        id: invoice.order.id,
        orderNumber: invoice.order.orderNumber,
        status: invoice.order.status,
        description: invoice.order.description,
        createdAt: invoice.order.createdAt,
      } : undefined,
      
      customer: invoice.order?.customer ? {
        id: invoice.order.customer.id,
        firstName: invoice.order.customer.firstName,
        lastName: invoice.order.customer.lastName,
        companyName: invoice.order.customer.companyName,
        email: invoice.order.customer.email,
        phone: invoice.order.customer.phone,
        type: invoice.order.customer.type,
      } : undefined,
      
      vehicle: invoice.order?.vehicle ? {
        id: invoice.order.vehicle.id,
        vin: invoice.order.vehicle.vin,
        licensePlate: invoice.order.vehicle.licensePlate,
        year: invoice.order.vehicle.year,
        displayName: this.getVehicleDisplayName(invoice.order.vehicle),
      } : undefined,
      
      // 💰 Платежи
      payments: invoice.payments?.map(payment => ({
        id: payment.id,
        amount: parseFloat(payment.amount.toString()),
        paymentDate: payment.paymentDate,
        status: payment.status,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod?.name,
      })) || [],
      
      // 📊 Вычисляемые поля
      displayStatus: INVOICE_STATUS_DISPLAY[invoice.status] || invoice.status,
      isOverdue: this.checkIfOverdue(invoice),
      daysUntilDue: this.calculateDaysUntilDue(invoice),
      remainingAmount,
      paidAmount,
      taxPercentage: this.calculateTaxPercentage(invoice),
      canEdit: this.canEdit(invoice),
      canCancel: this.canCancel(invoice),
      canPay: this.canPay(invoice, remainingAmount),
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(invoices: Invoice[]): InvoiceResponseDto[] {
    return invoices.map(invoice => this.mapToResponseDto(invoice));
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
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

  /**
   * 🎯 Для селектов и выпадающих списков
   */
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

  /**
   * 🎯 Краткая информация для списков
   */
  mapToListItem(invoice: Invoice): {
    id: string;
    invoiceNumber: string;
    status: string;
    customerName: string;
    totalAmount: number;
    remainingAmount: number;
    dueDate: Date;
    isOverdue: boolean;
    daysUntilDue: number;
  } {
    const customerName = invoice.order?.customer 
      ? `${invoice.order.customer.firstName || ''} ${invoice.order.customer.lastName || ''}`.trim() || invoice.order.customer.companyName || 'Неизвестный клиент'
      : 'Неизвестный клиент';
    
    const paidAmount = this.calculatePaidAmount(invoice.payments || []);
    const totalAmount = parseFloat(invoice.totalAmount.toString());
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      customerName,
      totalAmount,
      remainingAmount,
      dueDate: invoice.dueDate,
      isOverdue: this.checkIfOverdue(invoice),
      daysUntilDue: this.calculateDaysUntilDue(invoice),
    };
  }

  /**
   * 💰 Расчет суммы платежей
   */
  private calculatePaidAmount(payments: Payment[]): number {
    return payments
      .filter(payment => payment.status === 'processed')
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
  }

  /**
   * 🚗 Формирование названия автомобиля
   */
  private getVehicleDisplayName(vehicle: any): string {
    const parts = [
      vehicle.model?.brand?.name,
      vehicle.model?.name,
      vehicle.year,
      vehicle.licensePlate
    ].filter(Boolean);
    
    return parts.join(' ') || 'Неизвестный автомобиль';
  }

  /**
   * ⏰ Проверка просрочки
   */
  private checkIfOverdue(invoice: Invoice): boolean {
    if (invoice.status !== InvoiceStatus.ISSUED) {
      return false;
    }
    
    return new Date() > new Date(invoice.dueDate);
  }

  /**
   * 📅 Расчет дней до просрочки
   */
  private calculateDaysUntilDue(invoice: Invoice): number {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 📊 Расчет процента налога
   */
  private calculateTaxPercentage(invoice: Invoice): number {
    const amount = parseFloat(invoice.amount.toString());
    const taxAmount = parseFloat(invoice.taxAmount.toString());
    
    if (amount <= 0) return 0;
    
    return Math.round((taxAmount / amount) * 100 * 100) / 100; // Округление до 2 знаков
  }

  /**
   * ✏️ Можно ли редактировать
   */
  private canEdit(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.ISSUED;
  }

  /**
   * ❌ Можно ли отменить
   */
  private canCancel(invoice: Invoice): boolean {
    return invoice.status === InvoiceStatus.ISSUED;
  }

  /**
   * 💳 Можно ли оплатить
   */
  private canPay(invoice: Invoice, remainingAmount: number): boolean {
    return invoice.status === InvoiceStatus.ISSUED && remainingAmount > 0;
  }
}
