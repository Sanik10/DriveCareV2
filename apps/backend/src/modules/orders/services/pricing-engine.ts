// path: apps/backend/src/modules/orders/services/pricing-engine.ts
import { Order, OrderPart, OrderService as OrderServiceEntity } from '../../../database/entities'
import { ORDERS_CONSTANTS } from '../constants/orders.constants'

type NumLike = number | string | null | undefined

function toNum(n: NumLike): number {
  if (n === null || n === undefined) return 0
  if (typeof n === 'number') return n
  const parsed = parseFloat(String(n))
  return isNaN(parsed) ? 0 : parsed
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveTaxRate(): number {
  const env = process.env.ORDERS_TAX_RATE
  if (env && !isNaN(parseFloat(env))) return parseFloat(env)
  // Fallback to constants default
  return ORDERS_CONSTANTS.DEFAULTS.TAX_RATE
}

function isServiceTaxable(os: OrderServiceEntity): boolean {
  // Prefer service master flag if present, otherwise taxable by default
  const svc: any = (os as any).service
  if (svc && typeof svc.taxable === 'boolean') return !!svc.taxable
  return true
}

function isPartTaxable(op: OrderPart): boolean {
  // Customer-provided parts are not taxable; otherwise prefer part master flag if present
  if (op.isCustomerProvided) return false
  const part: any = (op as any).part
  if (part && typeof part.taxable === 'boolean') return !!part.taxable
  return true
}

export interface OrderPricingTotals {
  servicesTotal: number
  partsTotal: number
  subtotal: number
  discountAmount: number
  taxableBase: number
  taxAmount: number
  finalAmount: number
  rates: {
    taxRate: number
  }
}

/**
 * Centralized pricing engine.
 * - Totals are calculated from persisted line totals (post-discount at line level).
 * - Tax is applied only to taxable lines; order-level discount is proportionally allocated to taxable base.
 * - Rounds to 2 decimals at each key step.
 */
export function computeOrderTotals(order: Order, opts?: { taxRate?: number }): OrderPricingTotals {
  const taxRate = typeof opts?.taxRate === 'number' ? opts!.taxRate : resolveTaxRate()

  const services = order.orderServices ?? []
  const parts = order.orderParts ?? []

  const servicesTotal = round2(
    services.reduce((sum, s) => sum + toNum((s as any).totalAmount), 0),
  )
  const partsTotal = round2(
    parts.reduce((sum, p) => sum + toNum((p as any).totalAmount), 0),
  )

  const subtotal = round2(servicesTotal + partsTotal)
  const discountAmount = round2(toNum((order as any).discountAmount) || 0)

  // Taxable base by line (already after line-level discount)
  const servicesTaxableBase = round2(
    services.reduce((sum, s) => sum + (isServiceTaxable(s) ? toNum((s as any).totalAmount) : 0), 0),
  )
  const partsTaxableBase = round2(
    parts.reduce((sum, p) => sum + (isPartTaxable(p) ? toNum((p as any).totalAmount) : 0), 0),
  )
  const rawTaxableBase = round2(servicesTaxableBase + partsTaxableBase)

  // Allocate order-level discount proportionally to taxable share
  const taxableShare = subtotal > 0 ? rawTaxableBase / subtotal : 0
  const discountOnTaxable = round2(discountAmount * taxableShare)

  const taxBase = Math.max(0, round2(rawTaxableBase - discountOnTaxable))
  const taxAmount = round2(taxBase * taxRate)
  const finalAmount = round2(subtotal - discountAmount + taxAmount)

  return {
    servicesTotal,
    partsTotal,
    subtotal,
    discountAmount,
    taxableBase: taxBase,
    taxAmount,
    finalAmount,
    rates: { taxRate },
  }
}
