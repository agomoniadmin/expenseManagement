import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/shared/api/client';
import type { TransactionResponse, UpdateTransactionRequest, CategoryResponse } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

const TYPE_STYLES: Record<string, string> = {
  DEBIT: 'border-red-500 bg-red-50 text-red-700',
  CREDIT: 'border-green-500 bg-green-50 text-green-700',
  TRANSFER_IN: 'border-blue-500 bg-blue-50 text-blue-700',
  TRANSFER_OUT: 'border-blue-500 bg-blue-50 text-blue-700',
};

const TYPE_LABELS: Record<string, string> = {
  DEBIT: 'Expense',
  CREDIT: 'Income',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
};

const TYPE_ICONS: Record<string, string> = {
  DEBIT: '↑',
  CREDIT: '↓',
  TRANSFER_IN: '⇄',
  TRANSFER_OUT: '⇄',
};

interface FlatCategory {
  id: string;
  name: string;
  color: string | null;
}

function flattenCategories(cats: CategoryResponse[], prefix = ''): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const c of cats) {
    result.push({ id: c.id, name: prefix + c.name, color: c.color });
    if (c.children) {
      result.push(...flattenCategories(c.children, prefix + c.name + ' > '));
    }
  }
  return result;
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: txn, isLoading } = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => api.get<TransactionResponse>(`/transactions/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const flatCats = categories ? flattenCategories(categories) : [];
  const getCategoryName = (catId: string | null) => {
    if (!catId) return null;
    return flatCats.find((c) => c.id === catId)?.name ?? null;
  };

  const { register, handleSubmit } = useForm<UpdateTransactionRequest>();

  const mutation = useMutation({
    mutationFn: (data: UpdateTransactionRequest) =>
      api.patch<TransactionResponse>(`/transactions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/transactions');
    },
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (!txn) return <div className="text-red-600">Transaction not found.</div>;

  const typeStyle = TYPE_STYLES[txn.type] ?? 'border-gray-500 bg-gray-50 text-gray-700';
  const typeLabel = TYPE_LABELS[txn.type] ?? txn.type;
  const typeIcon = TYPE_ICONS[txn.type] ?? '';

  // Line item totals
  const lineSubtotal = txn.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * (item.quantity || 1),
    0,
  );

  // Category breakdown from line items
  const categoryBreakdown: { id: string; name: string; color: string; amount: number }[] = [];
  if (txn.lineItems.length > 0) {
    const grouped = new Map<string, number>();
    for (const item of txn.lineItems) {
      const catId = item.categoryId || 'uncategorized';
      grouped.set(catId, (grouped.get(catId) || 0) + item.unitPrice * (item.quantity || 1));
    }
    for (const [catId, amount] of grouped) {
      const cat = flatCats.find((c) => c.id === catId);
      categoryBreakdown.push({
        id: catId,
        name: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? '#94a3b8',
        amount,
      });
    }
  }

  const categoryName = getCategoryName(txn.categoryId);

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Transactions
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{txn.merchant}</h1>
            <p className="text-sm text-gray-500 mt-1">Transaction Details</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-medium ${typeStyle}`}>
            <span>{typeIcon}</span>
            {typeLabel}
          </span>
        </div>
      </div>

      {mutation.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Failed to update transaction.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-500">Date</span>
                <span className="block text-sm text-gray-900">{txn.date}</span>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-500">Amount</span>
                <CurrencyDisplay amount={txn.amount} colorize className="block text-sm font-semibold" />
              </div>

              {/* Merchant */}
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-500">Merchant</span>
                <span className="block text-sm text-gray-900">{txn.merchant}</span>
              </div>

              {/* Reconciliation Status */}
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-500">Reconciliation</span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  txn.reconciliationStatus === 'RECONCILED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {txn.reconciliationStatus}
                </span>
              </div>

              {/* Category */}
              {categoryName && (
                <div className="space-y-1">
                  <span className="block text-sm font-medium text-gray-500">Category</span>
                  <span className="block text-sm text-gray-900">{categoryName}</span>
                </div>
              )}

              {/* Description/Notes */}
              {txn.description && (
                <div className="space-y-1 sm:col-span-2">
                  <span className="block text-sm font-medium text-gray-500">Notes</span>
                  <span className="block text-sm text-gray-900">{txn.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Card */}
          {txn.lineItems.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 min-w-[500px]">
                  <div className="col-span-4">Item Name</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Rows */}
                {txn.lineItems.map((item) => {
                  const lineTotal = item.unitPrice * (item.quantity || 1);
                  const itemCat = getCategoryName(item.categoryId);
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2.5 border-b border-gray-50 min-w-[500px]">
                      <div className="col-span-4 text-sm text-gray-900">{item.itemName}</div>
                      <div className="col-span-2 text-sm text-gray-500">{itemCat ?? '-'}</div>
                      <div className="col-span-1 text-sm text-gray-700">{item.quantity || 1}</div>
                      <div className="col-span-1 text-sm text-gray-500">{item.unit || 'ea'}</div>
                      <div className="col-span-2 text-sm text-gray-700">
                        <CurrencyDisplay amount={item.unitPrice} />
                      </div>
                      <div className="col-span-2 text-sm font-medium text-gray-900 text-right">
                        <CurrencyDisplay amount={lineTotal} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Update Transaction Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Update Transaction</h2>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Merchant */}
                <div className="space-y-1">
                  <label htmlFor="edit-merchant" className="block text-sm font-medium text-gray-700">Merchant</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0 0 20.25 9.35m-16.5 0a3.004 3.004 0 0 0 2.25-5.1 3.004 3.004 0 0 0-2.25-1.5H5.25A3 3 0 0 0 2.25 5.75v.6a2.993 2.993 0 0 0 1.5 2.6" />
                      </svg>
                    </span>
                    <input
                      id="edit-merchant"
                      {...register('merchant')}
                      defaultValue={txn.merchant}
                      className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700">Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">$</span>
                    <input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      defaultValue={txn.amount}
                      {...register('amount', { valueAsNumber: true })}
                      className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    id="edit-notes"
                    {...register('notes')}
                    defaultValue={txn.description ?? ''}
                    rows={3}
                    placeholder="Add any notes about this transaction..."
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ===== RIGHT COLUMN (sticky) ===== */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Summary Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-3">
              {txn.lineItems.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">${lineSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between text-sm ${txn.lineItems.length > 0 ? 'border-t border-gray-100 pt-3' : ''}`}>
                <span className="font-semibold text-gray-900">Total</span>
                <CurrencyDisplay amount={txn.amount} colorize className="font-bold text-lg" />
              </div>
            </div>
          </div>

          {/* Category Breakdown Card */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
              <div className="space-y-2">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-gray-700 truncate max-w-[140px]">{cat.name}</span>
                    </span>
                    <span className="font-medium">${cat.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">{new Date(txn.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="text-gray-700">{txn.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="text-gray-500 font-mono text-xs truncate max-w-[140px]">{txn.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
