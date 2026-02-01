import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/shared/api/client';
import type { DashboardResponse, RecentTransaction, AccountResponse } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const PERIOD_LABELS: Record<string, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-3-months': 'Last 3 months',
  'last-6-months': 'Last 6 months',
  'ytd': 'Year to date',
  'last-year': 'Last year',
};

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const period = searchParams.get('period') || 'this-month';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => api.get<DashboardResponse>('/reports/dashboard', { params: { period } }).then((r) => r.data),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (error || !data) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="space-y-2">
        <p className="text-red-600">Failed to load dashboard.</p>
        <p className="text-sm text-gray-500">{msg}</p>
      </div>
    );
  }

  // Prepare cash flow chart data from API response
  const cashFlowChartData = data.monthlyCashFlow?.map((m) => ({
    month: m.month,
    Income: m.income,
    Expenses: m.expenses,
  })) || [];

  // Prepare pie chart data
  const pieData = data.expenseByCategory.map((cat) => ({
    name: cat.category,
    value: cat.amount,
    percent: cat.percent,
  }));

  // Action items - recent transactions from dashboard response don't have categoryId
  const uncategorizedCount = 0;

  const periodLabel = PERIOD_LABELS[period] || 'Selected period';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Net Worth"
          value={data.netWorth.current}
          change={data.netWorth.changePercent}
          icon={
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          iconBg="bg-primary-100"
        />
        <SummaryCard
          title="Total Income"
          value={data.cashFlow.income}
          subtitle={periodLabel}
          icon={
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          }
          iconBg="bg-green-100"
        />
        <SummaryCard
          title="Total Expenses"
          value={data.cashFlow.expenses}
          subtitle={periodLabel}
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          }
          iconBg="bg-red-100"
        />
        <SummaryCard
          title="Net Cash Flow"
          value={data.cashFlow.net}
          subtitle={`Savings - ${periodLabel.toLowerCase()}`}
          valueColor={data.cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'}
          icon={
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          iconBg="bg-blue-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Cash Flow Overview</h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" /> Income
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" /> Expenses
              </span>
            </div>
          </div>
          {cashFlowChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cashFlowChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => `$${Number(val).toLocaleString()}`} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-16">No data for selected period.</p>
          )}
        </div>

        {/* Expense by Category Pie */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `$${Number(val).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {pieData.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {item.name}
                    </span>
                    <span className="font-medium">
                      ${item.value.toLocaleString()} ({item.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No expense data for selected period.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Balances */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Account Balances</h2>
            <Link to="/accounts" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {accounts && accounts.length > 0 ? (
              accounts.slice(0, 4).map((account) => (
                <AccountBalanceItem key={account.id} account={account} />
              ))
            ) : (
              <p className="text-sm text-gray-500">No accounts yet. Create one to get started.</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentTransactions && data.recentTransactions.length > 0 ? (
              data.recentTransactions.slice(0, 4).map((txn) => (
                <TransactionItem key={txn.id} transaction={txn} />
              ))
            ) : (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            )}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Action Items</h2>
          <div className="space-y-3">
            <ActionItem
              type="warning"
              title="Transactions to reconcile"
              description="Review and match imported transactions"
              link="/reconciliation"
              linkText="Review now"
            />
            {uncategorizedCount > 0 && (
              <ActionItem
                type="danger"
                title={`${uncategorizedCount} uncategorized transactions`}
                description="Assign categories for better tracking"
                link="/transactions"
                linkText="Categorize"
              />
            )}
            <ActionItem
              type="info"
              title="Set up budgets"
              description="Create budgets to track your spending"
              link="/categories"
              linkText="View categories"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  change,
  subtitle,
  icon,
  iconBg,
  valueColor,
}: {
  title: string;
  value: number;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <span className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-bold ${valueColor || 'text-gray-800'}`}>
        <CurrencyDisplay amount={value} />
      </p>
      {change !== undefined && change !== 0 && (
        <p className={`text-sm flex items-center gap-1 mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% from last period</span>
        </p>
      )}
      {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );
}

function AccountBalanceItem({ account }: { account: AccountResponse }) {
  const iconConfig: Record<string, { bg: string; color: string; icon: string }> = {
    CHECKING: { bg: 'bg-blue-100', color: 'text-blue-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    SAVINGS: { bg: 'bg-green-100', color: 'text-green-600', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    CREDIT_CARD: { bg: 'bg-purple-100', color: 'text-purple-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    INVESTMENT: { bg: 'bg-yellow-100', color: 'text-yellow-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  };

  const config = iconConfig[account.type] || iconConfig.CHECKING;

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center`}>
        <svg className={`w-5 h-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/accounts/${account.id}`}
          className="font-medium text-gray-800 truncate block hover:text-primary-600 hover:underline"
        >
          {account.name}
        </Link>
        <p className="text-xs text-gray-500">{account.institution || account.type}</p>
      </div>
      <CurrencyDisplay
        amount={account.currentBalance}
        className={`font-bold ${account.currentBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}
        colorize={false}
      />
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: RecentTransaction }) {
  const isCredit = transaction.type === 'CREDIT' || transaction.type === 'TRANSFER_IN';
  // Parse date as local timezone (not UTC) by appending time
  const date = new Date(transaction.date + 'T00:00:00');
  const today = new Date();
  // Compare only the date parts (year, month, day) to avoid timezone issues
  const todayDateStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const txnDateStr = transaction.date; // Already in YYYY-MM-DD format
  const isToday = txnDateStr === todayDateStr;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = yesterday.toLocaleDateString('en-CA');
  const isYesterday = txnDateStr === yesterdayDateStr;

  const dateStr = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 ${isCredit ? 'bg-green-100' : 'bg-orange-100'} rounded-full flex items-center justify-center`}>
        <svg className={`w-5 h-5 ${isCredit ? 'text-green-500' : 'text-orange-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCredit ? 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/transactions/${transaction.id}`}
          className="font-medium text-gray-800 truncate block hover:text-primary-600 hover:underline"
        >
          {transaction.merchant}
        </Link>
        <p className="text-xs text-gray-500">{dateStr}</p>
      </div>
      <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
        {isCredit ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
      </p>
    </div>
  );
}

function ActionItem({
  type,
  title,
  description,
  link,
  linkText,
}: {
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  link: string;
  linkText: string;
}) {
  const styles = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', iconColor: 'text-yellow-600' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
  };

  const icons = {
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    danger: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    info: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  };

  const style = styles[type];

  return (
    <div className={`p-3 ${style.bg} border ${style.border} rounded-lg`}>
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 ${style.iconColor} mt-0.5 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
        </svg>
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
          <Link to={link} className="text-sm text-primary-600 hover:underline mt-2 inline-block">
            {linkText} →
          </Link>
        </div>
      </div>
    </div>
  );
}
