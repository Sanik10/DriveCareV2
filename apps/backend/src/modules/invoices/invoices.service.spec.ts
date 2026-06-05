import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { InvoicesDataService } from './services/invoices-data.service';
import { InvoicesBusinessService } from './services/invoices-business.service';
import { InvoicesValidationService } from './services/invoices-validation.service';
import { InvoicesMapperService } from './services/invoices-mapper.service';
import { InvoiceStatus } from './types/invoices.types';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockDataService = {
    findWithFilters: jest.fn().mockResolvedValue([[], 0]),
    getInvoicesStatistics: jest.fn().mockResolvedValue({ totalAmount: 100, paidAmount: 50, overdueCount: 1, total: 2 }),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    getInvoicesCountForCompany: jest.fn(),
    findOverdueInvoices: jest.fn().mockResolvedValue([]),
  };
  const mockBusinessService = {
    createInvoiceForCompany: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    createInvoiceFromOrder: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    updateInvoice: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    changeInvoiceStatus: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    cancelInvoice: jest.fn(),
    processPaymentReceived: jest.fn().mockResolvedValue({ id: 'inv-1' }),
  };
  const mockValidationService = {
    validateCreateDataForUser: jest.fn(),
    validateInvoiceExists: jest.fn().mockResolvedValue({ id: 'inv-1', companyId: 'comp-1', status: InvoiceStatus.ISSUED }),
    validateUpdateDataForUser: jest.fn(),
    validateStatusTransition: jest.fn(),
    validateInvoiceCancellationForUser: jest.fn(),
  };
  const mockMapperService = {
    mapToResponseDto: jest.fn().mockReturnValue('mapped-dto'),
    mapArrayToResponseDto: jest.fn().mockReturnValue(['mapped-dto']),
    mapToBasicInfo: jest.fn().mockReturnValue('basic-info'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: InvoicesDataService, useValue: mockDataService },
        { provide: InvoicesBusinessService, useValue: mockBusinessService },
        { provide: InvoicesValidationService, useValue: mockValidationService },
        { provide: InvoicesMapperService, useValue: mockMapperService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  const user = { id: 'u1', companyId: 'comp-1', role: 'manager' } as any;
  const superadmin = { id: 'sa', role: 'superadmin' } as any;

  it('createForUser() should validate, create and map', async () => {
    const dto = { dueDate: '2023-10-10' } as any;
    expect(await service.createForUser(dto, user)).toBe('mapped-dto');
    expect(mockValidationService.validateCreateDataForUser).toHaveBeenCalled();
    expect(mockBusinessService.createInvoiceForCompany).toHaveBeenCalled();
  });

  it('createFromOrder() should create and map', async () => {
    expect(await service.createFromOrder({ orderId: 'o1' } as any, user)).toBe('mapped-dto');
    expect(mockBusinessService.createInvoiceFromOrder).toHaveBeenCalled();
  });

  it('findAll() should fetch data and calculate pagination', async () => {
    mockDataService.findWithFilters.mockResolvedValue([[{ id: '1' }], 1]);
    const res = await service.findAll({ page: 1, limit: 10 }, user);
    expect(res.total).toBe(1);
    expect(res.totalPages).toBe(1);
  });

  it('findOne() should throw if company mismatch', async () => {
    mockValidationService.validateInvoiceExists.mockResolvedValueOnce({ companyId: 'other-comp' });
    await expect(service.findOne('id', user)).rejects.toThrow('Access denied');
  });

  it('update() should validate and update', async () => {
    expect(await service.update('id', {} as any, user)).toBe('mapped-dto');
  });

  it('updateStatus() should validate and update status', async () => {
    expect(await service.updateStatus('id', InvoiceStatus.PAID, user)).toBe('mapped-dto');
  });

  it('cancel() should validate and cancel', async () => {
    await service.cancel('id', user);
    expect(mockBusinessService.cancelInvoice).toHaveBeenCalled();
  });

  it('processPayment() should process payment', async () => {
    expect(await service.processPayment('id', 100, user)).toBe('mapped-dto');
  });

  it('getStatistics() should throw if no company for normal user', async () => {
    await expect(service.getStatistics({ role: 'manager' } as any)).rejects.toThrow('Company ID is required');
  });

  it('getStatistics() should return stats for superadmin', async () => {
    const res = await service.getStatistics(superadmin);
    expect(res.averagePaymentTime).toBe(15);
  });

  it('exists() should return true/false', async () => {
    mockDataService.findById.mockResolvedValueOnce(true);
    expect(await service.exists('1')).toBe(true);
  });

  it('getInvoiceInfo() should return basic info', async () => {
    mockDataService.findById.mockResolvedValueOnce(true);
    expect(await service.getInvoiceInfo('1')).toBe('basic-info');
  });

  it('belongsToCompany() should return boolean', async () => {
    mockDataService.findByIdForCompany.mockResolvedValueOnce(true);
    expect(await service.belongsToCompany('1', 'c1')).toBe(true);
  });

  it('getInvoicesCountForCompany() should call data service', async () => {
    mockDataService.getInvoicesCountForCompany.mockResolvedValueOnce(5);
    expect(await service.getInvoicesCountForCompany('c1')).toBe(5);
  });

  it('getOverdueInvoices() should calculate totals', async () => {
    mockDataService.findOverdueInvoices.mockResolvedValueOnce([
      { totalAmount: 100, dueDate: '2023-01-01', order: { customerId: 'c1' } }
    ]);
    const res = await service.getOverdueInvoices(user);
    expect(res.totalAmount).toBe(100);
    expect(res.byCustomer.length).toBe(1);
  });

  it('search() should call data service search', async () => {
    mockDataService.findWithFilters.mockResolvedValueOnce([[{ id: '1' }], 1]);
    expect(await service.search('q', user)).toEqual(['mapped-dto']);
  });

  it('getForSelect() should format options', async () => {
    mockDataService.findWithFilters.mockResolvedValueOnce([[{ id: '1', invoiceNumber: 'INV', totalAmount: 100 }], 1]);
    const res = await service.getForSelect(user);
    expect(res[0].label).toContain('INV');
  });
});
