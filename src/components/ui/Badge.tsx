import clsx from 'clsx'
import type { ReactNode } from 'react'

const tones: Record<string, string> = {
  default: 'bg-[var(--color-surface-2)] text-[var(--color-foreground)]',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-300',
  info: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
}

export function Badge({
  tone = 'default',
  children,
  className,
}: {
  tone?: keyof typeof tones
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone] ?? tones.default,
        className,
      )}
    >
      {children}
    </span>
  )
}
