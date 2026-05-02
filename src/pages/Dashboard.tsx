import {
  compareAsc,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { listAllLending, listLendingForUser } from '@/services/lending'
import { listAllSubscriptions, listSubscriptionsForUser } from '@/services/subscriptions'
import { listAllTransactions, listTransactionsForUser } from '@/services/transactions'
import { fetchAllUsers, fetchManagedUsers } from '@/services/users'
import { APP_BASE } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { monthlyEquivalent } from '@/utils/billing'
import { isDueWithinDays } from '@/utils/dates'
import type { LendingRecord, Subscription, TransactionRecord, UserProfile } from '@/types'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [lending, setLending] = useState<LendingRecord[]>([])
  const [tx, setTx] = useState<TransactionRecord[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (!user) return
    const actor = user
    let cancelled = false
    async function load() {
      if (actor.role === 'admin') {
        const [s, l, t, u] = await Promise.all([
          listAllSubscriptions(),
          listAllLending(),
          listAllTransactions(),
          fetchAllUsers(),
        ])
        if (!cancelled) {
          setSubs(s)
          setLending(l)
          setTx(t)
          setUsers(u)
        }
      } else if (actor.role === 'manager') {
        const [managed, s, l] = await Promise.all([
          fetchManagedUsers(actor.id),
          listAllSubscriptions(),
          listAllLending(),
        ])
        if (!cancelled) {
        const ids = new Set(managed.map((m) => m.id))
        ids.add(actor.id)
          setUsers(managed)
          setSubs(s.filter((x) => ids.has(x.userId)))
          setLending(
            l.filter(
              (r) =>
                ids.has(r.lenderId) ||
                ids.has(r.borrowerId),
            ),
          )
          const txRows = await Promise.all(
            [...ids].map((id) => listTransactionsForUser(id)),
          )
          if (!cancelled) setTx(txRows.flat())
        }
      } else {
        const [s, l, t] = await Promise.all([
          listSubscriptionsForUser(actor.id),
          listLendingForUser(actor.id),
          listTransactionsForUser(actor.id),
        ])
        if (!cancelled) {
          setSubs(s)
          setLending(l)
          setTx(t)
        }
      }
    }
    queueMicrotask(() => {
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const activeSubs = subs.filter((s) => s.status === 'active')
  const mrr = useMemo(
    () =>
      activeSubs.reduce(
        (sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle),
        0,
      ),
    [activeSubs],
  )
  const outstanding = useMemo(
    () => lending.filter((r) => r.status === 'pending').reduce((a, r) => a + r.amount, 0),
    [lending],
  )

  const chartDataFixed = useMemo(() => {
    return [5, 4, 3, 2, 1, 0].map((i) => {
      const start = startOfMonth(subMonths(new Date(), i))
      const end = endOfMonth(start)
      const label = format(start, 'MMM yyyy')
      const total = tx
        .filter((t) => {
          const d = parseISO(t.date)
          return d >= start && d <= end
        })
        .reduce((a, t) => a + Math.abs(t.amount), 0)
      return { label, volume: Math.round(total * 100) / 100 }
    })
  }, [tx])

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSubs) {
      const key = s.categoryName || 'Other'
      map.set(key, (map.get(key) ?? 0) + monthlyEquivalent(s.amount, s.billingCycle))
    }
    return [...map.entries()].map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
  }, [activeSubs])

  const upcomingBillingSorted = useMemo(() => {
    return [...activeSubs].sort((a, b) =>
      compareAsc(parseISO(a.nextBillingDate), parseISO(b.nextBillingDate)),
    )
  }, [activeSubs])

  const mySubscriptionsSorted = useMemo(() => {
    const order: Record<string, number> = { active: 0, paused: 1, cancelled: 2 }
    return [...subs].sort((a, b) => {
      const d = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (d !== 0) return d
      return a.name.localeCompare(b.name)
    })
  }, [subs])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active subscriptions" value={String(activeSubs.length)} />
        <StatCard
          label="Est. monthly revenue"
          value={`$${mrr.toFixed(0)}`}
          hint="Normalized from billing cycles"
        />
        <StatCard
          label="Outstanding (lending)"
          value={`$${outstanding.toFixed(0)}`}
          hint="Pending principal"
        />
        {(user.role === 'admin' || user.role === 'manager') && (
          <StatCard
            label={user.role === 'admin' ? 'Users' : 'Managed users'}
            value={String(users.length)}
          />
        )}
      </div>

      {user.role === 'user' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Upcoming billing
              </h2>
              <Link
                to={`${APP_BASE}/subscriptions`}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Subscriptions
              </Link>
            </div>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              Active plans, next charge first. Items due within 7 days are highlighted.
            </p>
            {upcomingBillingSorted.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No active subscriptions. When your manager assigns a plan, it will appear here.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingBillingSorted.map((s) => {
                  const soon = isDueWithinDays(s.nextBillingDate, 7)
                  const next = parseISO(s.nextBillingDate)
                  const today = startOfDay(new Date())
                  const days = differenceInCalendarDays(startOfDay(next), today)
                  const when =
                    days < 0
                      ? `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`
                      : days === 0
                        ? 'Due today'
                        : days === 1
                          ? 'Due tomorrow'
                          : `In ${days} days`
                  return (
                    <li
                      key={s.id}
                      className={`rounded-lg border px-3 py-2.5 text-sm ${
                        soon
                          ? 'border-amber-500/40 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-2)]/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-[var(--color-foreground)]">{s.name}</span>
                        <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                          ${s.amount.toFixed(2)}
                          <span className="font-normal text-[var(--color-muted)]">
                            {' '}
                            / {s.billingCycle}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted)]">
                        {s.planName && <span>{s.planName}</span>}
                        {s.planName && <span aria-hidden>·</span>}
                        <span>{format(next, 'MMM d, yyyy')}</span>
                        <span aria-hidden>·</span>
                        <span className={soon ? 'font-medium text-amber-900 dark:text-amber-100' : ''}>
                          {when}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Your subscriptions
              </h2>
              <Link
                to={`${APP_BASE}/subscriptions`}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Full list
              </Link>
            </div>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              Everything assigned to you, including paused or ended plans.
            </p>
            {mySubscriptionsSorted.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No subscriptions yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]/60">
                {mySubscriptionsSorted.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--color-foreground)]">{s.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {s.planName ?? 'Custom'} · {s.categoryName} · Next {s.nextBillingDate}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <span className="tabular-nums text-[var(--color-foreground)]">
                        ${s.amount.toFixed(2)}
                        <span className="text-[var(--color-muted)]"> / {s.billingCycle}</span>
                      </span>
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">
            Activity volume (6 months)
          </h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataFixed}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="volume" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">
            MRR by category
          </h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-[var(--color-muted)]">{hint}</div>
      )}
    </Card>
  )
}
