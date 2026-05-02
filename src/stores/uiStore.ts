import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  dark: boolean
  mobileNavOpen: boolean
  /** Desktop (lg+): narrow icon rail when true. */
  sidebarCollapsed: boolean
  toggleDark: () => void
  setDark: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  toggleMobileNav: () => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (v: boolean) => void
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
      sidebarCollapsed: false,
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
      toggleSidebarCollapsed: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'jry-billing-ui',
      partialize: (s) => ({ dark: s.dark, sidebarCollapsed: s.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDarkClass(state.dark)
      },
    },
  ),
)
