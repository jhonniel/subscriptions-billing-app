import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BillNotifications } from '@/components/BillNotifications'
import { APP_BASE } from '@/routes'
import { useUiStore } from '@/stores/uiStore'

const titles: Record<string, string> = {
  [APP_BASE]: 'Dashboard',
  [`${APP_BASE}/subscriptions`]: 'Subscriptions',
  [`${APP_BASE}/lending`]: 'Lending & debts',
  [`${APP_BASE}/balances`]: 'Balances & payables',
  [`${APP_BASE}/transactions`]: 'Transactions',
  [`${APP_BASE}/users`]: 'User management',
  [`${APP_BASE}/plans`]: 'Subscription plans',
}

export function AppShell() {
  const { pathname } = useLocation()
  const plansRoot = `${APP_BASE}/plans`
  const title =
    pathname.startsWith(`${plansRoot}/`) && pathname !== plansRoot
      ? 'Plan subscribers'
      : (titles[pathname] ?? 'JRY Billing')
  const dark = useUiStore((s) => s.dark)
  const setDark = useUiStore((s) => s.setDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const stored = localStorage.getItem('jry-billing-ui')
      if (stored) return
      setDark(mq.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setDark])

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-surface)] supports-[min-height:100dvh]:min-h-[100dvh]">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <BillNotifications />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
