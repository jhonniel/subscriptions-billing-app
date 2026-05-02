import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { listCategories } from '@/services/categories'
import { APP_BASE } from '@/routes'
import { createPlan, deletePlan, listPlans, updatePlan } from '@/services/plans'
import { countActiveSubscriptionsForPlan } from '@/services/subscriptions'
import type { BillingCycle, Category, SubscriptionPlan } from '@/types'

export function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      const [p, cats] = await Promise.all([listPlans(), listCategories()])
      setPlans(p)
      setCategories(cats)
      const counts: Record<string, number> = {}
      await Promise.all(
        p.map(async (plan) => {
          counts[plan.id] = await countActiveSubscriptionsForPlan(plan.id)
        }),
      )
      setUsage(counts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load plans')
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Define shared subscription products (Netflix, Spotify, etc.) with a fixed number of
          active member slots. Assign users from the Subscriptions page using a plan.
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setModal(true)
          }}
        >
          New plan
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Default price</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Slots</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const used = usage[p.id] ?? 0
              const full = used >= p.slotsTotal && p.slotsTotal > 0
              return (
                <tr key={p.id} className="border-b border-[var(--color-border)]/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-foreground)]">{p.name}</div>
                    {p.description && (
                      <div className="mt-0.5 max-w-xs text-xs text-[var(--color-muted)]">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.categoryName}</td>
                  <td className="px-4 py-3">${p.defaultAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{p.billingCycle}</td>
                  <td className="px-4 py-3">
                    <span className={full ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>
                      {used} / {p.slotsTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.active ? 'success' : 'default'}>
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`${APP_BASE}/plans/${p.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                      >
                        Subscribers
                      </Link>
                      <Button
                        variant="secondary"
                        className="!py-1 !text-xs"
                        onClick={() => {
                          setEditing(p)
                          setModal(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="!py-1 !text-xs"
                        onClick={() => {
                          if (
                            confirm(
                              'Delete this plan? Existing subscriptions keep their data; new assignments should use another plan.',
                            )
                          ) {
                            void deletePlan(p.id).then(refresh)
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {plans.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No plans yet. Create one to offer Netflix-style slots to your users.
          </div>
        )}
      </Card>

      <PlanModal
        key={`plan-form-${modal}-${editing?.id ?? 'new'}`}
        open={modal}
        initial={editing}
        categories={categories}
        onClose={() => {
          setModal(false)
          setEditing(null)
        }}
        onDone={() => {
          setModal(false)
          setEditing(null)
          void refresh()
        }}
      />
    </div>
  )
}

function PlanModal({
  open,
  initial,
  categories,
  onClose,
  onDone,
}: {
  open: boolean
  initial: SubscriptionPlan | null
  categories: Category[]
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState(() => initial?.name ?? '')
  const [description, setDescription] = useState(() => initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(
    () => initial?.categoryId ?? categories[0]?.id ?? '',
  )
  const [slotsTotal, setSlotsTotal] = useState(() =>
    initial ? String(initial.slotsTotal) : '4',
  )
  const [defaultAmount, setDefaultAmount] = useState(() =>
    initial ? String(initial.defaultAmount) : '15.99',
  )
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    () => initial?.billingCycle ?? 'monthly',
  )
  const [active, setActive] = useState(() => initial?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const effectiveCat = categoryId || categories[0]?.id || ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cat = categories.find((c) => c.id === effectiveCat)
    if (!cat) {
      setErr('Add at least one category (Users → category or Firestore).')
      return
    }
    const slots = Math.max(1, Math.floor(Number(slotsTotal)) || 1)
    setErr(null)
    setBusy(true)
    try {
      if (initial) {
        await updatePlan(initial.id, {
          name: name.trim(),
          description: description.trim(),
          categoryId: cat.id,
          categoryName: cat.name,
          slotsTotal: slots,
          defaultAmount: Number(defaultAmount),
          billingCycle,
          active,
        })
      } else {
        await createPlan({
          name: name.trim(),
          description: description.trim(),
          categoryId: cat.id,
          categoryName: cat.name,
          slotsTotal: slots,
          defaultAmount: Number(defaultAmount),
          billingCycle,
          active,
        })
      }
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={initial ? 'Edit plan' : 'New subscription plan'}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Netflix" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Category</label>
          <Select value={effectiveCat} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Slots available</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={slotsTotal}
              onChange={(e) => setSlotsTotal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Default amount</label>
            <Input
              type="number"
              step="0.01"
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Billing cycle</label>
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
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Catalog status</label>
            <Select
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
            >
              <option value="true">Active (assignable)</option>
              <option value="false">Inactive</option>
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
