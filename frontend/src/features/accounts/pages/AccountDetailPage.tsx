import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { AccountResponse, LedgerEntry } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { DataTable, type Column } from '@/shared/components/DataTable';

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

const ledgerColumns: Column<LedgerEntry>[] = [
  { key: 'date', header: 'Date', render: (r) => r.entryDate },
  { key: 'type', header: 'Type', render: (r) => r.entryType },
  { key: 'description', header: 'Description', render: (r) => r.description || '-' },
  { key: 'amount', header: 'Amount', render: (r) => <CurrencyDisplay amount={r.amount} colorize />, className: 'px-4 py-3 text-sm text-right' },
  { key: 'running', header: 'Balance', render: (r) => <CurrencyDisplay amount={r.runningBalance} />, className: 'px-4 py-3 text-sm text-right font-medium' },
];

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => api.get<AccountResponse>(`/accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ['ledger', id],
    queryFn: () =>
      api.get<LedgerEntry[]>(`/accounts/${id}/ledger`, {
        params: { startDate: thirtyDaysAgo, endDate: today },
      }).then((r) => r.data),
    enabled: !!id,
  });

  if (loadingAccount) return <LoadingSpinner className="h-64" />;
  if (!account) return <div className="text-red-600">Account not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{account.name}</h1>
        <p className="text-sm text-gray-500">{account.type} {account.institution ? `- ${account.institution}` : ''}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Current Balance</p>
          <CurrencyDisplay amount={account.currentBalance} currency={account.currency} className="text-xl font-bold" colorize />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Available Balance</p>
          <CurrencyDisplay amount={account.availableBalance} currency={account.currency} className="text-xl font-bold" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-xl font-bold">{account.status}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Ledger (Last 30 Days)</h2>
        {loadingLedger ? (
          <LoadingSpinner className="h-32" />
        ) : (
          <DataTable
            columns={ledgerColumns}
            data={ledger ?? []}
            keyExtractor={(r) => r.id}
            emptyMessage="No ledger entries for this period."
          />
        )}
      </div>
    </div>
  );
}
