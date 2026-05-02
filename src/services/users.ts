import {
  type User,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
  type QueryDocumentSnapshot,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  auth,
  db,
  ensureAppCheckTokenReady,
  ensureAuthReadyForFirestore,
  getFirebaseApp,
  getFirebaseProjectId,
  getSecondaryFirebaseApp,
  hasAppCheckSiteKeyEnv,
  isAppCheckActive,
  isFirebaseAppCheckDisabledInEnv,
} from '@/firebase/config'
import type { UserProfile, UserRole } from '@/types'

const USERS = 'users'

const KNOWN_ROLES = [
  'admin',
  'Admin',
  'ADMIN',
  'manager',
  'Manager',
  'MANAGER',
  'user',
  'User',
  'USER',
] as const

function isFirestorePermissionDenied(e: unknown): boolean {
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: unknown }).code)
      : ''
  if (code === 'permission-denied') return true
  const msg = e instanceof Error ? e.message : String(e)
  return /permission|insufficient/i.test(msg)
}

function serializeFirebaseError(e: unknown): string {
  if (typeof e !== 'object' || e === null) return String(e)
  const o = e as Record<string, unknown>
  const bits = [o.code, o.message].filter((x) => x != null && String(x).length > 0)
  if ('customData' in o && o.customData != null) {
    try {
      bits.push(JSON.stringify(o.customData))
    } catch {
      bits.push(String(o.customData))
    }
  }
  return bits.map(String).join(' | ')
}

/**
 * Step-by-step Firestore checks for support. Call after a permission error to see whether
 * self-read, limited list, or full list fails (and the exact Firebase error codes).
 */
export async function diagnoseFirestoreUsersRead(): Promise<string> {
  const lines: string[] = []
  const pid = getFirebaseProjectId() ?? 'unknown'
  lines.push(`Project: ${pid}`)

  try {
    await ensureAuthReadyForFirestore({ forceRefreshToken: true })
  } catch (e) {
    lines.push(`Auth: ${serializeFirebaseError(e)}`)
    return lines.join('\n')
  }

  const u = auth().currentUser
  lines.push(`auth.uid: ${u?.uid ?? '(null)'}`)
  if (!u) return lines.join('\n')

  try {
    const snap = await getDoc(doc(db(), USERS, u.uid))
    lines.push(`getDoc(users/${u.uid}): ok, exists=${snap.exists()}`)
  } catch (e) {
    lines.push(`getDoc(users/self): FAIL ${serializeFirebaseError(e)}`)
  }

  try {
    const n = await getDocs(query(collection(db(), USERS), limit(3)))
    lines.push(`getDocs(users + limit(3)): ok, count=${n.size}`)
  } catch (e) {
    lines.push(`getDocs(users + limit(3)): FAIL ${serializeFirebaseError(e)}`)
  }

  try {
    const all = await getDocs(collection(db(), USERS))
    lines.push(`getDocs(users full): ok, count=${all.size}`)
  } catch (e) {
    lines.push(`getDocs(users full): FAIL ${serializeFirebaseError(e)}`)
  }

  lines.push(
    'If self getDoc fails: rules not published, wrong project, API key restrictions, or App Check still enforced.',
  )
  lines.push(
    'If limit(3) works but full fails: extremely rare; try Firestore Console → Rules → Publish again.',
  )
  return lines.join('\n')
}

/**
 * Rules in this repo allow any signed-in user to read `users/*`. Repeated permission-denied
 * on list almost always means App Check enforcement without a valid token, not Security Rules.
 */
