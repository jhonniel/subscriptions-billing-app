import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssignSubscriptionModal } from '@/components/AssignSubscriptionModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { listCategories } from '@/services/categories'
import { listActivePlans } from '@/services/plans'
import {
  deleteSubscription,
  listAllSubscriptions,
  updateSubscription,
} from '@/services/subscriptions'
import { fetchAllUsers, fetchManagedUsers } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney } from '@/utils/currency'
import type { Category, Subscription, SubscriptionPlan, UserProfile } from '@/types'

export function SubscriptionsPage() {
  const me = useAuthStore((s) => s.user)
  const [rows, setRows] = useState<Subscription[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [modal, setModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAssign = me?.role === 'admin' || me?.role === 'manager'

  const refresh = useCallback(async () => {
    if (!me) return
    setError(null)
    try {
      const [cats, activePlans] = await Promise.all([listCategories(), listActivePlans()])
      setCategories(cats)
      setPlans(activePlans)
      if (me.role === 'admin') {
        const [allSubs, allUsers] = await Promise.all([
          listAllSubscriptions(),
          fetchAllUsers(),
        ])
        setRows(allSubs)
        setUsers(allUsers)
      } else {
        const managed = await fetchManagedUsers(me.id)
        const allSubs = await listAllSubscriptions()
        const ids = new Set(managed.map((u) => u.id))
        setUsers(managed)
        setRows(allSubs.filter((s) => ids.has(s.userId)))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [me])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [refresh])

  const userNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name)
    return m
  }, [users])

  if (!me) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Add subscriptions to the list, assign catalog plans or custom entries, and manage status.
        End users see their active assignments on the dashboard only.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="overflow-x-auto !p-0">
        {canAssign && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Subscriptions</h2>
            <Button type="button" onClick={() => setModal(true)}>
              Add subscription
            </Button>
          </div>
        )}
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Next bill</th>
              <th className="px-4 py-3">Status</th>
              {canAssign && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)]/60">
                <td className="px-4 py-3 text-[var(--color-foreground)]">
                  {userNameById.get(s.userId) ?? s.userId}
                </td>
                <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">{s.name}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.planName ?? '—'}</td>
                <td className="px-4 py-3">{s.categoryName}</td>
                <td className="px-4 py-3">{formatMoney(s.amount)}</td>
                <td className="px-4 py-3 capitalize">{s.billingCycle}</td>
                <td className="px-4 py-3">{s.nextBillingDate}</td>
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
                {canAssign && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="!py-1 !text-xs"
                        onClick={() =>
                          void updateSubscription(s.id, {
                            status: s.status === 'active' ? 'paused' : 'active',
                          }).then(refresh)
                        }
                      >
                        Toggle
                      </Button>
                      <Button
                        variant="danger"
                        className="!py-1 !text-xs"
                        onClick={() => {
                          if (confirm('Delete this subscription?')) {
                            void deleteSubscription(s.id).then(refresh)
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-[var(--color-muted)]">No subscriptions in the list yet.</p>
            {canAssign && (
              <Button type="button" onClick={() => setModal(true)}>
                Add subscription
              </Button>
            )}
          </div>
        )}
      </Card>

      {canAssign && me && (
        <AssignSubscriptionModal
          open={modal}
          onClose={() => setModal(false)}
          actor={me}
          users={users}
          categories={categories}
          plans={plans}
          onDone={() => {
            setModal(false)
            void refresh()
          }}
        />
      )}
    </div>
  )
}
