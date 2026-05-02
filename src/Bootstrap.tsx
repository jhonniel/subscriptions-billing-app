import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

export function Bootstrap({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init)
  const dark = useUiStore((s) => s.dark)

  useEffect(() => {
    const unsub = init()
    return unsub
  }, [init])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return children
}
