import {
  ChevronLeft,
  ChevronRight,
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
import { formatRoleLabel } from '@/utils/roles'

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition'

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  collapsed,
  onNavigate,
}: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
  /** Desktop (lg+): icon rail; labels hidden on large screens only. */
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        clsx(
          linkBase,
          collapsed && 'lg:justify-center lg:gap-0 lg:px-2',
          isActive
            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
            : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={clsx('truncate', collapsed && 'lg:hidden')}>{label}</span>
      {collapsed ? (
        <span className="max-lg:hidden sr-only">{label}</span>
      ) : null}
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
  return [...common, lend, balances]
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const {
    dark,
    toggleDark,
    mobileNavOpen,
    setMobileNavOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUiStore()
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
          'lg:static lg:z-0 lg:max-w-none lg:translate-x-0 lg:bg-[var(--color-surface-2)]/80 lg:shadow-none',
          'lg:overflow-x-hidden lg:transition-[width,padding] lg:duration-200 lg:ease-out',
          sidebarCollapsed ? 'lg:w-14 lg:min-w-14 lg:p-2' : 'lg:w-60 lg:p-4',
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
          <BrandMark variant="sidebar" collapsed={sidebarCollapsed} />
          <div
            className={clsx(
              'truncate px-1 text-sm font-semibold text-[var(--color-foreground)]',
              sidebarCollapsed && 'lg:hidden',
            )}
          >
            {user?.name ?? 'Account'}
          </div>
          {user && (
            <div
              className={clsx(
                'px-1 text-xs leading-snug text-[var(--color-muted)]',
                sidebarCollapsed && 'lg:hidden',
              )}
            >
              Logged in as{' '}
              <span className="font-semibold text-[var(--color-foreground)]">
                {formatRoleLabel(user.role)}
              </span>
            </div>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {links.map((l) => (
            <NavItem
              key={l.to}
              {...l}
              collapsed={sidebarCollapsed}
              onNavigate={() => setMobileNavOpen(false)}
            />
          ))}
        </nav>
        <button
          type="button"
          className={clsx(
            'mb-2 hidden shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] lg:flex',
            sidebarCollapsed && 'lg:mx-auto lg:w-10',
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebarCollapsed}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={toggleDark}
          title={dark ? 'Light mode' : 'Dark mode'}
          className={clsx(
            linkBase,
            'mt-0 shrink-0 text-[var(--color-muted)] hover:bg-[var(--color-surface)]',
            sidebarCollapsed && 'lg:justify-center lg:gap-0 lg:px-2',
          )}
        >
          {dark ? <Sun className="h-4 w-4 shrink-0" aria-hidden /> : <Moon className="h-4 w-4 shrink-0" aria-hidden />}
          <span className={clsx(sidebarCollapsed && 'lg:hidden')}>
            {dark ? 'Light mode' : 'Dark mode'}
          </span>
          {sidebarCollapsed ? (
            <span className="max-lg:hidden sr-only">
              {dark ? 'Light mode' : 'Dark mode'}
            </span>
          ) : null}
        </button>
      </aside>
    </>
  )
}
