import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from '../../../database/entities';
import { InvoicesValidationService } from './invoices-validation.service';
import { InvoicesDataService } from './invoices-data.service';
import { ResourceOwnershipException, ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { InvoiceStatus } from '../types/invoices.types';
import { InvoiceFiscalizationStatus } from '../../../database/entities/invoice.entity';

describe('InvoicesValidationService', () => {
  let service: InvoicesValidationService;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getOne: jest.fn().mockResolvedValue(null),
  };

  const mockRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockDataService = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesValidationService,
        { provide: InvoicesDataService, useValue: mockDataService },
        { provide: getRepositoryToken(Invoice), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<InvoicesValidationService>(InvoicesValidationService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  const admin = { role: 'company_admin', companyId: 'c1' } as any;
  const cashier = { role: 'cashier', companyId: 'c1' } as any;
  const superadmin = { role: 'superadmin' } as any;

  describe('validateCreateDataForUser', () => {
    it('throws ResourceOwnershipException for wrong company', async () => {
      await expect(service.validateCreateDataForUser({ companyId: 'c2' } as any, admin))
        .rejects.toThrow(ResourceOwnershipException);
    });

    it('throws ValidationDataException for bad role', async () => {
      await expect(service.validateCreateDataForUser({ companyId: 'c1' } as any, cashier))
        .rejects.toThrow(/не может создавать/);
    });

    it('throws for bad amount', async () => {
      await expect(service.validateCreateDataForUser({ companyId: 'c1', amount: -1 } as any, admin))
        .rejects.toThrow(/Сумма должна быть не менее/);
      
      await expect(service.validateCreateDataForUser({ companyId: 'c1', amount: 999999999999 } as any, admin))
        .rejects.toThrow(/Сумма не должна превышать/);
    });

    it('throws for bad due date', async () => {
      const pastDate = new Date('2000-01-01');
      await expect(service.validateCreateDataForUser({ companyId: 'c1', amount: 100, dueDate: pastDate } as any, admin))
        .rejects.toThrow(/Срок оплаты раньше/);
    });

    it('passes validation for valid data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await expect(service.validateCreateDataForUser({ companyId: 'c1', amount: 100, dueDate: futureDate } as any, admin))
        .resolves.not.toThrow();
    });
  });

  describe('validateUpdateDataForUser', () => {
    beforeEach(() => {
      mockDataService.findById.mockResolvedValue({ id: '1', companyId: 'c1', status: InvoiceStatus.ISSUED });
    });

    it('throws for paid invoice', async () => {
      mockDataService.findById.mockResolvedValueOnce({ id: '1', companyId: 'c1', status: InvoiceStatus.PAID });
      await expect(service.validateUpdateDataForUser('1', {}, admin)).rejects.toThrow(/Нельзя редактировать оплаченный/);
    });

    it('throws if payments exist and restricted fields are updated', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(1); // has payments
      await expect(service.validateUpdateDataForUser('1', { amount: 200 } as any, admin))
        .rejects.toThrow(/Нельзя изменять первичные реквизиты/);
    });
    
    it('throws on XSS in notes', async () => {
      await expect(service.validateUpdateDataForUser('1', { notes: '<script>alert()</script>' } as any, admin))
        .rejects.toThrow(/Примечания содержат недопустимые символы/);
    });

    it('passes for safe fields even if fiscalized', async () => {
      mockDataService.findById.mockResolvedValueOnce({ id: '1', companyId: 'c1', status: InvoiceStatus.ISSUED, fiscalizationStatus: InvoiceFiscalizationStatus.DONE });
      await expect(service.validateUpdateDataForUser('1', { notes: 'Safe note' } as any, admin)).resolves.not.toThrow();
    });
  });

  describe('validateStatusChangeForUser', () => {
    it('throws on illegal transition', async () => {
      mockDataService.findById.mockResolvedValue({ id: '1', companyId: 'c1', status: InvoiceStatus.PAID });
      await expect(service.validateStatusChangeForUser('1', InvoiceStatus.ISSUED, admin))
        .rejects.toThrow(/Невозможно изменить статус/);
    });
  });

  describe('validateInvoiceCancellationForUser', () => {
    it('throws if invoice has payments', async () => {
      mockDataService.findById.mockResolvedValue({ id: '1', companyId: 'c1', status: InvoiceStatus.ISSUED });
      mockQueryBuilder.getCount.mockResolvedValueOnce(1);
      await expect(service.validateInvoiceCancellationForUser('1', admin))
        .rejects.toThrow(/Нельзя отменить счет с принятыми платежами/);
    });

    it('allows superadmin', async () => {
      mockDataService.findById.mockResolvedValue({ id: '1', companyId: 'c1', status: InvoiceStatus.ISSUED });
      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      await expect(service.validateInvoiceCancellationForUser('1', superadmin)).resolves.not.toThrow();
    });
  });

  describe('validateInvoiceOwnership and Exists', () => {
    it('throws if not exists', async () => {
      mockDataService.findById.mockResolvedValue(null);
      await expect(service.validateInvoiceExists('1')).rejects.toThrow(/не найден/);
    });

    it('throws if no ownership', async () => {
      mockDataService.findByIdForCompany.mockResolvedValue(null);
      await expect(service.validateInvoiceOwnership('1', 'c1')).rejects.toThrow(ResourceOwnershipException);
    });
  });

  describe('validateInvoiceNumber', () => {
    it('throws on invalid pattern', async () => {
      await expect(service.validateInvoiceNumber('BAD-NUM', 'c1')).rejects.toThrow(/соответствовать формату/);
    });

    it('throws on duplicate', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: '2' });
      await expect(service.validateInvoiceNumber('INV-2023-00001', 'c1')).rejects.toThrow(/уже существует/);
    });
  });
});
