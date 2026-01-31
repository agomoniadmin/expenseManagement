import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthGuard } from '@/shared/auth/AuthGuard';
import { AppLayout } from '@/shared/layout/AppLayout';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// Lazy-load feature modules
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const AccountListPage = lazy(() => import('@/features/accounts/pages/AccountListPage'));
const CreateAccountPage = lazy(() => import('@/features/accounts/pages/CreateAccountPage'));
const AccountDetailPage = lazy(() => import('@/features/accounts/pages/AccountDetailPage'));
const TransactionListPage = lazy(() => import('@/features/transactions/pages/TransactionListPage'));
const CreateTransactionPage = lazy(() => import('@/features/transactions/pages/CreateTransactionPage'));
const TransactionDetailPage = lazy(() => import('@/features/transactions/pages/TransactionDetailPage'));
const TransferPage = lazy(() => import('@/features/transactions/pages/TransferPage'));
const CategoryTreePage = lazy(() => import('@/features/categories/pages/CategoryTreePage'));
const CategoryMappingsPage = lazy(() => import('@/features/categories/pages/CategoryMappingsPage'));
const ImportPage = lazy(() => import('@/features/import/pages/ImportPage'));
const ImportJobDetailPage = lazy(() => import('@/features/import/pages/ImportJobDetailPage'));
const ReconciliationPage = lazy(() => import('@/features/reconciliation/pages/ReconciliationPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<LoadingSpinner className="h-64" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
      <Route path="/register" element={<SuspenseWrapper><RegisterPage /></SuspenseWrapper>} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />

          <Route path="/accounts" element={<SuspenseWrapper><AccountListPage /></SuspenseWrapper>} />
          <Route path="/accounts/new" element={<SuspenseWrapper><CreateAccountPage /></SuspenseWrapper>} />
          <Route path="/accounts/:id" element={<SuspenseWrapper><AccountDetailPage /></SuspenseWrapper>} />

          <Route path="/transactions" element={<SuspenseWrapper><TransactionListPage /></SuspenseWrapper>} />
          <Route path="/transactions/new" element={<SuspenseWrapper><CreateTransactionPage /></SuspenseWrapper>} />
          <Route path="/transactions/transfer" element={<SuspenseWrapper><TransferPage /></SuspenseWrapper>} />
          <Route path="/transactions/:id" element={<SuspenseWrapper><TransactionDetailPage /></SuspenseWrapper>} />

          <Route path="/categories" element={<SuspenseWrapper><CategoryTreePage /></SuspenseWrapper>} />
          <Route path="/categories/mappings" element={<SuspenseWrapper><CategoryMappingsPage /></SuspenseWrapper>} />

          <Route path="/import" element={<SuspenseWrapper><ImportPage /></SuspenseWrapper>} />
          <Route path="/import/jobs/:id" element={<SuspenseWrapper><ImportJobDetailPage /></SuspenseWrapper>} />

          <Route path="/reconciliation" element={<SuspenseWrapper><ReconciliationPage /></SuspenseWrapper>} />

          <Route path="/reports" element={<SuspenseWrapper><ReportsPage /></SuspenseWrapper>} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
