import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { DashboardResponse } from '@/shared/types/api';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/reports/dashboard').then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (error || !data) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="space-y-2">
        <p className="text-red-600">Failed to load reports.</p>
        <p className="text-sm text-gray-500">{msg}</p>
      </div>
    );
  }

  const cashFlowData = [
    { name: 'Income', amount: data.cashFlow.income },
    { name: 'Expenses', amount: data.cashFlow.expenses },
    { name: 'Net', amount: data.cashFlow.net },
  ];

  // Net worth trend (simulated from current data point)
  const netWorthTrend = [
    { month: 'Previous', value: data.netWorth.previousMonth },
    { month: 'Current', value: data.netWorth.current },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Net Worth Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Net Worth Trend</h2>
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Current</p>
            <CurrencyDisplay amount={data.netWorth.current} className="text-xl font-bold" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Change</p>
            <p className={`text-xl font-bold ${data.netWorth.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.netWorth.changePercent >= 0 ? '+' : ''}{data.netWorth.changePercent.toFixed(1)}%
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={netWorthTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Summary</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#3b82f6" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Expense by Category</h2>
          {data.expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.expenseByCategory}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category }) => category}
                >
                  {data.expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `$${Number(val).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No expense data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
