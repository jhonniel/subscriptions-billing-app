import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { create } from 'zustand'
import {
  auth,
  getFirebaseProjectId,
  hasAppCheckSiteKeyEnv,
  isAppCheckActive,
  isFirebaseConfigured,
} from '@/firebase/config'
import {
  ensureSelfServeUserProfile,
  fetchUserProfile,
  signInWithApple,
  signInWithGoogle,
} from '@/services/users'
import type { UserProfile } from '@/types'
import { formatFirebaseAuthError } from '@/utils/firebaseErrors'

function firestoreAccessHint(uid: string, code: string | null): string {
  const pid = getFirebaseProjectId() ?? '(unset)'
  const appCheckConsole = `https://console.firebase.google.com/project/${encodeURIComponent(pid)}/appcheck`
  const rulesConsole = `https://console.firebase.google.com/project/${encodeURIComponent(pid)}/firestore/rules`

  if (code === 'permission-denied' && !isAppCheckActive()) {
    const siteHint = hasAppCheckSiteKeyEnv()
      ? 'App Check site key is in .env but App Check did not finish initializing (see browser console for [firebase] warnings).'
      : 'No App Check provider is configured in this app (.env is missing VITE_APPCHECK_RECAPTCHA_SITE_KEY or VITE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY).'
    return (
      `Firestore blocked reading users/${uid} (permission-denied). Project: ${pid}. ` +
      `${siteHint} ` +
      `When Cloud Firestore has App Check enforcement ON, Firebase returns this same error even if Security Rules allow the read. ` +
      `Fix A: App Check console → your web app → register reCAPTCHA, put the site key in .env, restart dev; open the browser console, copy the printed App Check debug token, and register it under the app’s “Manage debug tokens”. ` +
      `Fix B: App Check → APIs → Cloud Firestore → turn enforcement off for now. ` +
      `Links: ${appCheckConsole} · Rules: ${rulesConsole}`
    )
  }

  if (code === 'permission-denied' && isAppCheckActive()) {
    return (
      `Firestore blocked reading users/${uid} (permission-denied). Project: ${pid}. ` +
      `App Check is active, so this is likely Security Rules or missing data: deploy firestore.rules from this repo, and ensure a document exists at users/${uid} with that exact id as your Auth user id. ` +
      `Rules: ${rulesConsole}`
    )
  }

  return (
    `Firestore blocked reading users/${uid}. Project: ${pid}. ` +
    `[Firebase: ${code ?? 'unknown'}]. ` +
    `Deploy firestore.rules to this project; confirm users/${uid} exists. App Check: ${appCheckConsole}`
  )
}

/** Firebase JS errors expose `code` (e.g. permission-denied, unavailable). */
function firebaseErrorCode(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const c = (e as { code: unknown }).code
    if (typeof c === 'string') return c
  }
  if (e instanceof Error && e.cause !== undefined) {
    return firebaseErrorCode(e.cause)
  }
  return null
}

