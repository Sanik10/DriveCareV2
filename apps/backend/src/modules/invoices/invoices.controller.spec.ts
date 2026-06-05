import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceStatus } from './types/invoices.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: InvoicesService;

  const mockUser = { id: 'user-1', companyId: 'company-1', role: 'manager', email: 'test@test.com' };
  const mockReq = { user: mockUser };

  const mockInvoicesService = {
    createForUser: jest.fn(),
    createFromOrder: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    cancel: jest.fn(),
    getStatistics: jest.fn(),
    getOverdueInvoices: jest.fn(),
    search: jest.fn(),
    getForSelect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: mockInvoicesService }],
    })
      // Отключаем реальные Guard'ы и Interceptor'ы, чтобы они не требовали БД/Redis
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideInterceptor(AuditLoggingInterceptor).useValue({
        intercept: (context: ExecutionContext, next: any) => next.handle(),
      })
      .overridePipe(EnhancedValidationPipe).useValue({
        transform: (value: any) => value,
      })
      .compile();

    controller = module.get<InvoicesController>(InvoicesController);
    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call service', async () => {
    const dto = { amount: 100 } as any;
    mockInvoicesService.createForUser.mockResolvedValue('result');
    expect(await controller.create(dto, mockReq as any)).toBe('result');
    expect(service.createForUser).toHaveBeenCalledWith(dto, mockUser);
  });

  it('createFromOrder() should call service', async () => {
    const dto = { orderId: 'order-1' } as any;
    mockInvoicesService.createFromOrder.mockResolvedValue('result');
    expect(await controller.createFromOrder(dto, mockReq as any)).toBe('result');
    expect(service.createFromOrder).toHaveBeenCalledWith(dto, mockUser);
  });

  it('findAll() should build filter and call service', async () => {
    mockInvoicesService.findAll.mockResolvedValue('paginated-result');
    const result = await controller.findAll(mockReq as any, 'order-1', undefined, InvoiceStatus.ISSUED, '2023-01-01', undefined, undefined, undefined, 100, 500, 'search', true, 2, 20);
    
    expect(result).toBe('paginated-result');
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1',
      status: InvoiceStatus.ISSUED,
      amountFrom: 100,
      amountTo: 500,
      search: 'search',
      includeOverdue: true,
      page: 2,
      limit: 20
    }), mockUser);
  });

  it('findOne() should call service', async () => {
    mockInvoicesService.findOne.mockResolvedValue('result');
    expect(await controller.findOne('uuid', mockReq as any)).toBe('result');
    expect(service.findOne).toHaveBeenCalledWith('uuid', mockUser);
  });

  it('update() should call service', async () => {
    mockInvoicesService.update.mockResolvedValue('result');
    expect(await controller.update('uuid', {} as any, mockReq as any)).toBe('result');
    expect(service.update).toHaveBeenCalledWith('uuid', {}, mockUser);
  });

  it('updateStatus() should call service', async () => {
    mockInvoicesService.updateStatus.mockResolvedValue('result');
    expect(await controller.updateStatus('uuid', InvoiceStatus.PAID, mockReq as any)).toBe('result');
    expect(service.updateStatus).toHaveBeenCalledWith('uuid', InvoiceStatus.PAID, mockUser);
  });

  it('cancel() should call service', async () => {
    mockInvoicesService.cancel.mockResolvedValue(undefined);
    await controller.cancel('uuid', mockReq as any);
    expect(service.cancel).toHaveBeenCalledWith('uuid', mockUser);
  });

  it('getStatistics() should call service', async () => {
    mockInvoicesService.getStatistics.mockResolvedValue('stats');
    expect(await controller.getStatistics(mockReq as any)).toBe('stats');
  });

  it('getOverdueReport() should call service', async () => {
    mockInvoicesService.getOverdueInvoices.mockResolvedValue('report');
    expect(await controller.getOverdueReport(mockReq as any)).toBe('report');
  });

  it('search() should call service', async () => {
    mockInvoicesService.search.mockResolvedValue(['res']);
    expect(await controller.search('query', mockReq as any)).toEqual(['res']);
    expect(service.search).toHaveBeenCalledWith('query', mockUser);
  });

  it('getForSelect() should call service', async () => {
    mockInvoicesService.getForSelect.mockResolvedValue(['options']);
    expect(await controller.getForSelect(mockReq as any, InvoiceStatus.ISSUED)).toEqual(['options']);
    expect(service.getForSelect).toHaveBeenCalledWith(mockUser, { status: InvoiceStatus.ISSUED });
  });
});
