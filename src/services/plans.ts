import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { BillingCycle, SubscriptionPlan } from '@/types'

const COL = 'plans'

function mapPlan(d: { id: string; data: () => Record<string, unknown> }): SubscriptionPlan {
  const data = d.data()
  return {
    id: d.id,
    name: data.name as string,
    description: (data.description as string) ?? '',
    categoryId: data.categoryId as string,
    categoryName: data.categoryName as string,
    slotsTotal: Number(data.slotsTotal) || 0,
    defaultAmount: Number(data.defaultAmount) || 0,
    billingCycle: data.billingCycle as BillingCycle,
    active: data.active !== false,
  }
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  const snap = await getDocs(collection(db(), COL))
  return snap.docs.map(mapPlan).sort((a, b) => a.name.localeCompare(b.name))
}

export async function listActivePlans(): Promise<SubscriptionPlan[]> {
  const q = query(collection(db(), COL), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(mapPlan).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getPlan(id: string): Promise<SubscriptionPlan | null> {
  const snap = await getDoc(doc(db(), COL, id))
  if (!snap.exists()) return null
  return mapPlan(snap)
}

export async function createPlan(input: {
  name: string
  description: string
  categoryId: string
  categoryName: string
  slotsTotal: number
  defaultAmount: number
  billingCycle: BillingCycle
  active: boolean
}): Promise<string> {
  const ref = await addDoc(collection(db(), COL), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePlan(
  id: string,
  patch: Partial<
    Pick<
      SubscriptionPlan,
      | 'name'
      | 'description'
      | 'categoryId'
      | 'categoryName'
      | 'slotsTotal'
      | 'defaultAmount'
      | 'billingCycle'
      | 'active'
    >
  >,
): Promise<void> {
  await updateDoc(doc(db(), COL, id), patch)
}

export async function deletePlan(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL, id))
}
