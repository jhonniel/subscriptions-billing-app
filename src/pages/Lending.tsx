import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import {
  createLending,
  listAllLending,
  listLendingForUser,
  updateLendingStatus,
} from '@/services/lending'
import { addTransaction } from '@/services/transactions'
import { fetchAllUsers, fetchManagedUsers } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import { formatIsoDate } from '@/utils/dates'
import { canViewUserData } from '@/utils/roles'
import type { LendingRecord, UserProfile } from '@/types'

export function LendingPage() {
  const me = useAuthStore((s) => s.user)
  const [rows, setRows] = useState<LendingRecord[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [modal, setModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRecord = me?.role === 'admin' || me?.role === 'manager'

  const refresh = useCallback(async () => {
    if (!me) return
    setError(null)
    try {
      if (me.role === 'admin') {
        const [l, u] = await Promise.all([listAllLending(), fetchAllUsers()])
        setRows(l)
        setUsers(u)
      } else if (me.role === 'manager') {
        const managed = await fetchManagedUsers(me.id)
        const all = await listAllLending()
        const ids = new Set(managed.map((m) => m.id))
        setUsers(managed)
        setRows(
          all.filter(
            (r) => ids.has(r.lenderId) || ids.has(r.borrowerId),
          ),
        )
      } else {
        setRows(await listLendingForUser(me.id))
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

  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name)
    return m
  }, [users])

  async function markPaid(r: LendingRecord) {
    await updateLendingStatus(r.id, 'paid')
    await addTransaction({
      type: 'repayment',
      amount: r.amount,
      userId: r.borrowerId,
      relatedUserId: r.lenderId,
      date: formatIsoDate(new Date()),
      description: 'Loan repaid',
      lendingId: r.id,
    })
    await refresh()
  }

  if (!me) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Track money lent between users and repayment status.
        </p>
        {canRecord && (
          <Button onClick={() => setModal(true)}>Record lending</Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">Lender</th>
              <th className="px-4 py-3">Borrower</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              {canRecord && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)]/60">
                <td className="px-4 py-3">{names.get(r.lenderId) ?? r.lenderId}</td>
                <td className="px-4 py-3">{names.get(r.borrowerId) ?? r.borrowerId}</td>
                <td className="px-4 py-3 font-medium">${r.amount.toFixed(2)}</td>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === 'paid' ? 'success' : 'warning'}>
                    {r.status}
                  </Badge>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-[var(--color-muted)]">
                  {r.notes}
                </td>
                {canRecord && (
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <Button
                        variant="secondary"
                        className="!py-1 !text-xs"
                        onClick={() => void markPaid(r)}
                      >
                        Mark paid
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No lending records.
          </div>
        )}
      </Card>

      {canRecord && me && (
        <LendingModal
          open={modal}
          onClose={() => setModal(false)}
          actor={me}
          users={users}
          onDone={() => {
            setModal(false)
            void refresh()
          }}
        />
      )}
    </div>
  )
}

function LendingModal({
  open,
  onClose,
  actor,
  users,
  onDone,
}: {
  open: boolean
  onClose: () => void
  actor: UserProfile
  users: UserProfile[]
  onDone: () => void
}) {
  const visible = users.filter((u) => canViewUserData(actor, u.id, u.createdBy))
  const [lenderId, setLenderId] = useState('')
  const [borrowerId, setBorrowerId] = useState('')
  const [amount, setAmount] = useState('100')
  const [date, setDate] = useState(formatIsoDate(new Date()))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const effectiveLender = lenderId || visible[0]?.id || ''
  const effectiveBorrower =
    borrowerId ||
    visible.find((u) => u.id !== effectiveLender)?.id ||
    visible[1]?.id ||
    visible[0]?.id ||
    ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (effectiveLender === effectiveBorrower) {
      setErr('Lender and borrower must differ.')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const id = await createLending({
        lenderId: effectiveLender,
        borrowerId: effectiveBorrower,
        amount: Number(amount),
        date,
        status: 'pending',
        notes,
      })
      await addTransaction({
        type: 'lending',
        amount: Number(amount),
        userId: effectiveLender,
        relatedUserId: effectiveBorrower,
        date,
        description: notes || 'Loan recorded',
        lendingId: id,
      })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Record lending" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Lender</label>
          <Select
            value={effectiveLender}
            onChange={(e) => setLenderId(e.target.value)}
            required
          >
            {visible.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Borrower</label>
          <Select
            value={effectiveBorrower}
            onChange={(e) => setBorrowerId(e.target.value)}
            required
          >
            {visible.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
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
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || visible.length < 2}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
