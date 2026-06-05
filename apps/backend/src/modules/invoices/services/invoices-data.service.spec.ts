import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from '../../../database/entities';
import { InvoicesDataService } from './invoices-data.service';
import { InvoiceStatus } from '../types/invoices.types';

describe('InvoicesDataService', () => {
  let service: InvoicesDataService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'uuid', ...dto })),
    findOne: jest.fn(),
    update: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesDataService,
        { provide: getRepositoryToken(Invoice), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<InvoicesDataService>(InvoicesDataService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  it('create() should save and return entity', async () => {
    const res = await service.create({ amount: 100 } as any);
    expect(res).toEqual({ id: 'uuid', amount: 100 });
  });

  it('findById() should query relations', async () => {
    mockRepo.findOne.mockResolvedValueOnce({ id: '1' });
    const res = await service.findById('1');
    expect(res).toBeDefined();
    expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ relations: expect.any(Array) }));
  });

  it('findByIdForCompany() should query with companyId', async () => {
    await service.findByIdForCompany('1', 'c1');
    expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '1', companyId: 'c1' } }));
  });

  it('findByOrderIdForCompany() should query with orderId', async () => {
    await service.findByOrderIdForCompany('o1', 'c1');
    expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { orderId: 'o1', companyId: 'c1' } }));
  });

  it('update() should update and return new entity', async () => {
    mockRepo.findOne.mockResolvedValueOnce({ id: '1', amount: 200 });
    const res = await service.update('1', { amount: 200 } as any);
    expect(mockRepo.update).toHaveBeenCalledWith('1', { amount: 200 });
    expect(res.amount).toBe(200);
  });

  it('update() should throw if not found after update', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.update('1', {} as any)).rejects.toThrow('not found after update');
  });

  it('findWithFilters() should call findAndCount', async () => {
    await service.findWithFilters({ companyId: 'c1' });
    expect(mockRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1' } }));
  });

  it('findOverdueInvoices() should search by status and date', async () => {
    await service.findOverdueInvoices('c1');
    expect(mockRepo.find).toHaveBeenCalled();
  });

  it('getInvoicesCountForCompany() should call count', async () => {
    await service.getInvoicesCountForCompany('c1');
    expect(mockRepo.count).toHaveBeenCalledWith({ where: { companyId: 'c1' } });
  });

  describe('getInvoicesStatistics', () => {
    it('should aggregate statistics using query builder', async () => {
      mockRepo.count.mockResolvedValueOnce(10);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([{ status: InvoiceStatus.PAID, count: '5' }]) // statuses count
        .mockResolvedValueOnce([{ status: InvoiceStatus.PAID, total: '1000' }, { status: InvoiceStatus.ISSUED, total: '500' }]); // amounts
      
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(2) // thisMonth
        .mockResolvedValueOnce(1); // overdueCount

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: '200' }); // overdueAmount

      const res = await service.getInvoicesStatistics('c1');
      
      expect(res.total).toBe(10);
      expect(res.byStatus[InvoiceStatus.PAID]).toBe(5);
      expect(res.paidAmount).toBe(1000);
      expect(res.pendingAmount).toBe(500);
      expect(res.overdueCount).toBe(1);
      expect(res.overdueAmount).toBe(200);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should start with 00001 if no previous', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const res = await service.generateInvoiceNumber('c1');
      expect(res).toContain('-00001');
    });

    it('should increment previous number', async () => {
      const year = new Date().getFullYear();
      mockQueryBuilder.getOne.mockResolvedValueOnce({ invoiceNumber: `INV-${year}-00042` });
      const res = await service.generateInvoiceNumber('c1');
      expect(res).toBe(`INV-${year}-00043`);
    });
  });
});
