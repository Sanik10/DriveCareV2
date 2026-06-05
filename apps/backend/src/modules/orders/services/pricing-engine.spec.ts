import { computeOrderTotals } from './pricing-engine';
import { Order, OrderPart, OrderService } from '../../../database/entities';

describe('PricingEngine', () => {
  it('should return zeros for empty order', () => {
    const order = {} as Order;
    const result = computeOrderTotals(order, { taxRate: 0.2 });
    expect(result.subtotal).toBe(0);
    expect(result.finalAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('should calculate standard taxable services and parts', () => {
    const order = {
      discountAmount: 0,
      orderServices: [{ totalAmount: 100, service: { taxable: true } }],
      orderParts: [{ totalAmount: 200, isCustomerProvided: false, part: { taxable: true } }],
    } as any;

    const result = computeOrderTotals(order, { taxRate: 0.2 });
    expect(result.servicesTotal).toBe(100);
    expect(result.partsTotal).toBe(200);
    expect(result.subtotal).toBe(300);
    expect(result.taxableBase).toBe(300);
    expect(result.taxAmount).toBe(60); // 300 * 0.2
    expect(result.finalAmount).toBe(360);
  });

  it('should exclude non-taxable items from tax base', () => {
    const order = {
      discountAmount: 0,
      orderServices: [
        { totalAmount: 100 }, // Taxable by default
        { totalAmount: 50, service: { taxable: false } }, // Non-taxable
      ],
      orderParts: [
        { totalAmount: 200, isCustomerProvided: true }, // Customer provided = non-taxable
        { totalAmount: 100, part: { taxable: false } }, // Master non-taxable
      ],
    } as any;

    const result = computeOrderTotals(order, { taxRate: 0.2 });
    expect(result.subtotal).toBe(450); // 100 + 50 + 200 + 100
    expect(result.taxableBase).toBe(100); // Only the first service is taxable
    expect(result.taxAmount).toBe(20); // 100 * 0.2
    expect(result.finalAmount).toBe(470); // 450 + 20
  });

  it('should proportionally distribute order discount on tax base', () => {
    const order = {
      discountAmount: 100, // global discount
      orderServices: [{ totalAmount: 200 }], // Taxable
      orderParts: [{ totalAmount: 200, isCustomerProvided: true }], // Non-taxable
    } as any;

    // Subtotal: 400. Taxable Base: 200 (50% of subtotal).
    // Discount on taxable: 100 * 0.5 = 50.
    // New tax base: 200 - 50 = 150.
    // Tax (20%): 30.
    // Final: 400 - 100 + 30 = 330.
    const result = computeOrderTotals(order, { taxRate: 0.2 });
    expect(result.subtotal).toBe(400);
    expect(result.taxableBase).toBe(150);
    expect(result.taxAmount).toBe(30);
    expect(result.finalAmount).toBe(330);
  });

  it('should handle NaN and bad types gracefully', () => {
    const order = {
      discountAmount: 'bad',
      orderServices: [{ totalAmount: NaN }],
      orderParts: [{ totalAmount: null }],
    } as any;

    const result = computeOrderTotals(order, { taxRate: 0.2 });
    expect(result.subtotal).toBe(0);
    expect(result.finalAmount).toBe(0);
  });
});
