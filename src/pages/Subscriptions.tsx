import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { listCategories } from '@/services/categories'
import { listActivePlans } from '@/services/plans'
import {
  countActiveSubscriptionsForPlan,
  createSubscription,
  deleteSubscription,
  listAllSubscriptions,
  listSubscriptionsForUser,
  updateSubscription,
} from '@/services/subscriptions'
import { addTransaction } from '@/services/transactions'
import { fetchAllUsers, fetchManagedUsers } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import { formatIsoDate } from '@/utils/dates'
import { canViewUserData } from '@/utils/roles'
import type {
  BillingCycle,
  Category,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  UserProfile,
} from '@/types'

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
      } else if (me.role === 'manager') {
        const managed = await fetchManagedUsers(me.id)
        const allSubs = await listAllSubscriptions()
        const ids = new Set(managed.map((u) => u.id))
        setUsers(managed)
        setRows(allSubs.filter((s) => ids.has(s.userId)))
      } else {
        setRows(await listSubscriptionsForUser(me.id))
        setUsers([])
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {me.role === 'user'
            ? 'Your recurring subscriptions and bills.'
            : 'Assign and review subscriptions for your organization.'}
        </p>
        {canAssign && (
          <Button onClick={() => setModal(true)}>Assign subscription</Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              {(me.role === 'admin' || me.role === 'manager') && <th className="px-4 py-3">User</th>}
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
                {(me.role === 'admin' || me.role === 'manager') && (
                  <td className="px-4 py-3 text-[var(--color-foreground)]">
                    {userNameById.get(s.userId) ?? s.userId}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">{s.name}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.planName ?? '—'}</td>
                <td className="px-4 py-3">{s.categoryName}</td>
                <td className="px-4 py-3">${s.amount.toFixed(2)}</td>
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
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No subscriptions yet.
          </div>
        )}
      </Card>

      {canAssign && me && (
        <AssignModal
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

function AssignModal({
  open,
  onClose,
  actor,
  users,
  categories,
  plans,
  onDone,
}: {
  open: boolean
  onClose: () => void
  actor: UserProfile
  users: UserProfile[]
  categories: Category[]
  plans: SubscriptionPlan[]
  onDone: () => void
}) {
  const [source, setSource] = useState<'custom' | 'plan'>('custom')
  const [planId, setPlanId] = useState('')
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('29.99')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [next, setNext] = useState(formatIsoDate(new Date()))
  const [status, setStatus] = useState<SubscriptionStatus>('active')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const visibleUsers = users.filter((u) => canViewUserData(actor, u.id, u.createdBy))
  const effectiveUserId = userId || visibleUsers[0]?.id || ''
  const effectiveCategoryId = categoryId || categories[0]?.id || ''
  const effectivePlanId = planId || plans[0]?.id || ''
  const selectedPlan = plans.find((p) => p.id === effectivePlanId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    let cat: Category | undefined
    let useName = name.trim()
    let useAmount = Number(amount)
    let useCycle = billingCycle
    let usePlanId: string | null | undefined
    let usePlanName: string | null | undefined

    if (source === 'plan') {
      if (!selectedPlan) {
        setErr('Select a catalog plan or switch to custom.')
        return
      }
      const used = await countActiveSubscriptionsForPlan(selectedPlan.id)
      if (status === 'active' && used >= selectedPlan.slotsTotal) {
        setErr('This plan has no free slots. Pause or remove a subscriber first.')
        return
      }
      cat = { id: selectedPlan.categoryId, name: selectedPlan.categoryName }
      useName = selectedPlan.name
      useAmount = selectedPlan.defaultAmount
      useCycle = selectedPlan.billingCycle
      usePlanId = selectedPlan.id
      usePlanName = selectedPlan.name
    } else {
      cat = categories.find((c) => c.id === effectiveCategoryId)
      if (!cat) {
        setErr('Add at least one category in Firestore or as admin.')
        return
      }
    }

    setBusy(true)
    try {
      const id = await createSubscription({
        userId: effectiveUserId,
        name: useName,
        categoryId: cat!.id,
        categoryName: cat!.name,
        amount: useAmount,
        billingCycle: useCycle,
        nextBillingDate: next,
        status,
        planId: usePlanId,
        planName: usePlanName,
      })
      await addTransaction({
        type: 'subscription',
        amount: useAmount,
        userId: effectiveUserId,
        date: formatIsoDate(new Date()),
        categoryId: cat!.id,
        categoryName: cat!.name,
        description: usePlanId
          ? `Plan slot: ${usePlanName} → ${useName}`
          : `Subscription created: ${useName}`,
        subscriptionId: id,
      })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Assign subscription" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">User</label>
          <Select
            value={effectiveUserId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            {visibleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Source</label>
          <Select
            value={source}
            onChange={(e) => {
              const v = e.target.value as 'custom' | 'plan'
              setSource(v)
              if (v === 'plan' && plans[0]) {
                setPlanId(plans[0].id)
                const p = plans[0]
                setName(p.name)
                setCategoryId(p.categoryId)
                setAmount(String(p.defaultAmount))
                setBillingCycle(p.billingCycle)
              }
            }}
          >
            <option value="custom">Custom (manual fields)</option>
            <option value="plan" disabled={plans.length === 0}>
              Catalog plan (uses slots)
            </option>
          </Select>
        </div>
        {source === 'plan' && (
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Plan</label>
            <Select
              value={effectivePlanId}
              onChange={(e) => {
                const id = e.target.value
                setPlanId(id)
                const p = plans.find((x) => x.id === id)
                if (p) {
                  setName(p.name)
                  setCategoryId(p.categoryId)
                  setAmount(String(p.defaultAmount))
                  setBillingCycle(p.billingCycle)
                }
              }}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.defaultAmount} / {p.billingCycle})
                </option>
              ))}
            </Select>
            {selectedPlan && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Slots: admin sets total on Plans page. Active assignments count toward the limit
                when status is Active.
              </p>
            )}
          </div>
        )}
        {source === 'custom' && (
          <>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-muted)]">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-muted)]">Category</label>
              <Select
                value={effectiveCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Cycle</label>
                <Select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Next billing</label>
            <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Status</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
