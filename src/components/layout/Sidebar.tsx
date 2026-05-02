import {
  CreditCard,
  HandCoins,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Package,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { BrandMark } from '@/components/BrandMark'
import { APP_BASE } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { UserRole } from '@/types'

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition'

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  onNavigate,
}: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        clsx(
          linkBase,
          isActive
            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
            : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

function roleLinks(role: UserRole) {
  const common = [{ to: APP_BASE, icon: LayoutDashboard, label: 'Dashboard', end: true as const }]
  const subs = { to: `${APP_BASE}/subscriptions`, icon: CreditCard, label: 'Subscriptions' }
  const lend = { to: `${APP_BASE}/lending`, icon: HandCoins, label: 'Lending' }
  const balances = { to: `${APP_BASE}/balances`, icon: Wallet, label: 'Balances' }
  const tx = { to: `${APP_BASE}/transactions`, icon: ListOrdered, label: 'Transactions' }
  const users = { to: `${APP_BASE}/users`, icon: Users, label: 'Users' }
  const plans = { to: `${APP_BASE}/plans`, icon: Package, label: 'Plans' }

  if (role === 'admin') {
    return [...common, subs, lend, balances, plans, tx, users]
  }
  if (role === 'manager') {
    return [...common, subs, lend, balances, users]
  }
  return [...common, subs, lend, balances]
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const { dark, toggleDark, mobileNavOpen, setMobileNavOpen } = useUiStore()
  const links = user ? roleLinks(user.role) : []

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname, setMobileNavOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setMobileNavOpen])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[min(17rem,88vw)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-2)]/95 p-4 shadow-xl backdrop-blur-md transition-transform duration-200 ease-out',
          'lg:static lg:z-0 lg:w-60 lg:max-w-none lg:translate-x-0 lg:bg-[var(--color-surface-2)]/80 lg:shadow-none',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Menu
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-6 px-1">
          <BrandMark variant="sidebar" />
          <div className="truncate px-1 text-sm font-semibold text-[var(--color-foreground)]">
            {user?.name ?? 'Account'}
          </div>
          <div className="truncate px-1 text-xs text-[var(--color-muted)]">{user?.role}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {links.map((l) => (
            <NavItem key={l.to} {...l} onNavigate={() => setMobileNavOpen(false)} />
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleDark}
          className={clsx(
            linkBase,
            'mt-4 shrink-0 text-[var(--color-muted)] hover:bg-[var(--color-surface)]',
          )}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
      </aside>
    </>
  )
}
