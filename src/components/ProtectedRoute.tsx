import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isFirebaseConfigured } from '@/firebase/config'
import { APP_HOME } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

export function ProtectedRoute() {
  const firebaseUid = useAuthStore((s) => s.firebaseUid)
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)
  const authError = useAuthStore((s) => s.error)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  if (!isFirebaseConfigured()) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  if (!firebaseUid) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4 text-center sm:p-6">
        {authError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left text-sm text-red-800 dark:text-red-200">
            {authError}
          </p>
        ) : (
          <p className="text-[var(--color-foreground)]">
            No Firestore profile found for this account. Create document{' '}
            <code className="text-sm">users/{firebaseUid}</code> with <code className="text-sm">role</code>,{' '}
            <code className="text-sm">name</code>, and <code className="text-sm">email</code> (see{' '}
            <code className="text-sm">seed/README.md</code>).
          </p>
        )}
        <button
          type="button"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>
    )
  }

  return <Outlet />
}

export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  if (!user || !allow.includes(user.role)) {
    return <Navigate to={APP_HOME} replace />
  }

  return <Outlet />
}
