import { jest } from '@jest/globals';
import { db } from '../db';
import { storage } from '../storage';

// Mock the db
jest.mock('../db', () => ({
  db: {
    transaction: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockTransaction = db.transaction as jest.MockedFunction<typeof db.transaction>;
const _mockInsert = db.insert as jest.Mock;
const _mockSelect = db.select as jest.Mock;
const _mockDelete = db.delete as jest.Mock;

describe('DatabaseStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully with transaction', async () => {
      const mockResult = { id: '1', status: 'inProduction' };
      mockTransaction.mockResolvedValue(mockResult);

      const result = await storage.updateOrderStatus('1', 'inProduction');

      expect(mockTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should return undefined on conflict (optimistic locking)', async () => {
      mockTransaction.mockResolvedValue(undefined);

      const result = await storage.updateOrderStatus('1', 'inProduction', undefined, new Date());

      expect(result).toBeUndefined();
    });
  });

  describe('updateOrderPaymentStatus', () => {
    it('should update payment status with transaction', async () => {
      const mockResult = { id: '1', paymentStatus: 'fullyPaid' };
      mockTransaction.mockResolvedValue(mockResult);

      const result = await storage.updateOrderPaymentStatus('1', 'fullyPaid');

      expect(mockTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateOrder', () => {
    it('should update order with transaction', async () => {
      const mockResult = { id: '1', projectName: 'Updated Project' };
      mockTransaction.mockResolvedValue(mockResult);

      const result = await storage.updateOrder('1', { projectName: 'Updated Project' });

      expect(mockTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

});