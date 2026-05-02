import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { addCategory, listCategories } from '@/services/categories'
import {
  createUserAsManager,
  diagnoseFirestoreUsersRead,
  fetchAllUsers,
  fetchManagedUsers,
  updateUserRole,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import type { Category, UserProfile, UserRole } from '@/types'

export function UsersPage() {
  const me = useAuthStore((s) => s.user)
  const [rows, setRows] = useState<UserProfile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modal, setModal] = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firestoreDiagnostic, setFirestoreDiagnostic] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!me) return
    setError(null)
    setFirestoreDiagnostic(null)
    try {
      try {
        const cats = await listCategories()
        setCategories(cats)
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : 'Failed to load categories'
        throw new Error(`Categories: ${raw}`, { cause: e })
      }
      try {
        if (me.role === 'admin') {
          setRows(await fetchAllUsers())
        } else {
          setRows(await fetchManagedUsers(me.id))
        }
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : 'Failed to load users'
        throw new Error(`Users: ${raw}`, { cause: e })
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Failed to load'
      const code =
        typeof e === 'object' && e !== null && 'code' in e
          ? String((e as { code: unknown }).code)
          : ''
      const perm =
        code === 'permission-denied' ||
        /permission|insufficient/i.test(raw)
      setError(
        perm && !raw.includes('Firebase project id from .env')
          ? `${raw} Deploy firestore.rules from this repo to the same project as .env. If it still says Users: after deploy, Firestore App Check enforcement is blocking the client (turn it off for testing or finish App Check in .env.example).`
          : raw,
      )
      if (perm) {
        void diagnoseFirestoreUsersRead()
          .then(setFirestoreDiagnostic)
          .catch((err: unknown) =>
            setFirestoreDiagnostic(`Diagnostic failed: ${err instanceof Error ? err.message : String(err)}`),
          )
      }
    }
  }, [me])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
  }, [refresh])

  if (!me) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {me.role === 'admin'
            ? 'Manage roles and subscription categories.'
            : 'Create accounts for people you manage.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {me.role === 'admin' && (
            <Button variant="secondary" onClick={() => setCatModal(true)}>
              Add category
            </Button>
          )}
          {me.role === 'manager' && (
            <Button onClick={() => setModal(true)}>Add user</Button>
          )}
        </div>
      </div>
      {error && (
        <p className="whitespace-pre-wrap break-words text-sm text-red-600">{error}</p>
      )}
      {firestoreDiagnostic && (
        <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 p-3 text-left">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">
            Firestore diagnostic (expand)
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
            {firestoreDiagnostic}
          </pre>
        </details>
      )}

      {me.role === 'admin' && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
            Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} tone="default">
                {c.name}
              </Badge>
            ))}
            {categories.length === 0 && (
              <span className="text-sm text-[var(--color-muted)]">No categories yet.</span>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {me.role === 'admin' && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]/60">
                <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'info' : 'default'
                    }
                  >
                    {u.role}
                  </Badge>
                </td>
                {me.role === 'admin' && (
                  <td className="px-4 py-3">
                    {u.id !== me.id && (
                      <Select
                        className="max-w-[140px]"
                        value={u.role}
                        onChange={(e) =>
                          void updateUserRole(u.id, e.target.value as UserRole).then(refresh)
                        }
                      >
                        <option value="user">user</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                      </Select>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            No users to show.
          </div>
        )}
      </Card>

      {me.role === 'manager' && (
        <CreateUserModal
          open={modal}
          managerId={me.id}
          onClose={() => setModal(false)}
          onDone={() => {
            setModal(false)
            void refresh()
          }}
        />
      )}

      {me.role === 'admin' && (
        <CategoryModal
          open={catModal}
          onClose={() => setCatModal(false)}
          onDone={() => {
            setCatModal(false)
            void refresh()
          }}
        />
      )}
    </div>
  )
}

function CreateUserModal({
  open,
  managerId,
  onClose,
  onDone,
}: {
  open: boolean
  managerId: string
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await createUserAsManager({ email, password, name, managerId })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Create user" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Temp password</label>
          <Input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await addCategory(name)
      setName('')
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="New category" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
