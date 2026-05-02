export type UserRole = 'admin' | 'manager' | 'user'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  createdBy?: string | null
  createdAt?: { seconds: number; nanoseconds: number } | null
}

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'

/** Admin-defined catalog (e.g. Netflix, Spotify) with a fixed number of member slots. */
export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  /** Max active subscribers allowed on this plan. */
  slotsTotal: number
  defaultAmount: number
  billingCycle: BillingCycle
  active: boolean
}

export interface Subscription {
  id: string
  userId: string
  name: string
  categoryId: string
  categoryName: string
  amount: number
  billingCycle: BillingCycle
  nextBillingDate: string
  status: SubscriptionStatus
  /** When set, this row counts toward the plan’s slot usage. */
  planId?: string | null
  planName?: string | null
}

export type LendingStatus = 'pending' | 'paid'

export interface LendingRecord {
  id: string
  lenderId: string
  borrowerId: string
  amount: number
  date: string
  status: LendingStatus
  notes?: string
}

export type TransactionType = 'subscription' | 'lending' | 'repayment' | 'manual'

export interface TransactionRecord {
  id: string
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
}

export interface Category {
  id: string
  name: string
}
