import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Category } from '@/types'

const COL = 'categories'

export async function listCategories(): Promise<Category[]> {
  const q = query(collection(db(), COL), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
  }))
}

export async function addCategory(name: string): Promise<string> {
  const ref = await addDoc(collection(db(), COL), {
    name: name.trim(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await updateDoc(doc(db(), COL, id), { name: name.trim() })
}

export async function removeCategory(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL, id))
}
