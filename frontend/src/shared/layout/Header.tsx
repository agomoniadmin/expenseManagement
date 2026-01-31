import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back' },
  '/accounts': { title: 'Accounts', subtitle: 'Manage your accounts' },
  '/transactions': { title: 'Transactions', subtitle: 'View and manage transactions' },
  '/import': { title: 'Import', subtitle: 'Import transactions from CSV' },
  '/reconciliation': { title: 'Reconciliation', subtitle: 'Match imported transactions' },
  '/categories': { title: 'Categories', subtitle: 'Organize your spending' },
  '/reports': { title: 'Reports', subtitle: 'Analyze your finances' },
};

export function Header() {
  const { user } = useAuth();
  const location = useLocation();

  const basePath = '/' + (location.pathname.split('/')[1] || 'dashboard');
  const pageInfo = pageTitles[basePath] || { title: 'ExpenseTrack' };
  const firstName = user?.firstName || 'there';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Page title and subtitle */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className="text-sm text-gray-500">
            {basePath === '/dashboard' ? `${pageInfo.subtitle}, ${firstName}!` : pageInfo.subtitle}
          </p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Time Period Selector (only on dashboard) */}
        {basePath === '/dashboard' && (
          <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="ytd">Year to Date</option>
          </select>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Quick Add Transaction */}
        <Link
          to="/transactions/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Transaction</span>
        </Link>
      </div>

      {/* Mobile logo (visible on small screens) */}
      <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
        <Link to="/dashboard" className="text-lg font-bold text-gray-900">ExpenseTrack</Link>
      </div>
    </header>
  );
}
