import { OrdersController } from './orders.controller';
import { OrderStatus } from './types/orders.types';

describe('OrdersController (Isolated)', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    createForUser: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    assignMechanic: jest.fn(),
    cancelOrder: jest.fn(),
    recalculateOrderTotals: jest.fn(),
  } as any;

  const mockUser = { id: 'u1', companyId: 'c1', role: 'manager' };
  const mockReq = { user: mockUser } as any;

  beforeEach(() => {
    // Тестируем контроллер как обычный класс (без создания модуля NestJS), 
    // чтобы обойти сложные композитные декораторы Guard'ов
    controller = new OrdersController(mockOrdersService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  it('create() should call service', async () => {
    mockOrdersService.createForUser.mockResolvedValue('res');
    expect(await controller.create({ description: 'Test' } as any, mockReq)).toBe('res');
  });

  it('findAll() should build filter and call service', async () => {
    mockOrdersService.findAll.mockResolvedValue('paginated');
    const result = await controller.findAll(mockReq, 'cust-1', 'veh-1', OrderStatus.PENDING, 'mech-1', 'search', 2, 20);
    expect(result).toBe('paginated');
    expect(mockOrdersService.findAll).toHaveBeenCalledWith({
      customerId: 'cust-1',
      vehicleId: 'veh-1',
      status: OrderStatus.PENDING,
      assignedTo: 'mech-1',
      search: 'search',
      page: 2,
      limit: 20,
      companyId: 'c1',
    });
  });

  it('findOne() should call service', async () => {
    mockOrdersService.findOne.mockResolvedValue('res');
    expect(await controller.findOne('id')).toBe('res');
  });

  it('update() should call service', async () => {
    mockOrdersService.update.mockResolvedValue('res');
    expect(await controller.update('id', { description: 'New' } as any, mockReq)).toBe('res');
  });

  it('updateStatus() should call service', async () => {
    mockOrdersService.updateStatus.mockResolvedValue('res');
    expect(await controller.updateStatus('id', OrderStatus.IN_PROGRESS, mockReq)).toBe('res');
  });

  it('assignMechanic() should call service', async () => {
    mockOrdersService.assignMechanic.mockResolvedValue('res');
    expect(await controller.assignMechanic('id', 'mech-1', mockReq)).toBe('res');
  });

  it('cancelOrder() should call service', async () => {
    mockOrdersService.cancelOrder.mockResolvedValue(undefined);
    await controller.cancelOrder('id', mockReq);
  });

  it('recalculateOrderTotals() should call service', async () => {
    mockOrdersService.recalculateOrderTotals.mockResolvedValue('res');
    expect(await controller.recalculateOrderTotals('id', mockReq)).toBe('res');
  });
});
