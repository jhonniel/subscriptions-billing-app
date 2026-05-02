import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
