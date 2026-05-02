import clsx from 'clsx'

const LOGO_SRC = '/jry-billing-logo.png'

/** JRY Billing wordmark + logo (PNG in `/public`). */
export function BrandMark({
  variant = 'sidebar',
  collapsed = false,
  className,
}: {
  variant?: 'sidebar' | 'login'
  /** Desktop collapsed rail: logo only. */
  collapsed?: boolean
  className?: string
}) {
  if (variant === 'login') {
    return (
      <div className={clsx('mb-6 flex flex-col items-center text-center', className)}>
        <img
          src={LOGO_SRC}
          alt="JRY Billing"
          className="h-28 w-auto max-w-[280px] object-contain"
          width={280}
          height={112}
        />
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-[var(--color-muted)]">
          Manage subscriptions. Track loans. Simplify billing.
        </p>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'mb-6 flex items-center gap-3 px-0',
        collapsed &&
          'mb-4 max-lg:mb-6 lg:mb-4 lg:justify-center lg:gap-0',
        className,
      )}
    >
      <img
        src={LOGO_SRC}
        alt=""
        className={clsx(
          'h-12 w-auto shrink-0 object-contain',
          collapsed && 'lg:h-9 lg:w-9 lg:max-w-[2.25rem]',
        )}
        width={120}
        height={48}
        aria-hidden
      />
      <div className={clsx('min-w-0', collapsed && 'lg:hidden')}>
        <div className="truncate text-sm font-bold leading-tight tracking-tight text-[#0f2744] dark:text-sky-200">
          JRY Billing
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Billing & lending
        </div>
      </div>
    </div>
  )
}
