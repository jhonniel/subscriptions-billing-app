import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { BillingCycle } from '@/types'

export function addBillingCycle(
  from: Date,
  cycle: BillingCycle,
): Date {
  switch (cycle) {
    case 'daily':
      return addDays(from, 1)
    case 'weekly':
      return addWeeks(from, 1)
    case 'monthly':
      return addMonths(from, 1)
    case 'yearly':
      return addYears(from, 1)
    default:
      return addMonths(from, 1)
  }
}

export function formatIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** True if `isoDate` (YYYY-MM-DD) falls between today (inclusive) and today+`days` (inclusive). */
export function isDueWithinDays(isoDate: string, days: number): boolean {
  const target = startOfDay(parseISO(isoDate))
  const start = startOfDay(new Date())
  const end = startOfDay(addDays(new Date(), days))
  return isWithinInterval(target, { start, end })
}
