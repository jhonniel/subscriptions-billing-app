import type { Subscription } from '@/types'

export function monthlyEquivalent(
  amount: number,
  cycle: Subscription['billingCycle'],
): number {
  switch (cycle) {
    case 'daily':
      return amount * 30
    case 'weekly':
      return amount * 4.33
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
    default:
      return amount
  }
}
