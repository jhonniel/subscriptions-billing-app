import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LegacyPlanRedirect } from '@/components/LegacyAppPathRedirect'
import { ProtectedRoute, RoleRoute } from '@/components/ProtectedRoute'
import { BalancesPage } from '@/pages/Balances'
import { DashboardPage } from '@/pages/Dashboard'
import { LandingPage } from '@/pages/Landing'
import { LendingPage } from '@/pages/Lending'
import { PlanSubscribersPage } from '@/pages/PlanSubscribers'
import { PlansPage } from '@/pages/Plans'
import { LoginPage } from '@/pages/Login'
import { NotFoundPage } from '@/pages/NotFound'
import { SubscriptionsPage } from '@/pages/Subscriptions'
import { TransactionsPage } from '@/pages/Transactions'
import { UsersPage } from '@/pages/Users'
import { APP_BASE } from '@/routes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/subscriptions" element={<Navigate to={`${APP_BASE}/subscriptions`} replace />} />
      <Route path="/lending" element={<Navigate to={`${APP_BASE}/lending`} replace />} />
      <Route path="/balances" element={<Navigate to={`${APP_BASE}/balances`} replace />} />
      <Route path="/transactions" element={<Navigate to={`${APP_BASE}/transactions`} replace />} />
      <Route path="/users" element={<Navigate to={`${APP_BASE}/users`} replace />} />
      <Route path="/plans" element={<Navigate to={`${APP_BASE}/plans`} replace />} />
      <Route path="/plans/:planId" element={<LegacyPlanRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route path={APP_BASE} element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="lending" element={<LendingPage />} />
          <Route path="balances" element={<BalancesPage />} />
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="plans/:planId" element={<PlanSubscribersPage />} />
          </Route>
          <Route element={<RoleRoute allow={['admin', 'manager']} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
