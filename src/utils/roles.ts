import type { UserProfile, UserRole } from '@/types'

export function hasRole(user: UserProfile | null, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}

export function canManageUser(
  actor: UserProfile | null,
  _targetUserId: string,
  targetCreatedBy: string | null | undefined,
): boolean {
  if (!actor) return false
  if (actor.role === 'admin') return true
  if (actor.role === 'manager' && targetCreatedBy === actor.id) return true
  return false
}

export function canViewUserData(
  actor: UserProfile | null,
  subjectUserId: string,
  subjectCreatedBy: string | null | undefined,
): boolean {
  if (!actor) return false
  if (actor.role === 'admin') return true
  if (actor.id === subjectUserId) return true
  if (actor.role === 'manager' && subjectCreatedBy === actor.id) return true
  return false
}