function explainUserListPermissionDenied(cause: unknown): Error {
  const base = cause instanceof Error ? cause.message : String(cause)
  const pid = getFirebaseProjectId() ?? '(unknown project)'
  const lines = [
    base,
    '',
    `Firebase project id from .env: ${pid}`,
    'This repo’s firestore.rules allow read on users/ for any authed user. If you still see permission denied, Cloud Firestore App Check enforcement is usually blocking requests that lack a valid App Check token.',
  ]
  if (isFirebaseAppCheckDisabledInEnv()) {
    lines.push(
      'You set VITE_FIREBASE_APPCHECK_DISABLE — the app does not send App Check tokens. Turn OFF Firestore enforcement (Firebase Console → App Check → APIs → Cloud Firestore), or remove this flag and configure VITE_APPCHECK_* + a registered debug token.',
    )
  } else if (!hasAppCheckSiteKeyEnv()) {
    const appCheckUrl = `https://console.firebase.google.com/project/${encodeURIComponent(pid)}/appcheck`
    lines.push(
      'No VITE_APPCHECK_* keys in .env — this web app sends no App Check token, so Firestore rejects reads when enforcement is on.',
      '',
      'Option A (fastest for dev): turn OFF enforcement for Firestore',
      `  1) Open ${appCheckUrl}`,
      '  2) Open the "APIs" section (or find "Cloud Firestore" in the App Check product list).',
      '  3) For Cloud Firestore, open the overflow menu (⋮) or details and set enforcement / "Enforce" to OFF.',
      '  4) Wait up to ~15 minutes, hard-refresh this app, try User management again.',
      '',
      'Option B (keep enforcement): add App Check to this app',
      '  1) In the same App Check area, register your web app with reCAPTCHA v3 (Firebase gives you a site key).',
      '  2) Put that key in .env as VITE_APPCHECK_RECAPTCHA_SITE_KEY=... (see .env.example).',
      '  3) Restart npm run dev; the browser console prints a debug token — register it under App Check → your web app → Manage debug tokens.',
      '',
      'This cannot be fixed from code alone while enforcement is ON and no token is sent.',
      '',
      'If enforcement is already OFF and this still appears:',
      '  • Firebase Console → Firestore → Rules: confirm the PUBLISHED rules contain allow read: if authed(); under match /users/{userId}. Deploy from this repo: npm run firestore:deploy',
      '  • Google Cloud Console → APIs & Services → Credentials → your Browser API key → Application restrictions: missing localhost often breaks the web app — set to None for testing or add http://localhost:5173 (and your deployed origin).',
      '  • Sign out and sign in again (fresh ID token).',
    )
  } else if (!isAppCheckActive()) {
    lines.push(
      'App Check keys exist in .env but initialization failed — check the browser console for [firebase] warnings.',
    )
  } else {
    lines.push(
      'App Check is on: open the browser console, copy the printed debug token, and register it under Firebase Console → App Check → your web app → Manage debug tokens (localhost).',
    )
  }
  lines.push('Redeploy firestore.rules from this repo if the Console rules are older than your checkout.')
  return new Error(lines.join('\n'), { cause })
}

function mapUserSnapshot(d: QueryDocumentSnapshot): UserProfile {
  const data = d.data()
  return {
    id: d.id,
    name: data.name as string,
    email: data.email as string,
    role: data.role as UserRole,
    createdBy: (data.createdBy as string | undefined) ?? null,
    createdAt: data.createdAt ?? null,
  }
}

/** Create `users/{uid}` for OAuth / first sign-in when missing (allowed by rules for role `user`). */
export async function ensureSelfServeUserProfile(u: User): Promise<void> {
  const ref = doc(db(), USERS, u.uid)
  const existing = await getDoc(ref)
  if (!existing.exists()) {
    await setDoc(ref, {
      name: u.displayName ?? u.email?.split('@')[0] ?? 'User',
      email: u.email ?? '',
      role: 'user',
      createdAt: serverTimestamp(),
    })
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), USERS, uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    name: data.name as string,
    email: data.email as string,
    role: data.role as UserRole,
    createdBy: (data.createdBy as string | undefined) ?? null,
    createdAt: data.createdAt ?? null,
  }
}

