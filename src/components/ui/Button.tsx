import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonClass = (variant: Variant, className?: string) =>
  clsx(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' &&
      'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] focus-visible:outline-[var(--color-accent)]',
    variant === 'secondary' &&
      'border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40',
    variant === 'ghost' && 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]',
    variant === 'danger' &&
      'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
    className,
  )

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  children,
  to,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
  /** When set, renders a React Router `Link` instead of a `<button>`. */
  to?: LinkProps['to']
}) {
  const cn = buttonClass(variant, className)
  if (to !== undefined) {
    return (
      <Link to={to} className={cn}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={cn} {...props}>
      {children}
    </button>
  )
}
