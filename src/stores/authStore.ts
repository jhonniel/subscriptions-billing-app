import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { create } from 'zustand'
import { auth, getFirebaseProjectId, isFirebaseConfigured } from '@/firebase/config'
import {
  ensureSelfServeUserProfile,
  fetchUserProfile,
  signInWithApple,
  signInWithGoogle,
} from '@/services/users'
import type { UserProfile } from '@/types'
import { formatFirebaseAuthError } from '@/utils/firebaseErrors'

function firestoreAccessHint(uid: string): string {
  const pid = getFirebaseProjectId() ?? '(unset)'
  return (
    `Firestore blocked reading users/${uid}. Project: ${pid}. ` +
    `Fix: (1) Console → Firestore → Rules → publish this repo’s firestore.rules to this project. ` +
    `(2) Data → users → document id must equal your Auth UID. ` +
    `(3) If App Check enforces Firestore: Console → App Check → turn enforcement off until the web app is registered, or finish App Check there (this repo does not set App Check in code).`
  )
}

/** Firebase JS errors expose `code` (e.g. permission-denied, unavailable). */
function firebaseErrorCode(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const c = (e as { code: unknown }).code
    return typeof c === 'string' ? c : null
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
          throw new Error(`${msg}${codeBit} ${firestoreAccessHint(fbUser.uid)}`, { cause: e })
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
            ? `${e.message} ${firestoreAccessHint(fb.uid)}`
            : `Could not load your account. ${firestoreAccessHint(fb.uid)}`,
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
            ? `${e.message} ${firestoreAccessHint(fb.uid)}`
            : `Could not load your account. ${firestoreAccessHint(fb.uid)}`,
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
            ? `${e.message} ${firestoreAccessHint(uid)}`
            : `Could not refresh profile. ${firestoreAccessHint(uid)}`,
      })
    }
  },
}))
