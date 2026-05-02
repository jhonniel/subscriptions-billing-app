import {
  Cloud,
  Film,
  Headphones,
  Music2,
  Radio,
  Receipt,
  Satellite,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react'

type Mark = {
  Icon: typeof Music2
  className: string
}

/** Decorative SVG field for the landing hero only (not trademark logos). */
const marks: Mark[] = [
  { Icon: Music2, className: 'left-[3%] top-[12%] h-16 w-16 -rotate-12 sm:h-20 sm:w-20' },
  { Icon: Film, className: 'right-[4%] top-[8%] h-20 w-20 rotate-6 sm:h-24 sm:w-24' },
  { Icon: Satellite, className: 'left-[12%] bottom-[18%] h-14 w-14 rotate-[18deg] sm:h-[4.5rem] sm:w-[4.5rem]' },
  { Icon: Receipt, className: 'right-[10%] bottom-[22%] h-16 w-16 -rotate-6 sm:h-20 sm:w-20' },
  { Icon: Headphones, className: 'left-[42%] top-[6%] h-12 w-12 -translate-x-1/2 rotate-3 sm:h-14 sm:w-14' },
  { Icon: Tv, className: 'right-[28%] top-[20%] h-11 w-11 rotate-12 sm:h-14 sm:w-14' },
  { Icon: Radio, className: 'left-[22%] top-[38%] h-10 w-10 -rotate-[22deg] sm:h-12 sm:w-12' },
  { Icon: Smartphone, className: 'right-[18%] top-[42%] h-12 w-12 sm:h-14 sm:w-14' },
  { Icon: Wifi, className: 'left-[8%] top-[48%] h-9 w-9 rotate-6 sm:h-11 sm:w-11' },
  { Icon: Zap, className: 'right-[6%] top-[52%] h-10 w-10 -rotate-12 sm:h-12 sm:w-12' },
  { Icon: Receipt, className: 'left-[55%] bottom-[12%] h-12 w-12 rotate-6 sm:h-14 sm:w-14' },
  { Icon: Music2, className: 'right-[38%] bottom-[8%] h-10 w-10 rotate-[15deg] sm:h-12 sm:w-12' },
  { Icon: Film, className: 'left-[68%] top-[28%] h-9 w-9 -rotate-6 sm:h-11 sm:w-11' },
  { Icon: Satellite, className: 'right-[48%] bottom-[28%] h-11 w-11 rotate-3 sm:h-12 sm:w-12' },
  { Icon: Headphones, className: 'left-[78%] top-[55%] hidden h-12 w-12 rotate-12 md:block' },
  { Icon: Tv, className: 'left-[6%] bottom-[8%] hidden h-11 w-11 -rotate-6 sm:block' },
  { Icon: Cloud, className: 'left-[50%] bottom-[4%] h-10 w-10 -translate-x-1/2 rotate-6 sm:h-12 sm:w-12' },
]

export function LandingHeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none"
      aria-hidden
    >
      {marks.map(({ Icon, className }, i) => (
        <Icon
          key={i}
          className={`absolute text-[var(--color-accent)] opacity-[0.16] dark:text-[var(--color-accent)] dark:opacity-[0.28] ${className}`}
          strokeWidth={1.35}
        />
      ))}
    </div>
  )
}
