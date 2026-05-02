import { format, parseISO } from 'date-fns'
import { Bell } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listSubscriptionsForUser } from '@/services/subscriptions'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney } from '@/utils/currency'
import { isDueWithinDays } from '@/utils/dates'
import type { Subscription } from '@/types'

export function BillNotifications() {
  const user = useAuthStore((s) => s.user)
  const uid = user?.id
  const [subs, setSubs] = useState<Subscription[]>([])

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    void listSubscriptionsForUser(uid).then((rows) => {
      if (!cancelled) setSubs(rows)
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  const upcoming = useMemo(
    () =>
      subs.filter(
        (s) =>
          s.status === 'active' && isDueWithinDays(s.nextBillingDate, 7),
      ),
    [subs],
  )

  if (!upcoming.length) return null

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-950 dark:text-amber-100 sm:px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Bell className="h-4 w-4 shrink-0" />
        <span className="font-medium">Upcoming bills (7 days)</span>
        <span className="text-[var(--color-muted)]">—</span>
        {upcoming.map((s) => (
          <span key={s.id} className="rounded-md bg-amber-500/20 px-2 py-0.5">
            {s.name} · {formatMoney(s.amount)} ·{' '}
            {format(parseISO(s.nextBillingDate), 'MMM d')}
          </span>
        ))}
      </div>
    </div>
  )
}
