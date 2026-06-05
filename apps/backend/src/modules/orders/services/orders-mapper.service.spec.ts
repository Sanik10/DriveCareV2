import { OrdersMapperService } from './orders-mapper.service';

describe('OrdersMapperService', () => {
  let service: OrdersMapperService;

  beforeEach(() => {
    service = new OrdersMapperService();
  });

  const mockOrder = {
    id: '1',
    status: 'in_progress',
    totalAmount: 1000,
    discountAmount: 100,
    taxAmount: 180,
    finalAmount: 1080,
    createdAt: new Date(),
    estimatedCompletionTime: new Date(Date.now() - 10000), // Overdue
    customer: { id: 'c1', firstName: 'John', email: 'john@example.com', phone: '1234567890' },
    vehicle: { id: 'v1', licensePlate: 'A123AA', model: { brand: { name: 'Ford' }, name: 'Focus' } },
    createdByUser: { email: 'a@b.com' },
    assignedToUser: { firstName: 'Mech' },
    orderServices: [{ id: 'os1', price: 100, totalAmount: 100, service: { price: 100 } }],
    orderParts: [{ id: 'op1', price: 50, totalAmount: 50, part: { name: 'Filter' } }],
  } as any;

  it('mapToResponseDto() should map full entity and mask data', () => {
    const res = service.mapToResponseDto(mockOrder);
    expect(res.id).toBe('1');
    expect(res.finalAmount).toBe(1080);
    // Проверка масок
    expect(res.customer?.email).toBe('jo***n@example.com');
    expect(res.customer?.phone).toBe('******7890');
    expect(res.createdByUser?.email).toBe('*@b.com'); // short email test
    
    // Вложенные элементы
    expect(res.orderServices.length).toBe(1);
    expect(res.orderParts.length).toBe(1);
    
    // Статусы и расчеты
    expect(res.displayStatus).toBe('В работе');
    expect(res.progressPercentage).toBe(50);
    expect(res.isOverdue).toBe(true);
  });

  it('mapToResponseDto() should handle missing relations gracefully', () => {
    const res = service.mapToResponseDto({ id: '1', status: 'new', totalAmount: 0, taxAmount: 0, finalAmount: 0, discountAmount: 0 } as any);
    expect(res.customer).toBeUndefined();
    expect(res.vehicle).toBeUndefined();
    expect(res.orderServices).toEqual([]);
    expect(res.orderParts).toEqual([]);
    expect(res.isOverdue).toBe(false); // No estimated completion time
  });

  it('mapArrayToResponseDto() should process arrays', () => {
    expect(service.mapArrayToResponseDto([mockOrder]).length).toBe(1);
  });

  it('mapToBasicInfo() should extract flat data', () => {
    const res = service.mapToBasicInfo(mockOrder);
    expect(res.id).toBe('1');
    expect(res.status).toBe('in_progress');
  });

  it('mapToSelectOption() should format for dropdowns', () => {
    const res = service.mapToSelectOption(mockOrder);
    expect(res.value).toBe('1');
    expect(res.disabled).toBe(false);
    
    const canceled = service.mapToSelectOption({ ...mockOrder, status: 'canceled' });
    expect(canceled.disabled).toBe(true);
  });

  it('mapToListItem() should format for tables', () => {
    const res = service.mapToListItem(mockOrder);
    expect(res.customerName).toContain('John');
    expect(res.vehicleInfo).toContain('Ford Focus A123AA');
    expect(res.totalAmount).toBe(1080);
  });

  it('mapToListItem() should handle missing customer/vehicle', () => {
    const res = service.mapToListItem({ id: '1', status: 'new', finalAmount: 0 } as any);
    expect(res.customerName).toBe('Неизвестный клиент');
    expect(res.vehicleInfo).toBe('Неизвестный автомобиль');
  });
});
