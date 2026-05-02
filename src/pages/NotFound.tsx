import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { APP_HOME } from '@/routes'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          That route does not exist or you do not have access.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <Link to="/" className="font-medium text-[var(--color-accent)] hover:underline">
            Marketing home
          </Link>
          <Link to={APP_HOME} className="font-medium text-[var(--color-accent)] hover:underline">
            Workspace
          </Link>
        </div>
      </Card>
    </div>
  )
}