type AuthState = {
  user: UserProfile | null
  firebaseUid: string | null
  loading: boolean
  error: string | null
  init: () => () => void
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUid: null,
  loading: true,
  error: null,

  init: () => {
    if (!isFirebaseConfigured()) {
      set({ loading: false, user: null, firebaseUid: null })
      return () => {}
    }
    void (async () => {
      try {
        const cred = await getRedirectResult(auth())
        if (cred?.user) {
          await ensureSelfServeUserProfile(cred.user)
        }
      } catch (e) {
        console.warn('[auth] getRedirectResult', e)
      }
    })()

    const unsub = onAuthStateChanged(auth(), async (fbUser) => {
      if (!fbUser) {
        set({ user: null, firebaseUid: null, loading: false, error: null })
        return
      }
      set({ firebaseUid: fbUser.uid, loading: true, error: null })
      try {
        // Ensure Auth is fully wired before Firestore reads (avoids rare permission-denied right after sign-in).
        await auth().authStateReady()
        await fbUser.getIdToken(true)
        let profile: Awaited<ReturnType<typeof fetchUserProfile>>
        try {
          profile = await fetchUserProfile(fbUser.uid)
        } catch (e) {
          const code = firebaseErrorCode(e)
          const msg = e instanceof Error ? e.message : String(e)
          const codeBit = code ? ` [Firebase: ${code}]` : ''
          throw new Error(`${msg}${codeBit} ${firestoreAccessHint(fbUser.uid, code)}`, { cause: e })
        }
        if (!profile) {
          try {
            await ensureSelfServeUserProfile(fbUser)
          } catch (e) {
            const code = firebaseErrorCode(e)
            const msg = e instanceof Error ? e.message : String(e)
            const codeBit = code ? ` [Firebase: ${code}]` : ''
            throw new Error(
              `Could not create users/${fbUser.uid}: ${msg}${codeBit}. Rules must allow self-signup (role "user", no createdBy).`,
              { cause: e },
            )
          }
          profile = await fetchUserProfile(fbUser.uid)
          if (!profile) {
            throw new Error(
              `Profile still missing after create. Add users/${fbUser.uid} in Firestore with name, email, role.`,
            )
          }
        }
        set({ user: profile, loading: false, error: null })
      } catch (e) {
        console.error('Auth profile load failed', e)
        set({
          user: null,
          loading: false,
          error:
            e instanceof Error ? e.message : 'Could not load your account from the server.',
        })
      }
    })
    return unsub
  },

  login: async (email, password) => {
    set({ error: null })
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase is not configured.' })
      return
    }
    await signInWithEmailAndPassword(auth(), email, password)
  },

  loginWithGoogle: async () => {
    set({ error: null })
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase is not configured.' })
      return
    }
    try {
      await signInWithGoogle()
    } catch (e) {
      set({ error: formatFirebaseAuthError(e), loading: false })
      return
    }
    const fb = auth().currentUser
    if (!fb) {
      // Google sign-in may have started a full-page redirect; session completes after return.
      return
    }
    try {
      await auth().authStateReady()
      await fb.getIdToken(true)
      let profile = await fetchUserProfile(fb.uid)
      if (!profile) {
        await ensureSelfServeUserProfile(fb)
        profile = await fetchUserProfile(fb.uid)
      }
      set({ firebaseUid: fb.uid, user: profile, loading: false, error: null })
    } catch (e) {
      console.error('Google sign-in profile load failed', e)
      set({
        firebaseUid: fb.uid,
        user: null,
        loading: false,
        error:
          e instanceof Error
            ? `${e.message} ${firestoreAccessHint(fb.uid, firebaseErrorCode(e))}`
            : `Could not load your account. ${firestoreAccessHint(fb.uid, firebaseErrorCode(e))}`,
      })
    }
  },

  loginWithApple: async () => {
    set({ error: null })
    if (!isFirebaseConfigured()) {
      set({ error: 'Firebase is not configured.' })
      return
    }
    try {
      await signInWithApple()
    } catch (e) {
      set({ error: formatFirebaseAuthError(e), loading: false })
      return
    }
    const fb = auth().currentUser
    if (!fb) return
    try {
      await auth().authStateReady()
      await fb.getIdToken(true)
      let profile = await fetchUserProfile(fb.uid)
      if (!profile) {
        await ensureSelfServeUserProfile(fb)
        profile = await fetchUserProfile(fb.uid)
      }
      set({ firebaseUid: fb.uid, user: profile, loading: false, error: null })
    } catch (e) {
      console.error('Apple sign-in profile load failed', e)
      set({
        firebaseUid: fb.uid,
        user: null,
        loading: false,
        error:
          e instanceof Error
            ? `${e.message} ${firestoreAccessHint(fb.uid, firebaseErrorCode(e))}`
            : `Could not load your account. ${firestoreAccessHint(fb.uid, firebaseErrorCode(e))}`,
      })
    }
  },

  logout: async () => {
    if (!isFirebaseConfigured()) return
    await signOut(auth())
    set({ user: null, firebaseUid: null, error: null })
  },

  refreshProfile: async () => {
    const uid = auth().currentUser?.uid ?? get().firebaseUid
    if (!uid) return
    try {
      await auth().authStateReady()
      await auth().currentUser?.getIdToken(true)
      const profile = await fetchUserProfile(uid)
      set({ firebaseUid: uid, user: profile, error: null })
    } catch (e) {
      console.error('refreshProfile failed', e)
      set({
        error:
          e instanceof Error
            ? `${e.message} ${firestoreAccessHint(uid, firebaseErrorCode(e))}`
            : `Could not refresh profile. ${firestoreAccessHint(uid, firebaseErrorCode(e))}`,
      })
    }
  },
}))
