import { Test, TestingModule } from '@nestjs/testing';
import { OrdersBusinessService } from './orders-business.service';
import { OrdersDataService } from './orders-data.service';
import { AuditService } from '../../../common/audit/audit.service';
import { OrdersValidationService } from './orders-validation.service';
import { OrderStatus } from '../types/orders.types';
import { ValidationDataException } from '../../../common/exceptions/domain.exceptions';

// Мокаем модуль pricing-engine, чтобы тестировать сервис изолированно
jest.mock('./pricing-engine', () => ({
  computeOrderTotals: jest.fn().mockReturnValue({
    subtotal: 1000,
    taxAmount: 200,
    finalAmount: 1200,
    servicesTotal: 500,
    partsTotal: 500,
    discountAmount: 0,
    rates: { taxRate: 0.2 },
  }),
}));

import { computeOrderTotals } from './pricing-engine';

describe('OrdersBusinessService', () => {
  let service: OrdersBusinessService;

  const mockDataService = {
    generateOrderNumber: jest.fn().mockResolvedValue('ORD-123'),
    create: jest.fn().mockImplementation((data) => ({ id: '1', ...data })),
    findById: jest.fn(),
    update: jest.fn().mockImplementation((id, data) => ({ id, ...data, orderNumber: 'ORD-123' })),
  };

  const mockAuditService = {
    logOrderCreated: jest.fn(),
    logOrderUpdated: jest.fn(),
    logOrderStatusChanged: jest.fn(),
    logOrderCompleted: jest.fn(),
    logOrderMechanicAssigned: jest.fn(),
    logOrderCanceled: jest.fn(),
    logOrderFinancialsRecalculated: jest.fn(),
  };

  const mockValidationService = {
    validateStatusTransition: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersBusinessService,
        { provide: OrdersDataService, useValue: mockDataService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: OrdersValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<OrdersBusinessService>(OrdersBusinessService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('createOrderForCompany', () => {
    it('should generate number, create and log', async () => {
      const res = await service.createOrderForCompany({ createdBy: 'u1' } as any, 'c1');
      expect(res.orderNumber).toBe('ORD-123');
      expect(res.companyId).toBe('c1');
      expect(mockAuditService.logOrderCreated).toHaveBeenCalled();
    });
  });

  describe('updateOrder', () => {
    it('throws if not found', async () => {
      mockDataService.findById.mockResolvedValueOnce(null);
      await expect(service.updateOrder('1', {}, 'u1')).rejects.toThrow('not found');
    });

    it('validates transition and sets completion time if status changes to COMPLETED', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      const res = await service.updateOrder('1', { status: OrderStatus.COMPLETED }, 'u1');
      
      expect(mockValidationService.validateStatusTransition).toHaveBeenCalledWith(OrderStatus.PENDING, OrderStatus.COMPLETED);
      expect(res.actualCompletionTime).toBeDefined(); // Sets completion date
      expect(mockAuditService.logOrderUpdated).toHaveBeenCalled();
    });
  });

  describe('changeOrderStatus', () => {
    it('throws if no assigned mechanic when changing to IN_PROGRESS', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING, assignedTo: null });
      await expect(service.changeOrderStatus('1', OrderStatus.IN_PROGRESS, 'u1')).rejects.toThrow(ValidationDataException);
    });

    it('sets completion time and logs differently when changing to COMPLETED', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.IN_PROGRESS, companyId: 'c1' });
      await service.changeOrderStatus('1', OrderStatus.COMPLETED, 'u1');
      
      expect(mockDataService.update).toHaveBeenCalledWith('1', expect.objectContaining({
        status: OrderStatus.COMPLETED,
        actualCompletionTime: expect.any(Date),
      }));
      expect(mockAuditService.logOrderCompleted).toHaveBeenCalled();
    });
  });

  describe('assignMechanicToOrder', () => {
    it('should update and log assignment', async () => {
      mockDataService.findById.mockResolvedValueOnce({ assignedTo: 'old' });
      await service.assignMechanicToOrder('1', 'new-mech', 'u1');
      expect(mockDataService.update).toHaveBeenCalledWith('1', expect.objectContaining({ assignedTo: 'new-mech' }));
      expect(mockAuditService.logOrderMechanicAssigned).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('throws if already completed', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.COMPLETED });
      await expect(service.cancelOrder('1', 'u1')).rejects.toThrow(/Нельзя отменить завершенный/);
    });

    it('cancels and logs', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      await service.cancelOrder('1', 'u1');
      expect(mockDataService.update).toHaveBeenCalledWith('1', expect.objectContaining({ status: OrderStatus.CANCELED }));
      expect(mockAuditService.logOrderCanceled).toHaveBeenCalled();
    });
  });

  describe('recalculateOrderFinancials', () => {
    it('uses computeOrderTotals and protects against NaN', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      
      // Имитируем, что движок вернул NaN и Infinity (плохие данные)
      (computeOrderTotals as jest.Mock).mockReturnValueOnce({
        subtotal: NaN,
        taxAmount: undefined,
        finalAmount: Infinity,
        servicesTotal: 500,
        partsTotal: null,
      });

      await service.recalculateOrderFinancials('1', 'u1');

      // Проверяем, что наша функция safe() превратила NaN и Infinity в 0
      expect(mockDataService.update).toHaveBeenCalledWith('1', expect.objectContaining({
        totalAmount: 0,
        taxAmount: 0,
        finalAmount: 0,
      }));
    });

    it('processes normal calculations', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      
      // Возвращаем нормальные значения для второго теста
      (computeOrderTotals as jest.Mock).mockReturnValueOnce({
        subtotal: 1000,
        taxAmount: 200,
        finalAmount: 1200,
        servicesTotal: 500,
        partsTotal: 500,
      });

      await service.recalculateOrderFinancials('1', 'u1');

      expect(mockDataService.update).toHaveBeenCalledWith('1', expect.objectContaining({
        totalAmount: 1000,
        taxAmount: 200,
        finalAmount: 1200,
      }));
    });
  });
});
