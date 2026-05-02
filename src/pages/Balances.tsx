import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { listLendingForUser } from '@/services/lending'
import { listSubscriptionsForUser } from '@/services/subscriptions'
import { useAuthStore } from '@/stores/authStore'
import { monthlyEquivalent } from '@/utils/billing'
import { formatMoney } from '@/utils/currency'
import type { LendingRecord, Subscription } from '@/types'

export function BalancesPage() {
  const me = useAuthStore((s) => s.user)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [lending, setLending] = useState<LendingRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!me?.id) return
    const uid = me.id
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const [s, l] = await Promise.all([
          listSubscriptionsForUser(uid),
          listLendingForUser(uid),
        ])
        if (!cancelled) {
          setSubs(s)
          setLending(l)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [me?.id])

  const payables = useMemo(
    () =>
      lending
        .filter((r) => r.borrowerId === me?.id && r.status === 'pending')
        .reduce((a, r) => a + r.amount, 0),
    [lending, me?.id],
  )

  const receivables = useMemo(
    () =>
      lending
        .filter((r) => r.lenderId === me?.id && r.status === 'pending')
        .reduce((a, r) => a + r.amount, 0),
    [lending, me?.id],
  )

  const monthlySubs = useMemo(() => {
    return subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle), 0)
  }, [subs])

  const netExposure = useMemo(
    () => monthlySubs + payables - receivables,
    [monthlySubs, payables, receivables],
  )

  if (!me) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Payables are amounts you still owe others. Receivables are amounts others still owe you.
        Subscription estimate normalizes your active plans to a rough monthly total.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="!p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Payables (debts)
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {formatMoney(payables)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">Pending loans you borrowed</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Receivables
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {formatMoney(receivables)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">Pending loans you lent</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Est. monthly subscriptions
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">
            {formatMoney(monthlySubs, 0)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">Active plans, normalized to ~monthly</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Net (subs + payables − receivables)
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">
            {formatMoney(netExposure, 0)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">Illustrative cash-flow pressure</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
          Open lending you are part of
        </h2>
        <ul className="space-y-2 text-sm">
          {lending
            .filter((r) => r.status === 'pending')
            .map((r) => {
              const youBorrowed = r.borrowerId === me.id
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)]/50 py-2 last:border-0"
                >
                  <span className="text-[var(--color-muted)]">
                    {youBorrowed ? 'You owe' : 'You are owed'} · {formatMoney(r.amount)} · {r.date}
                  </span>
                  <span className="text-[var(--color-foreground)]">{r.notes || '—'}</span>
                </li>
              )
            })}
          {lending.filter((r) => r.status === 'pending').length === 0 && (
            <li className="text-sm text-[var(--color-muted)]">No open lending.</li>
          )}
        </ul>
      </Card>
    </div>
  )
}
