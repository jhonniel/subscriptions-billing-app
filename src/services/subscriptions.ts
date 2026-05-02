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
import type { BillingCycle, Subscription, SubscriptionStatus } from '@/types'

const COL = 'subscriptions'

export async function listSubscriptionsForUser(
  userId: string,
): Promise<Subscription[]> {
  const q = query(collection(db(), COL), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

export async function listAllSubscriptions(): Promise<Subscription[]> {
  const snap = await getDocs(collection(db(), COL))
  return snap.docs.map(mapDoc)
}

export async function listSubscriptionsByPlanId(planId: string): Promise<Subscription[]> {
  const q = query(collection(db(), COL), where('planId', '==', planId))
  const snap = await getDocs(q)
  return snap.docs.map(mapDoc)
}

/** Active subscriptions tied to a plan (count toward slots). */
export async function countActiveSubscriptionsForPlan(planId: string): Promise<number> {
  const q = query(
    collection(db(), COL),
    where('planId', '==', planId),
    where('status', '==', 'active'),
  )
  const snap = await getDocs(q)
  return snap.size
}

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): Subscription {
  const data = d.data()
  return {
    id: d.id,
    userId: data.userId as string,
    name: data.name as string,
    categoryId: data.categoryId as string,
    categoryName: data.categoryName as string,
    amount: Number(data.amount),
    billingCycle: data.billingCycle as BillingCycle,
    nextBillingDate: data.nextBillingDate as string,
    status: data.status as SubscriptionStatus,
    planId: (data.planId as string | undefined) ?? null,
    planName: (data.planName as string | undefined) ?? null,
  }
}

export async function createSubscription(input: {
  userId: string
  name: string
  categoryId: string
  categoryName: string
  amount: number
  billingCycle: BillingCycle
  nextBillingDate: string
  status: SubscriptionStatus
  planId?: string | null
  planName?: string | null
}): Promise<string> {
  const payload: Record<string, unknown> = {
    userId: input.userId,
    name: input.name,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    amount: input.amount,
    billingCycle: input.billingCycle,
    nextBillingDate: input.nextBillingDate,
    status: input.status,
    createdAt: serverTimestamp(),
  }
  if (input.planId) {
    payload.planId = input.planId
    payload.planName = input.planName ?? null
  }
  const ref = await addDoc(collection(db(), COL), payload)
  return ref.id
}

export async function updateSubscription(
  id: string,
  patch: Partial<
    Pick<
      Subscription,
      | 'name'
      | 'categoryId'
      | 'categoryName'
      | 'amount'
      | 'billingCycle'
      | 'nextBillingDate'
      | 'status'
      | 'planId'
      | 'planName'
    >
  >,
): Promise<void> {
  await updateDoc(doc(db(), COL, id), patch)
}

export async function deleteSubscription(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL, id))
}
