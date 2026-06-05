import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OrdersValidationService } from './orders-validation.service';
import { OrdersDataService } from './orders-data.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { Customer, Vehicle, User } from '../../../database/entities';
import { ValidationDataException, ResourceOwnershipException } from '../../../common/exceptions/domain.exceptions';
import { OrderStatus } from '../types/orders.types';

describe('OrdersValidationService', () => {
  let service: OrdersValidationService;

  const mockDataService = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    getOrdersCountForCompany: jest.fn().mockResolvedValue(0),
  };

  const mockLimitsService = {
    checkOrderLimit: jest.fn().mockResolvedValue({ allowed: true }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('true'), // Enforce limits
  };

  const mockUserQb = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockUserQb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersValidationService,
        { provide: OrdersDataService, useValue: mockDataService },
        { provide: SubscriptionLimitsService, useValue: mockLimitsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Customer), useValue: mockRepo },
        { provide: getRepositoryToken(Vehicle), useValue: mockRepo },
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<OrdersValidationService>(OrdersValidationService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  const user = { id: 'u1', companyId: 'c1' } as any;

  describe('validateCreateDataForUser', () => {
    it('throws if trying to create for another company', async () => {
      await expect(service.validateCreateDataForUser({ companyId: 'c2' } as any, user)).rejects.toThrow(ValidationDataException);
    });

    it('throws if customer or vehicle not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null); // customer fails
      await expect(service.validateCreateDataForUser({ customerId: 'c1', vehicleId: 'v1', createdBy: 'u1' } as any, user)).rejects.toThrow(/Клиент не найден/);
    });

    it('throws on subscription limits exceeded', async () => {
      mockLimitsService.checkOrderLimit.mockResolvedValueOnce({ allowed: false, limit: 10, currentCount: 10 });
      await expect(service.validateCreateDataForUser({ createdBy: 'u1' } as any, user)).rejects.toThrow(/Превышен лимит заказов/);
    });

    it('passes normal validation', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'ok' }); // customer & vehicle ok
      await expect(service.validateCreateDataForUser({ createdBy: 'u1', customerId: 'c', vehicleId: 'v' } as any, user)).resolves.not.toThrow();
    });
  });

  describe('validateUpdateData', () => {
    it('throws on invalid status transition', async () => {
      mockDataService.findById.mockResolvedValueOnce({ id: '1', status: OrderStatus.COMPLETED });
      await expect(service.validateUpdateData('1', { status: OrderStatus.IN_PROGRESS })).rejects.toThrow();
    });

    it('throws if changing order number or company', async () => {
      mockDataService.findById.mockResolvedValueOnce({ id: '1', orderNumber: 'ORD', companyId: 'c1' });
      await expect(service.validateUpdateData('1', { orderNumber: 'BAD' })).rejects.toThrow();
    });
  });

  describe('validateMechanicAssignment', () => {
    it('throws if order is completed', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.COMPLETED });
      await expect(service.validateMechanicAssignment('1', 'm1')).rejects.toThrow(/завершенный/);
    });

    it('throws if user has wrong role', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      mockUserQb.getOne.mockResolvedValueOnce({ role: { name: 'manager' } });
      await expect(service.validateMechanicAssignment('1', 'm1')).rejects.toThrow(/не является механиком/);
    });

    it('passes if role is mechanic', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.PENDING });
      mockUserQb.getOne.mockResolvedValueOnce({ role: { name: 'mechanic' } });
      await expect(service.validateMechanicAssignment('1', 'm1')).resolves.not.toThrow();
    });
  });

  describe('validateOrderCancellation', () => {
    it('throws if completed', async () => {
      mockDataService.findById.mockResolvedValueOnce({ status: OrderStatus.COMPLETED });
      await expect(service.validateOrderCancellation('1')).rejects.toThrow();
    });
  });

  describe('ownership and exists', () => {
    it('throws if order not found', async () => {
      mockDataService.findById.mockResolvedValueOnce(null);
      await expect(service.validateOrderExists('1')).rejects.toThrow();
    });

    it('throws if ownership mismatch', async () => {
      mockDataService.findByIdForCompany.mockResolvedValueOnce(null);
      await expect(service.validateOrderOwnership('1', 'c1')).rejects.toThrow(ResourceOwnershipException);
    });
  });
});
