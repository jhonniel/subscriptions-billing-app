import clsx from 'clsx'
import { Moon, Sun } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

export function ThemeToggle() {
  const dark = useUiStore((s) => s.dark)
  const toggleDark = useUiStore((s) => s.toggleDark)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => toggleDark()}
      className={clsx(
        'relative flex h-9 w-[4.5rem] shrink-0 items-center justify-center rounded-full border',
        // Use app theme from the store, not `prefers-color-scheme`, so light mode is always a white track.
        dark
          ? 'border-white/10 bg-zinc-700 shadow-[0_1px_3px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.2)]'
          : 'border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
      )}
    >
      {/* Thumb: same vertical math as the icon row (h-8), centered in h-9 track */}
      <span
        className={clsx(
          'pointer-events-none absolute top-1/2 z-0 h-8 w-8 -translate-y-1/2 rounded-full',
          'bg-[var(--color-accent)] shadow-sm',
          'transition-[left,right] duration-200 ease-[cubic-bezier(0.25,0.8,0.25,1)]',
          dark ? 'left-auto right-0.5' : 'left-0.5 right-auto',
        )}
      />
      {/* Two equal columns so icons share the same centerline as each other and the thumb */}
      <span className="pointer-events-none relative z-10 grid h-8 w-full grid-cols-2 place-items-center px-0.5">
        <Sun
          className={clsx('size-[18px]', dark ? 'text-zinc-400' : 'text-white')}
          strokeWidth={2}
          aria-hidden
        />
        <Moon
          className={clsx('size-[18px]', dark ? 'text-white' : 'text-zinc-400')}
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </button>
  )
}
