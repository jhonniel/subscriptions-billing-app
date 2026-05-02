/**
 * Turn Firebase JS errors into a readable string (code + optional customData).
 * `auth/internal-error` often includes more detail in `customData`.
 */
export function formatFirebaseAuthError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const fe = e as {
      message?: string
      code?: string
      customData?: Record<string, unknown>
    }
    const parts: string[] = []
    if (typeof fe.message === 'string' && fe.message.trim()) parts.push(fe.message.trim())
    if (typeof fe.code === 'string' && fe.code.trim()) parts.push(`(${fe.code})`)
    if (fe.customData && Object.keys(fe.customData).length > 0) {
      try {
        const json = JSON.stringify(fe.customData)
        parts.push(json.length > 280 ? `${json.slice(0, 280)}…` : json)
      } catch {
        /* ignore */
      }
    }
    if (parts.length > 0) return parts.join(' ')
  }
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}
