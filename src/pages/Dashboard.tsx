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
import { AssignSubscriptionModal } from '@/components/AssignSubscriptionModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { listCategories } from '@/services/categories'
import { listAllLending, listLendingForUser } from '@/services/lending'
import { listActivePlans } from '@/services/plans'
import { listAllSubscriptions, listSubscriptionsForUser } from '@/services/subscriptions'
import { listAllTransactions, listTransactionsForUser } from '@/services/transactions'
import { fetchAllUsers, fetchManagedUsers } from '@/services/users'
import { APP_BASE } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { monthlyEquivalent } from '@/utils/billing'
import { formatMoney } from '@/utils/currency'
import { isDueWithinDays } from '@/utils/dates'
import type {
  Category,
  LendingRecord,
  Subscription,
  SubscriptionPlan,
  TransactionRecord,
  UserProfile,
} from '@/types'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [lending, setLending] = useState<LendingRecord[]>([])
  const [tx, setTx] = useState<TransactionRecord[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!user) return
    const actor = user
    let cancelled = false
    async function load() {
      if (actor.role === 'admin') {
        const [s, l, t, u, cats, activePlans] = await Promise.all([
          listAllSubscriptions(),
          listAllLending(),
          listAllTransactions(),
          fetchAllUsers(),
          listCategories(),
          listActivePlans(),
        ])
        if (!cancelled) {
          setSubs(s)
          setLending(l)
          setTx(t)
          setUsers(u)
          setCategories(cats)
          setPlans(activePlans)
        }
      } else if (actor.role === 'manager') {
        const [managed, s, l, cats, activePlans] = await Promise.all([
          fetchManagedUsers(actor.id),
          listAllSubscriptions(),
          listAllLending(),
          listCategories(),
          listActivePlans(),
        ])
        if (!cancelled) {
          const ids = new Set(managed.map((m) => m.id))
          ids.add(actor.id)
          setUsers(managed)
          setCategories(cats)
          setPlans(activePlans)
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
  }, [user, reloadTick])

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

  const inactiveSubsSorted = useMemo(() => {
    const inactive = subs.filter((s) => s.status !== 'active')
    const order: Record<string, number> = { paused: 0, cancelled: 1 }
    return inactive.sort((a, b) => {
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
          value={formatMoney(mrr, 0)}
          hint="Normalized from billing cycles"
        />
        <StatCard
          label="Outstanding (lending)"
          value={formatMoney(outstanding, 0)}
          hint="Pending principal"
        />
        {(user.role === 'admin' || user.role === 'manager') && (
          <StatCard
            label={user.role === 'admin' ? 'Users' : 'Managed users'}
            value={String(users.length)}
          />
        )}
      </div>

      {(user.role === 'admin' || user.role === 'manager') && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden !p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {user.role === 'admin' ? 'All users' : 'Managed users'}
                </h2>
                <Link
                  to={`${APP_BASE}/users`}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  User management →
                </Link>
              </div>
              <div className="max-h-[22rem] overflow-x-auto overflow-y-auto">
                {users.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--color-muted)]">No users loaded.</p>
                ) : (
                  <table className="w-full min-w-[360px] text-left text-sm">
                    <thead className="sticky top-0 z-[1] border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase text-[var(--color-muted)]">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...users]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((u) => (
                          <tr key={u.id} className="border-b border-[var(--color-border)]/50 last:border-0">
                            <td className="px-4 py-2 font-medium text-[var(--color-foreground)]">{u.name}</td>
                            <td className="px-4 py-2 text-[var(--color-muted)]">{u.email}</td>
                            <td className="px-4 py-2 capitalize">{u.role}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
            <Card className="!p-4">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Create subscription
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                Assign a catalog plan (uses plan slots) or a custom subscription to any user in the list.
                Stats and charts update after you save.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => setAssignOpen(true)}>
                  Add subscription
                </Button>
                <Button variant="secondary" to={`${APP_BASE}/subscriptions`}>
                  View all subscriptions
                </Button>
              </div>
            </Card>
          </div>
          <AssignSubscriptionModal
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            actor={user}
            users={users}
            categories={categories}
            plans={plans}
            onDone={() => {
              setAssignOpen(false)
              setReloadTick((n) => n + 1)
            }}
          />
        </>
      )}

      {user.role === 'user' && (
        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              Your subscriptions
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              Every <span className="font-medium text-[var(--color-foreground)]">active</span>{' '}
              subscription an admin assigns to you appears here. Next charge is listed first; due
              dates within 7 days are highlighted.
            </p>
          </div>
          {activeSubs.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No active subscriptions yet. When an administrator assigns you a plan, it will show
              up here.
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
                        {formatMoney(s.amount)}
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

          {inactiveSubsSorted.length > 0 ? (
            <div className="mt-8 border-t border-[var(--color-border)]/60 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Paused or cancelled
              </h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                These are no longer billing. Contact your admin if you need them reactivated.
              </p>
              <ul className="mt-3 divide-y divide-[var(--color-border)]/60">
                {inactiveSubsSorted.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--color-foreground)]">{s.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {s.planName ?? 'Custom'}
                        {s.categoryName ? ` · ${s.categoryName}` : ''} · Next {s.nextBillingDate}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <span className="tabular-nums text-[var(--color-foreground)]">
                        {formatMoney(s.amount)}
                        <span className="text-[var(--color-muted)]"> / {s.billingCycle}</span>
                      </span>
                      <Badge
                        tone={
                          s.status === 'paused' ? 'warning' : 'danger'
                        }
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
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
                  formatter={(v) => [formatMoney(Number(v), 2), 'Volume']}
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
                  formatter={(v) => [formatMoney(Number(v), 2), 'MRR']}
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
