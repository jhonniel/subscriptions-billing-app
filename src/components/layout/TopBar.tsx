import { LogOut, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { APP_HOME } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { formatRoleLabel } from '@/utils/roles'

export function TopBar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav)

  const roleTone =
    user?.role === 'admin' ? 'info' : user?.role === 'manager' ? 'warning' : 'default'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          className="!p-2 lg:hidden"
          aria-label="Open menu"
          onClick={() => toggleMobileNav()}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to={APP_HOME} className="shrink-0" aria-label="Dashboard">
          <img
            src="/jry-billing-logo.png"
            alt=""
            className="h-7 w-auto object-contain sm:h-8"
            width={96}
            height={32}
            aria-hidden
          />
        </Link>
        <h1 className="min-w-0 truncate text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {user && (
          <div className="flex min-w-0 max-w-[28vw] flex-col items-end text-right sm:max-w-none">
            <span className="truncate text-[10px] leading-tight text-[var(--color-muted)] sm:text-[11px]">
              Logged in as
            </span>
            <Badge tone={roleTone} className="mt-0.5 max-w-full truncate text-[10px] sm:text-xs">
              {formatRoleLabel(user.role)}
            </Badge>
          </div>
        )}
        <ThemeToggle />
        <Button variant="secondary" className="gap-1.5 px-2 sm:gap-2 sm:px-4" onClick={() => void logout()}>
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  )
}
