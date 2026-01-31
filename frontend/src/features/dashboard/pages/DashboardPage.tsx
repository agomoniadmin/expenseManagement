import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { DashboardResponse } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/reports/dashboard').then((r) => r.data),
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

  const cashFlowData = [
    { name: 'Income', value: data.cashFlow.income },
    { name: 'Expenses', value: data.cashFlow.expenses },
    { name: 'Net', value: data.cashFlow.net },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Net Worth" value={data.netWorth.current} change={data.netWorth.changePercent} />
        <Card title="Income" value={data.cashFlow.income} />
        <Card title="Expenses" value={data.cashFlow.expenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
          {data.expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.expenseByCategory}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                >
                  {data.expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No expense data yet.</p>
          )}
        </div>
      </div>

      {/* Accounts Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Accounts</h2>
        {data.accountsSummary.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.accountsSummary.map((acct) => (
              <div key={acct.id} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium">{acct.name}</span>
                <CurrencyDisplay amount={acct.balance} className="text-sm font-semibold" colorize />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No accounts yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, change }: { title: string; value: number; change?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold">
        <CurrencyDisplay amount={value} />
      </p>
      {change !== undefined && (
        <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last month
        </p>
      )}
    </div>
  );
}
