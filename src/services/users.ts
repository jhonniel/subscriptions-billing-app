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
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  auth,
  db,
  getFirebaseApp,
  getSecondaryFirebaseApp,
} from '@/firebase/config'
import type { UserProfile, UserRole } from '@/types'

const USERS = 'users'

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

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db(), USERS))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name as string,
      email: data.email as string,
      role: data.role as UserRole,
      createdBy: (data.createdBy as string | undefined) ?? null,
      createdAt: data.createdAt ?? null,
    }
  })
}

export async function fetchManagedUsers(managerId: string): Promise<UserProfile[]> {
  const q = query(collection(db(), USERS), where('createdBy', '==', managerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name as string,
      email: data.email as string,
      role: data.role as UserRole,
      createdBy: (data.createdBy as string | undefined) ?? null,
      createdAt: data.createdAt ?? null,
    }
  })
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