/**
 * Admin user list. Tries a full collection read first; if Firestore denies the broad query
 * (legacy data / rules edge cases), falls back to `where('role', 'in', …)` so only documents
 * with a known role value are considered — that query can succeed when a zombie row would
 * otherwise make list+rules fail for everyone.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  await ensureAuthReadyForFirestore()
  await ensureAppCheckTokenReady()
  const uid = auth().currentUser!.uid
  try {
    await getDoc(doc(db(), USERS, uid))
  } catch (e) {
    if (isFirestorePermissionDenied(e)) {
      throw new Error(
        `Cannot read your own profile at users/${uid}. That means Firestore still rejected the request (rules not published to this project, API key restrictions, or App Check still enforced). Check Firebase Console → Firestore → Rules and Google Cloud → Credentials for the API key.`,
        { cause: e },
      )
    }
    throw e
  }
  try {
    const snap = await getDocs(collection(db(), USERS))
    return snap.docs.map(mapUserSnapshot)
  } catch (e) {
    if (!isFirestorePermissionDenied(e)) throw e
    await ensureAuthReadyForFirestore({ forceRefreshToken: true })
    await ensureAppCheckTokenReady()
    try {
      const snap = await getDocs(collection(db(), USERS))
      return snap.docs.map(mapUserSnapshot)
    } catch (eRetry) {
      if (!isFirestorePermissionDenied(eRetry)) throw eRetry
      try {
        const q = query(collection(db(), USERS), where('role', 'in', [...KNOWN_ROLES]))
        const snap = await getDocs(q)
        return snap.docs.map(mapUserSnapshot)
      } catch (e2) {
        if (!isFirestorePermissionDenied(e2)) throw e2
        throw explainUserListPermissionDenied(e2)
      }
    }
  }
}

export async function fetchManagedUsers(managerId: string): Promise<UserProfile[]> {
  await ensureAuthReadyForFirestore()
  await ensureAppCheckTokenReady()
  const q = query(collection(db(), USERS), where('createdBy', '==', managerId))
  try {
    const snap = await getDocs(q)
    return snap.docs.map(mapUserSnapshot)
  } catch (e) {
    if (!isFirestorePermissionDenied(e)) throw e
    await ensureAuthReadyForFirestore({ forceRefreshToken: true })
    try {
      const snap = await getDocs(q)
      return snap.docs.map(mapUserSnapshot)
    } catch (e2) {
      if (isFirestorePermissionDenied(e2)) throw explainUserListPermissionDenied(e2)
      throw e2
    }
  }
}

export async function upsertUserProfile(
  uid: string,
  partial: Pick<UserProfile, 'name' | 'email' | 'role'> & {
    createdBy?: string | null
  },
): Promise<void> {
  const ref = doc(db(), USERS, uid)
  const existing = await getDoc(ref)
  await setDoc(
    ref,
    {
      ...partial,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  )
}

/** Manager creates a Firebase Auth user + Firestore profile without logging out. */
export async function createUserAsManager(input: {
  email: string
  password: string
  name: string
  managerId: string
}): Promise<string> {
  const secondaryAuth = getAuth(getSecondaryFirebaseApp())
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    input.email,
    input.password,
  )
  const uid = cred.user.uid
  await signOut(secondaryAuth)
  await setDoc(doc(db(), USERS, uid), {
    name: input.name,
    email: input.email,
    role: 'user',
    createdBy: input.managerId,
    createdAt: serverTimestamp(),
  })
  return uid
}

export async function updateUserRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  await updateDoc(doc(db(), USERS, uid), { role })
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db(), USERS, uid), { name })
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const primaryAuth = getAuth(getFirebaseApp())
  const cred = await createUserWithEmailAndPassword(
    primaryAuth,
    email,
    password,
  )
  await setDoc(doc(db(), USERS, cred.user.uid), {
    name,
    email,
    role: 'user',
    createdAt: serverTimestamp(),
  })
}

function isAuthPopupFailure(code: string | undefined): boolean {
  return (
    code === 'auth/internal-error' ||
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment'
  )
}

/** Sign in or register with Google; creates `users/{uid}` on first visit (same rules as email self-signup). */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const cred = await signInWithPopup(auth(), provider)
    await ensureSelfServeUserProfile(cred.user)
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: unknown }).code)
        : undefined
    if (isAuthPopupFailure(code)) {
      await signInWithRedirect(auth(), provider)
      return
    }
    throw e
  }
}

/** Sign in or register with Apple; enable Apple in Firebase Auth and configure the Apple provider. */
export async function signInWithApple(): Promise<void> {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  const cred = await signInWithPopup(auth(), provider)
  await ensureSelfServeUserProfile(cred.user)
}
