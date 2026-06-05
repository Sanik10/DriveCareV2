import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, Payment } from '../../../database/entities';
import { InvoicesBusinessService } from './invoices-business.service';
import { InvoicesDataService } from './invoices-data.service';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { InvoiceStatus } from '../types/invoices.types';
import { PaymentStatus } from '../../payments/types/payments.types';

describe('InvoicesBusinessService', () => {
  let service: InvoicesBusinessService;

  const mockDataService = {
    getInvoicesCountForCompany: jest.fn(),
    generateInvoiceNumber: jest.fn().mockResolvedValue('INV-123'),
    create: jest.fn().mockImplementation((d) => ({ id: 'new-inv', ...d })),
    findByOrderIdForCompany: jest.fn(),
    update: jest.fn().mockImplementation((id, d) => ({ id, ...d, invoiceNumber: 'INV' })),
    findById: jest.fn(),
    findOverdueInvoices: jest.fn().mockResolvedValue([]),
    findWithFilters: jest.fn().mockResolvedValue([[]]),
  };
  const mockAuditService = { log: jest.fn() };
  const mockLimitsService = { checkOrderLimit: jest.fn().mockResolvedValue({ allowed: true }) };
  const mockOrderRepo = { findOne: jest.fn() };
  const mockPaymentRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesBusinessService,
        { provide: InvoicesDataService, useValue: mockDataService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: SubscriptionLimitsService, useValue: mockLimitsService },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
      ],
    }).compile();

    service = module.get<InvoicesBusinessService>(InvoicesBusinessService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  const user = { id: 'u1', companyId: 'c1' } as any;

  describe('createInvoiceForCompany', () => {
    it('should calculate amounts and generate number if absent', async () => {
      const data = { amount: 100, orderId: 'o1' } as any;
      const res = await service.createInvoiceForCompany(data, 'c1', user);
      
      expect(res.invoiceNumber).toBe('INV-123');
      expect(res.totalAmount).toBeGreaterThan(100); // 100 + tax
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('createInvoiceFromOrder', () => {
    it('should throw if order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.createInvoiceFromOrder('o1', 'c1', user)).rejects.toThrow('not found');
    });

    it('should throw if order not completed', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({ status: 'pending' });
      await expect(service.createInvoiceFromOrder('o1', 'c1', user)).rejects.toThrow('must be completed');
    });

    it('should throw if invoice already exists', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({ status: 'completed' });
      mockDataService.findByOrderIdForCompany.mockResolvedValueOnce({ id: '1' });
      await expect(service.createInvoiceFromOrder('o1', 'c1', user)).rejects.toThrow('already exists');
    });

    it('should apply discount and create', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({ status: 'completed', totalAmount: 1000, customer: { companyName: 'Client' } });
      mockDataService.findByOrderIdForCompany.mockResolvedValueOnce(null);
      
      const res = await service.createInvoiceFromOrder('o1', 'c1', user, { discountPercent: 10 });
      expect(mockDataService.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 900 })); // 1000 - 10%
    });
  });

  describe('updateInvoice', () => {
    it('should recalculate if amount changes', async () => {
      await service.updateInvoice('id1', { amount: 200 } as any, user);
      expect(mockDataService.update).toHaveBeenCalledWith('id1', expect.objectContaining({ amount: 200, totalAmount: expect.any(Number) }));
    });
  });

  describe('changeInvoiceStatus', () => {
    it('should throw if invoice not found', async () => {
      mockDataService.findById.mockResolvedValueOnce(null);
      await expect(service.changeInvoiceStatus('id1', InvoiceStatus.PAID, user)).rejects.toThrow('not found');
    });

    it('should throw if transition not allowed', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: InvoiceStatus.PAID });
      await expect(service.changeInvoiceStatus('id1', InvoiceStatus.ISSUED, user)).rejects.toThrow('Cannot change');
    });

    it('should update status and log', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: InvoiceStatus.ISSUED, invoiceNumber: '1' });
      await service.changeInvoiceStatus('id1', InvoiceStatus.PAID, user);
      expect(mockDataService.update).toHaveBeenCalledWith('id1', { status: InvoiceStatus.PAID });
    });
  });

  describe('cancelInvoice', () => {
    it('should throw if payments exist', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: InvoiceStatus.ISSUED, invoiceNumber: '1' });
      mockPaymentRepo.find.mockResolvedValueOnce([{ id: 'p1' }]);
      await expect(service.cancelInvoice('id1', user)).rejects.toThrow('payments have been received');
    });

    it('should cancel if valid', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: InvoiceStatus.ISSUED });
      mockPaymentRepo.find.mockResolvedValueOnce([]);
      await service.cancelInvoice('id1', user);
      expect(mockDataService.update).toHaveBeenCalledWith('id1', { status: InvoiceStatus.CANCELED });
    });
  });

  describe('processPaymentReceived', () => {
    it('should auto-mark paid if fully paid', async () => {
      mockDataService.findById.mockResolvedValue({ status: InvoiceStatus.ISSUED, totalAmount: 100 });
      mockPaymentRepo.find.mockResolvedValueOnce([{ amount: 50 }]);
      await service.processPaymentReceived('id1', 50, user);
      
      // Auto-changed to PAID
      expect(mockDataService.update).toHaveBeenCalledWith('id1', { status: InvoiceStatus.PAID });
    });
  });

  describe('processOverdueInvoices', () => {
    it('should auto-cancel heavily overdue invoices', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // > 30 days
      mockDataService.findOverdueInvoices.mockResolvedValueOnce([{ id: 'id1', dueDate: oldDate, totalAmount: 100 }]);
      
      const res = await service.processOverdueInvoices('c1');
      expect(res.processed).toBe(1);
      expect(mockDataService.update).toHaveBeenCalledWith('id1', { status: InvoiceStatus.CANCELED });
    });
  });
});
