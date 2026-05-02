import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { countActiveSubscriptionsForPlan, createSubscription } from '@/services/subscriptions'
import { addTransaction } from '@/services/transactions'
import { formatIsoDate } from '@/utils/dates'
import { formatMoney } from '@/utils/currency'
import { canViewUserData } from '@/utils/roles'
import type {
  BillingCycle,
  Category,
  SubscriptionPlan,
  SubscriptionStatus,
  UserProfile,
} from '@/types'

export function AssignSubscriptionModal({
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

    function firebaseMsg(e: unknown, step: string): string {
      const code =
        typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string'
          ? (e as { code: string }).code
          : ''
      const msg = e instanceof Error ? e.message : String(e)
      return `${step}: ${msg}${code ? ` [${code}]` : ''}`
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
      try {
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
      } catch (e: unknown) {
        setErr(
          `${firebaseMsg(e, 'Saved subscription but failed to log transaction')} — check Firestore rules for transactions and App Check.`,
        )
        return
      }
      onDone()
    } catch (e: unknown) {
      setErr(firebaseMsg(e, 'Create subscription'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Add subscription" onClose={onClose}>
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
                  {p.name} ({formatMoney(p.defaultAmount)} / {p.billingCycle})
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
