import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { AppleIcon } from '@/components/AppleIcon'
import { GoogleIcon } from '@/components/GoogleIcon'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { isFirebaseConfigured } from '@/firebase/config'
import { registerWithEmail } from '@/services/users'
import { APP_HOME } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { formatFirebaseAuthError } from '@/utils/firebaseErrors'

export function LoginPage() {
  const { firebaseUid, login, loginWithGoogle, loginWithApple, error } = useAuthStore()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from
    ?.pathname

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const configured = isFirebaseConfigured()

  if (firebaseUid) {
    const dest =
      from && from !== '/login' && from.startsWith('/app') ? from : APP_HOME
    return <Navigate to={dest} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!email.trim()) {
      setLocalError('Enter your email.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await registerWithEmail(email, password, name || email.split('@')[0])
      }
    } catch (err: unknown) {
      setLocalError(formatFirebaseAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-2)] p-4">
      <Card className="w-full max-w-md">
        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
            Firebase is not configured. Copy{' '}
            <code className="rounded bg-[var(--color-surface-2)] px-1 text-xs">.env.example</code>{' '}
            to <code className="rounded bg-[var(--color-surface-2)] px-1 text-xs">.env</code> and add
            your web app keys from the Firebase console.
          </p>
        )}
        <BrandMark variant="login" />
        <p className="mb-2 text-sm text-[var(--color-muted)]">
          {mode === 'login' ? 'Sign in to continue' : 'Create a user account'}
        </p>
        <p className="mb-6 text-xs leading-relaxed text-[var(--color-muted)]">
          Sign in with <strong className="font-medium text-[var(--color-foreground)]">Gmail</strong>{' '}
          or <strong className="font-medium text-[var(--color-foreground)]">Apple</strong>, or use
          email and password below.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 font-medium shadow-sm hover:bg-[var(--color-surface-2)]"
            disabled={busy || !configured}
            onClick={() => {
              setLocalError(null)
              setBusy(true)
              void loginWithGoogle()
                .catch((err: unknown) => {
                  setLocalError(formatFirebaseAuthError(err))
                })
                .finally(() => setBusy(false))
            }}
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Gmail
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 font-medium shadow-sm hover:bg-[var(--color-surface-2)]"
            disabled={busy || !configured}
            onClick={() => {
              setLocalError(null)
              setBusy(true)
              void loginWithApple()
                .catch((err: unknown) => {
                  setLocalError(formatFirebaseAuthError(err))
                })
                .finally(() => setBusy(false))
            }}
          >
            <AppleIcon className="h-5 w-5 shrink-0" />
            Apple
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--color-surface)] px-2 text-[var(--color-muted)]">
              Or use email
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
                Display name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                autoComplete="name"
                disabled={!configured}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={!configured}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Password
            </label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={!configured}
            />
          </div>
          {(localError || error) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {localError ?? error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy || !configured}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="font-medium text-[var(--color-accent)] hover:underline"
                onClick={() => setMode('register')}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-[var(--color-accent)] hover:underline"
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </Card>
    </div>
  )
}
