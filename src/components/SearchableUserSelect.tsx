import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import type { UserProfile } from '@/types'

export function SearchableUserSelect({
  label,
  users,
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Search by name or email…',
  emptyHint = 'No matches.',
}: {
  label: string
  users: UserProfile[]
  value: string
  onChange: (userId: string) => void
  excludeIds?: string[]
  placeholder?: string
  emptyHint?: string
}) {
  const [q, setQ] = useState('')
  const selected = users.find((u) => u.id === value)

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    const exclude = new Set(excludeIds)
    return users
      .filter((u) => !exclude.has(u.id))
      .filter(
        (u) =>
          !t ||
          u.name.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t),
      )
      .slice(0, 40)
  }, [users, q, excludeIds])

  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--color-muted)]">{label}</label>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mb-2"
      />
      {selected && (
        <p className="mb-2 text-xs text-[var(--color-foreground)]">
          Selected: <strong>{selected.name}</strong> ({selected.email})
        </p>
      )}
      <div className="max-h-44 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-[var(--color-muted)]">{emptyHint}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]/60 text-sm">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={clsx(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]',
                    u.id === value && 'bg-[var(--color-accent)]/12',
                  )}
                  onClick={() => {
                    onChange(u.id)
                    setQ('')
                  }}
                >
                  <span className="font-medium text-[var(--color-foreground)]">{u.name}</span>
                  <span className="text-xs text-[var(--color-muted)]">{u.email}</span>
                  <span className="text-[10px] uppercase text-[var(--color-muted)]">{u.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
