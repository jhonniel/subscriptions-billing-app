import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  dark: boolean
  mobileNavOpen: boolean
  toggleDark: () => void
  setDark: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  toggleMobileNav: () => void
}

function applyDarkClass(dark: boolean) {
  const root = document.documentElement
  if (dark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      dark:
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      mobileNavOpen: false,
      toggleDark: () => {
        const next = !get().dark
        applyDarkClass(next)
        set({ dark: next })
      },
      setDark: (v) => {
        applyDarkClass(v)
        set({ dark: v })
      },
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
      toggleMobileNav: () => set({ mobileNavOpen: !get().mobileNavOpen }),
    }),
    {
      name: 'jry-billing-ui',
      partialize: (s) => ({ dark: s.dark }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDarkClass(state.dark)
      },
    },
  ),
)
