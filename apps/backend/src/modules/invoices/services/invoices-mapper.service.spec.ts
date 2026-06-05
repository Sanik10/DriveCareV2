import { InvoicesMapperService } from './invoices-mapper.service';
import { InvoiceStatus } from '../types/invoices.types';
import { PaymentStatus } from '../../payments/types/payments.types';

describe('InvoicesMapperService', () => {
  let service: InvoicesMapperService;

  beforeEach(() => {
    service = new InvoicesMapperService();
  });

  const mockInvoice = {
    id: 'inv-1',
    companyId: 'comp-1',
    orderId: 'ord-1',
    invoiceNumber: 'INV-2023-00001',
    status: InvoiceStatus.ISSUED,
    issueDate: new Date('2023-01-01'),
    dueDate: new Date('2099-01-01'), // Future date to not be overdue
    amount: 1000,
    taxAmount: 200,
    totalAmount: 1200,
    notes: 'Test note',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: 'ord-1',
      orderNumber: 'ORD-1',
      status: 'completed',
      customer: { id: 'cust-1', firstName: 'John' },
      vehicle: { id: 'veh-1', licensePlate: 'A123AA', model: { name: 'Focus', brand: { name: 'Ford' } }, year: 2010 },
    },
    company: { id: 'comp-1', name: 'MyCompany' },
    payments: [
      { id: 'pay-1', amount: 500, status: PaymentStatus.PROCESSED, paymentMethod: { name: 'Card' } },
      { id: 'pay-2', amount: 100, status: PaymentStatus.PENDING }, // Should not be counted
    ],
  } as any;

  it('should map to response DTO with all relations', () => {
    const res = service.mapToResponseDto(mockInvoice);
    expect(res.id).toBe('inv-1');
    expect(res.totalAmount).toBe(1200);
    expect(res.paidAmount).toBe(500); // Only PROCESSED payment
    expect(res.remainingAmount).toBe(700);
    expect(res.taxPercentage).toBe(20);
    expect(res.vehicle?.displayName).toBe('Ford Focus 2010 A123AA');
    expect(res.payments.length).toBe(2);
    expect(res.payments[0].paymentMethod).toBe('Card');
    expect(res.isOverdue).toBe(false);
    expect(res.canEdit).toBe(true);
    expect(res.canPay).toBe(true);
  });

  it('should map without relations gracefully', () => {
    const minimalInvoice = {
      ...mockInvoice,
      order: undefined,
      company: undefined,
      payments: undefined,
      dueDate: new Date('2000-01-01'), // Overdue date
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
    } as any;

    const res = service.mapToResponseDto(minimalInvoice);
    expect(res.order).toBeUndefined();
    expect(res.customer).toBeUndefined();
    expect(res.company).toBeUndefined();
    expect(res.payments).toEqual([]);
    expect(res.paidAmount).toBe(0);
    expect(res.taxPercentage).toBe(0); // Test 0 amount division
    expect(res.isOverdue).toBe(true);
  });

  it('should map with userRole', () => {
    const resSuper = service.mapToResponseDto(mockInvoice, 'superadmin');
    expect(resSuper).toBeDefined();

    const resManager = service.mapToResponseDto(mockInvoice, 'manager');
    expect(resManager).toBeDefined();
  });

  it('should map array of invoices', () => {
    const res = service.mapArrayToResponseDto([mockInvoice], 'manager');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('inv-1');
  });

  it('should map to basic info', () => {
    const res = service.mapToBasicInfo(mockInvoice);
    expect(res.id).toBe('inv-1');
    expect(res.totalAmount).toBe(1200);
    expect(res.remainingAmount).toBe(700);
  });

  it('should map to select option', () => {
    const res = service.mapToSelectOption(mockInvoice);
    expect(res.value).toBe('inv-1');
    expect(res.label).toContain('INV-2023-00001');
    expect(res.disabled).toBe(false);

    const canceled = { ...mockInvoice, status: InvoiceStatus.CANCELED };
    const resCanceled = service.mapToSelectOption(canceled);
    expect(resCanceled.disabled).toBe(true);
  });
});
