import {
  BarChart3,
  Cloud,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Shield,
  Users,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { LandingHeroBackdrop } from '@/components/LandingHeroBackdrop'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { isFirebaseConfigured } from '@/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import { APP_HOME } from '@/routes'

const features = [
  {
    icon: CreditCard,
    title: 'Recurring subscriptions',
    body: 'Plans, cycles, and renewals in one place—built for finance and ops teams.',
  },
  {
    icon: HandCoins,
    title: 'Lending & repayments',
    body: 'Track loans between people you manage with clear status and history.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards & balances',
    body: 'See exposure, monthly equivalents, and activity without spreadsheets.',
  },
  {
    icon: Users,
    title: 'Roles that match reality',
    body: 'Admins, managers, and members—each sees only what they should in your workspace.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    body: 'Sign in with Google, Apple, or email. Your data stays in your Firebase project.',
  },
  {
    icon: Cloud,
    title: 'Cloud-native SaaS',
    body: 'No installs or servers to run. Open the app, invite your team, and go.',
  },
] as const

export function LandingPage() {
  const firebaseUid = useAuthStore((s) => s.firebaseUid)
  const loading = useAuthStore((s) => s.loading)

  if (isFirebaseConfigured() && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-2)] text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  if (firebaseUid) {
    return <Navigate to={APP_HOME} replace />
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-[var(--color-foreground)]"
            aria-label="JRY Billing home"
          >
            <img
              src="/jry-billing-logo.png"
              alt=""
              className="h-9 w-auto object-contain"
              width={120}
              height={36}
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              JRY Billing
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="secondary" to="/login">
              Sign in
            </Button>
            <Button to="/login" className="hidden sm:inline-flex">
              Open workspace
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-accent)]/[0.07] to-transparent px-4 py-16 sm:px-6 sm:py-24">
          {/* Glow sits under icon layer so SVG marks stay visible */}
          <div className="pointer-events-none absolute inset-x-0 -top-24 z-0 flex justify-center">
            <div className="h-64 w-[min(100%,48rem)] rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
          </div>
          <LandingHeroBackdrop />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1 text-xs font-medium text-[var(--color-muted)] shadow-sm">
              <LayoutDashboard className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
              Subscription & billing workspace
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl">
              Run recurring billing and internal lending in one SaaS workspace.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-[var(--color-muted)] sm:text-lg">
              JRY Billing is a cloud product for organizations that need shared visibility into
              subscriptions, balances, and money movement—without wiring up billing infrastructure
              from scratch.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button to="/login" className="px-6 py-2.5 text-base">
                Get started
              </Button>
              <Button variant="secondary" to="/login" className="px-6 py-2.5 text-base">
                Sign in to your org
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              Everything in one product
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Purpose-built flows for admins and managers—not a generic spreadsheet or a generic
              CRM bolt-on.
            </p>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-6 shadow-sm transition hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-2)]/80"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              Ready when your team is
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Use your existing Google or Apple account, or email and password. Your workspace opens
              after sign-in—no separate download or self-hosted install.
            </p>
            <Button to="/login" className="mt-8 px-8 py-2.5 text-base">
              Open JRY Billing
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <BrandMark variant="sidebar" className="mb-3 !justify-center sm:!justify-start" />
            <p className="max-w-md text-xs text-[var(--color-muted)]">
              JRY Billing is offered as a software-as-a-service experience in the browser. Hosting
              and data storage are tied to your Firebase project configuration.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-[var(--color-muted)] sm:items-end">
            <Link
              to="/login"
              className="font-medium text-[var(--color-accent)] hover:underline"
            >
              Workspace sign-in
            </Link>
            <span className="text-xs">© {new Date().getFullYear()} JRY Billing</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
