import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { TransactionRecord, TransactionType } from '@/types'

const COL = 'transactions'

export async function listTransactionsForUser(
  userId: string,
): Promise<TransactionRecord[]> {
  const q = query(
    collection(db(), COL),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

export async function listAllTransactions(): Promise<TransactionRecord[]> {
  const q = query(collection(db(), COL), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): TransactionRecord {
  const data = d.data()
  return {
    id: d.id,
    type: data.type as TransactionType,
    amount: Number(data.amount),
    userId: data.userId as string,
    relatedUserId: (data.relatedUserId as string | undefined) ?? null,
    date: data.date as string,
    categoryId: (data.categoryId as string | undefined) ?? null,
    categoryName: (data.categoryName as string | undefined) ?? null,
    description: (data.description as string | undefined) ?? null,
    subscriptionId: (data.subscriptionId as string | undefined) ?? null,
    lendingId: (data.lendingId as string | undefined) ?? null,
  }
}

export async function addTransaction(input: {
  type: TransactionType
  amount: number
  userId: string
  relatedUserId?: string | null
  date: string
  categoryId?: string | null
  categoryName?: string | null
  description?: string | null
  subscriptionId?: string | null
  lendingId?: string | null
}): Promise<string> {
  const ref = await addDoc(collection(db(), COL), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
