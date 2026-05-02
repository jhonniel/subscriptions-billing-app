import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { LendingRecord, LendingStatus } from '@/types'

const COL = 'lending'

export async function listLendingForUser(
  userId: string,
): Promise<LendingRecord[]> {
  const [asLender, asBorrower] = await Promise.all([
    getDocs(query(collection(db(), COL), where('lenderId', '==', userId))),
    getDocs(query(collection(db(), COL), where('borrowerId', '==', userId))),
  ])
  const byId = new Map<string, LendingRecord>()
  for (const d of asLender.docs) byId.set(d.id, mapDoc(d))
  for (const d of asBorrower.docs) byId.set(d.id, mapDoc(d))
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export async function listAllLending(): Promise<LendingRecord[]> {
  const snap = await getDocs(collection(db(), COL))
  return snap.docs.map(mapDoc)
}

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): LendingRecord {
  const data = d.data()
  return {
    id: d.id,
    lenderId: data.lenderId as string,
    borrowerId: data.borrowerId as string,
    amount: Number(data.amount),
    date: data.date as string,
    status: data.status as LendingStatus,
    notes: (data.notes as string | undefined) ?? '',
  }
}

export async function createLending(input: {
  lenderId: string
  borrowerId: string
  amount: number
  date: string
  status: LendingStatus
  notes?: string
}): Promise<string> {
  const ref = await addDoc(collection(db(), COL), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLendingStatus(
  id: string,
  status: LendingStatus,
): Promise<void> {
  await updateDoc(doc(db(), COL, id), { status })
}

export async function deleteLending(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL, id))
}
