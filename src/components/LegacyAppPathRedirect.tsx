import { Navigate, useParams } from 'react-router-dom'
import { APP_BASE } from '@/routes'

/** Preserves bookmarks from before the app lived under `/app`. */
export function LegacyPlanRedirect() {
  const { planId } = useParams<{ planId: string }>()
  if (!planId) return <Navigate to={`${APP_BASE}/plans`} replace />
  return <Navigate to={`${APP_BASE}/plans/${planId}`} replace />
}
