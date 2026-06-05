import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderService, OrderPart } from '../../../database/entities';
import { OrdersDataService } from './orders-data.service';

describe('OrdersDataService', () => {
  let service: OrdersDataService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn(),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(dto => ({ id: '1', ...dto })),
    update: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersDataService,
        { provide: getRepositoryToken(Order), useValue: mockRepo },
        { provide: getRepositoryToken(OrderService), useValue: {} },
        { provide: getRepositoryToken(OrderPart), useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersDataService>(OrdersDataService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  it('create() should set defaults and save', async () => {
    const res = await service.create({ companyId: 'c1' } as any);
    expect(res.status).toBe('new');
    expect(res.totalAmount).toBe(0);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('findWithFilters() should build query and return data', async () => {
    await service.findWithFilters({ companyId: 'c1', search: 'test', page: 2, limit: 10 });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.companyId = :companyId', { companyId: 'c1' });
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
  });

  it('findById() and findByIdForCompany() should query relations', async () => {
    await service.findById('1');
    expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ relations: expect.any(Array) }));
    
    await service.findByIdForCompany('1', 'c1');
    expect(mockRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '1', companyId: 'c1' } }));
  });

  it('update() should update and return new entity', async () => {
    mockRepo.findOne.mockResolvedValueOnce({ id: '1', status: 'completed' });
    const res = await service.update('1', { status: 'completed' } as any);
    expect(mockRepo.update).toHaveBeenCalled();
    expect(res.status).toBe('completed');
  });

  it('generateOrderNumber() should increment last number', async () => {
    const year = new Date().getFullYear();
    mockQueryBuilder.getOne.mockResolvedValueOnce({ orderNumber: `ORD-${year}-00042` });
    const res = await service.generateOrderNumber('c1');
    expect(res).toBe(`ORD-${year}-00043`);
  });

  it('getOrdersStatistics() should aggregate data', async () => {
    mockQueryBuilder.getCount.mockResolvedValue(10);
    mockQueryBuilder.getRawMany.mockResolvedValue([{ status: 'completed', count: '5' }]);
    mockQueryBuilder.getRawOne.mockResolvedValue({ totalAmount: '5000' });

    const res = await service.getOrdersStatistics('c1');
    expect(res.total).toBe(10);
    expect(res.byStatus['completed']).toBe(5);
    expect(res.totalAmount).toBe(5000);
  });
});
