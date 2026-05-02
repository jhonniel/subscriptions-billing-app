/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** reCAPTCHA Enterprise site key (App Check web). */
  readonly VITE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY?: string
  /** reCAPTCHA v3 site key (App Check web). */
  readonly VITE_APPCHECK_RECAPTCHA_SITE_KEY?: string
  /** UUID registered in Firebase Console → App Check → Manage debug tokens (use with npm run dev). */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string
  /** If true in dev, logs a one-time App Check debug token to the browser console. */
  readonly VITE_APPCHECK_DEV_PRINT_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
