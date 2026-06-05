import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersDataService } from './services/orders-data.service';
import { OrdersBusinessService } from './services/orders-business.service';
import { OrdersValidationService } from './services/orders-validation.service';
import { OrdersMapperService } from './services/orders-mapper.service';
import { OrderStatus } from './types/orders.types';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockDataService = {
    findWithFilters: jest.fn().mockResolvedValue([[], 0]),
    findById: jest.fn(),
  };
  const mockBusinessService = {
    createOrderForCompany: jest.fn().mockResolvedValue({ id: '1', orderNumber: 'ORD-1' }),
    updateOrder: jest.fn().mockResolvedValue({ id: '1' }),
    changeOrderStatus: jest.fn().mockResolvedValue({ id: '1' }),
    assignMechanicToOrder: jest.fn().mockResolvedValue({ id: '1' }),
    cancelOrder: jest.fn(),
    recalculateOrderFinancials: jest.fn().mockResolvedValue({ id: '1' }),
  };
  const mockValidationService = {
    validateCreateDataForUser: jest.fn(),
    validateOrderExists: jest.fn().mockResolvedValue({ id: '1', status: OrderStatus.PENDING }),
    validateUpdateData: jest.fn(),
    validateStatusTransition: jest.fn(),
    validateMechanicAssignment: jest.fn(),
    validateOrderCancellation: jest.fn(),
  };
  const mockMapperService = {
    mapToResponseDto: jest.fn().mockReturnValue('dto'),
    mapArrayToResponseDto: jest.fn().mockReturnValue(['dto']),
    mapToBasicInfo: jest.fn().mockReturnValue('basic'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersDataService, useValue: mockDataService },
        { provide: OrdersBusinessService, useValue: mockBusinessService },
        { provide: OrdersValidationService, useValue: mockValidationService },
        { provide: OrdersMapperService, useValue: mockMapperService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  const user = { id: 'u1', companyId: 'c1' } as any;

  it('createForUser() should orchestrate creation', async () => {
    expect(await service.createForUser({} as any, user)).toBe('dto');
    expect(mockValidationService.validateCreateDataForUser).toHaveBeenCalled();
    expect(mockBusinessService.createOrderForCompany).toHaveBeenCalled();
  });

  it('findAll() should mask safe filters and paginate', async () => {
    mockDataService.findWithFilters.mockResolvedValueOnce([[{ id: '1' }], 1]);
    const res = await service.findAll({ search: 'query', page: 1, limit: 10 });
    expect(res.total).toBe(1);
    expect(res.items).toEqual(['dto']);
  });

  it('findOne() should validate and map', async () => {
    expect(await service.findOne('id')).toBe('dto');
    expect(mockValidationService.validateOrderExists).toHaveBeenCalledWith('id');
  });

  it('update() should validate and process update', async () => {
    expect(await service.update('id', {} as any, user)).toBe('dto');
    expect(mockValidationService.validateUpdateData).toHaveBeenCalledWith('id', {});
    expect(mockBusinessService.updateOrder).toHaveBeenCalled();
  });

  it('updateStatus() should validate transition and process', async () => {
    expect(await service.updateStatus('id', OrderStatus.IN_PROGRESS, user)).toBe('dto');
    expect(mockValidationService.validateStatusTransition).toHaveBeenCalled();
    expect(mockBusinessService.changeOrderStatus).toHaveBeenCalled();
  });

  it('assignMechanic() should validate and assign', async () => {
    expect(await service.assignMechanic('id', 'mech', user)).toBe('dto');
    expect(mockValidationService.validateMechanicAssignment).toHaveBeenCalledWith('id', 'mech');
  });

  it('cancelOrder() should validate and cancel', async () => {
    await service.cancelOrder('id', user);
    expect(mockValidationService.validateOrderCancellation).toHaveBeenCalledWith('id');
    expect(mockBusinessService.cancelOrder).toHaveBeenCalledWith('id', user.id);
  });

  it('recalculateOrderTotals() should process financial recalc', async () => {
    expect(await service.recalculateOrderTotals('id', user)).toBe('dto');
    expect(mockValidationService.validateOrderExists).toHaveBeenCalledWith('id');
  });

  it('exists() should return true/false', async () => {
    mockDataService.findById.mockResolvedValueOnce(true);
    expect(await service.exists('id')).toBe(true);
  });

  it('getOrderInfo() should return basic info', async () => {
    mockDataService.findById.mockResolvedValueOnce(true);
    expect(await service.getOrderInfo('id')).toBe('basic');
    
    mockDataService.findById.mockResolvedValueOnce(null);
    expect(await service.getOrderInfo('id')).toBe(null);
  });
});
