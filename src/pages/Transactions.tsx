import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { listAllTransactions } from '@/services/transactions'
import { fetchAllUsers } from '@/services/users'
import { downloadCsv, transactionsToCsv } from '@/utils/csv'
import type { TransactionRecord, UserProfile } from '@/types'

type SortKey = keyof Pick<
  TransactionRecord,
  'date' | 'amount' | 'type' | 'userId'
>

export function TransactionsPage() {
  const [rows, setRows] = useState<TransactionRecord[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userFilter, setUserFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let cancelled = false
    void Promise.all([listAllTransactions(), fetchAllUsers()]).then(([t, u]) => {
      if (!cancelled) {
        setRows(t)
        setUsers(u)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const userName = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name)
    return m
  }, [users])

  const categories = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.categoryName) s.add(r.categoryName)
    }
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (userFilter && r.userId !== userFilter) return false
      if (categoryFilter && (r.categoryName ?? '') !== categoryFilter) return false
      if (dateFrom && r.date < dateFrom) return false
      if (dateTo && r.date > dateTo) return false
      return true
    })
  }, [rows, userFilter, categoryFilter, dateFrom, dateTo])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const dir = sortDir === 'asc' ? 1 : -1
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return copy
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          All financial activity across the workspace.
        </p>
        <Button
          variant="secondary"
          className="gap-2"
          onClick={() =>
            downloadCsv(
              `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
              transactionsToCsv(sorted),
            )
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">User</label>
          <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Category</label>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">
                <button type="button" className="font-semibold" onClick={() => toggleSort('date')}>
                  Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" className="font-semibold" onClick={() => toggleSort('type')}>
                  Type {sortKey === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="font-semibold"
                  onClick={() => toggleSort('amount')}
                >
                  Amount {sortKey === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="font-semibold"
                  onClick={() => toggleSort('userId')}
                >
                  User {sortKey === 'userId' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              </th>
              <th className="px-4 py-3">Related</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-border)]/60">
                <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-3">
                  <Badge tone="info">{r.type}</Badge>
                </td>
                <td className="px-4 py-3 font-medium">${r.amount.toFixed(2)}</td>
                <td className="px-4 py-3">{userName.get(r.userId) ?? r.userId}</td>
                <td className="px-4 py-3">
                  {r.relatedUserId ? userName.get(r.relatedUserId) ?? r.relatedUserId : '—'}
                </td>
                <td className="px-4 py-3">{r.categoryName ?? '—'}</td>
                <td className="max-w-xs truncate px-4 py-3 text-[var(--color-muted)]">
                  {r.description ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No transactions match filters.
          </div>
        )}
      </Card>
    </div>
  )
}
