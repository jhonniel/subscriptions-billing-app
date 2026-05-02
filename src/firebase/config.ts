import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  type AppCheck,
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
} from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/** Vite/.env often picks up trailing spaces; a bad projectId breaks Firestore and looks like “permission denied”. */
function envTrim(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

const firebaseConfig = {
  apiKey: envTrim(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: envTrim(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: envTrim(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: envTrim(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envTrim(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: envTrim(import.meta.env.VITE_FIREBASE_APP_ID),
}

let appCheckInitialized = false
let appCheckInstance: AppCheck | null = null

/** When true, never call `initializeAppCheck` (use only if Firestore App Check enforcement is OFF). */
export function isFirebaseAppCheckDisabledInEnv(): boolean {
  const v = envTrim(import.meta.env.VITE_FIREBASE_APPCHECK_DISABLE)
  return v === '1' || v?.toLowerCase() === 'true'
}

function tryInitAppCheck(firebaseApp: FirebaseApp) {
  if (appCheckInitialized || typeof window === 'undefined') return

  if (isFirebaseAppCheckDisabledInEnv()) {
    console.info(
      '[firebase] App Check not initialized (VITE_FIREBASE_APPCHECK_DISABLE). OK only while Firestore App Check enforcement is OFF in Firebase Console.',
    )
    return
  }

  const enterprise = envTrim(import.meta.env.VITE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY)
  const v3 = envTrim(import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY)
  const debugToken = envTrim(import.meta.env.VITE_APPCHECK_DEBUG_TOKEN)

  if (import.meta.env.DEV) {
    const g = globalThis as typeof globalThis & {
      FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string
    }
    if (debugToken) {
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
    } else if (enterprise || v3) {
      // With a site key, localhost needs a registered debug token once (browser console prints it).
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    } else if (import.meta.env.VITE_APPCHECK_DEV_PRINT_TOKEN === 'true') {
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    }
  }

  if (!enterprise && !v3) return

  try {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: enterprise
        ? new ReCaptchaEnterpriseProvider(enterprise)
        : new ReCaptchaV3Provider(v3!),
      isTokenAutoRefreshEnabled: true,
    })
    appCheckInitialized = true
  } catch (e) {
    console.warn('[firebase] App Check init failed', e)
    appCheckInstance = null
  }
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )
}

export function getFirebaseProjectId(): string | undefined {
  return firebaseConfig.projectId
}

export function isAppCheckActive(): boolean {
  return appCheckInitialized
}

export function hasAppCheckSiteKeyEnv(): boolean {
  return Boolean(
    envTrim(import.meta.env.VITE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY) ||
      envTrim(import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY),
  )
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and set your keys.',
    )
  }
  if (!app) {
    const apps = getApps()
    const existingDefault = apps.find((a) => a.name === '[DEFAULT]')
    app = existingDefault ?? initializeApp(firebaseConfig)
    tryInitAppCheck(app)
  }
  return app
}

/**
 * When App Check is enabled, wait for a token before large Firestore reads.
 * Helps avoid permission-denied on first list after navigation when enforcement is on.
 */
export async function ensureAppCheckTokenReady(): Promise<void> {
  if (typeof window === 'undefined') return
  getFirebaseApp()
  if (!appCheckInstance) return
  try {
    await getToken(appCheckInstance, false)
  } catch (e) {
    console.warn('[firebase] App Check getToken failed (Firestore may return permission-denied)', e)
  }
}

/** Secondary app so managers can create Auth users without signing out the primary session. */
const SECONDARY_NAME = 'SecondaryAuth'
let secondaryApp: FirebaseApp | null = null

export function getSecondaryFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured.')
  }
  if (!secondaryApp) {
    const existing = getApps().find((a) => a.name === SECONDARY_NAME)
    secondaryApp = existing ?? initializeApp(firebaseConfig, SECONDARY_NAME)
  }
  return secondaryApp
}

export const auth = () => getAuth(getFirebaseApp())
export const db = () => getFirestore(getFirebaseApp())

/** Ensures Auth has finished restoring and the ID token is available for Firestore. */
export async function ensureAuthReadyForFirestore(opts?: {
  forceRefreshToken?: boolean
}): Promise<void> {
  const a = auth()
  await a.authStateReady()
  const u = a.currentUser
  if (!u) {
    throw new Error('Not signed in. Open Login and sign in again.')
  }
  await u.getIdToken(opts?.forceRefreshToken ?? false)
}
