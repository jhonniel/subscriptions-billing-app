import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { APP_BASE } from '@/routes'
import { getPlan } from '@/services/plans'
import { countActiveSubscriptionsForPlan, listSubscriptionsByPlanId } from '@/services/subscriptions'
import { fetchAllUsers } from '@/services/users'
import type { Subscription, SubscriptionPlan, UserProfile } from '@/types'

export function PlanSubscribersPage() {
  const { planId } = useParams<{ planId: string }>()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return
    const id: string = planId
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const [p, rows, allUsers, used] = await Promise.all([
          getPlan(id),
          listSubscriptionsByPlanId(id),
          fetchAllUsers(),
          countActiveSubscriptionsForPlan(id),
        ])
        if (!cancelled) {
          setPlan(p)
          setSubs(rows.sort((a, b) => a.name.localeCompare(b.name)))
          setUsers(allUsers)
          setActiveCount(used)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [planId])

  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name)
    return m
  }, [users])

  if (!planId) {
    return <p className="text-sm text-[var(--color-muted)]">Missing plan.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`${APP_BASE}/plans`}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
        >
          ← All plans
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {plan && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{plan.name}</h2>
          {plan.description && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">{plan.description}</p>
          )}
          <p className="mt-3 text-sm text-[var(--color-foreground)]">
            <span className="text-[var(--color-muted)]">Active slots: </span>
            <strong>
              {activeCount} / {plan.slotsTotal}
            </strong>
            <span className="text-[var(--color-muted)]"> · Default </span>
            ${plan.defaultAmount.toFixed(2)} / {plan.billingCycle}
          </p>
        </Card>
      )}
      {!plan && !error && <p className="text-sm text-[var(--color-muted)]">Loading…</p>}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Subscription name</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next bill</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)]/60">
                <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                  {names.get(s.userId) ?? s.userId}
                </td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">${s.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      s.status === 'active'
                        ? 'success'
                        : s.status === 'paused'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{s.nextBillingDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {subs.length === 0 && plan && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No subscriptions linked to this plan yet.
          </div>
        )}
      </Card>
    </div>
  )
}
