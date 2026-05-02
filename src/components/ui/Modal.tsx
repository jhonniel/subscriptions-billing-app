import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[min(92dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] border-b-0 bg-[var(--color-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-xl sm:border-b sm:p-6 sm:pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
            {title}
          </h2>
          <Button variant="ghost" className="!p-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
