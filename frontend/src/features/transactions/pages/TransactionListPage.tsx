import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/api/client';
import type { TransactionResponse, PageResponse, AccountResponse, CategoryResponse } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

const today = new Date().toISOString().slice(0, 10);
const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
const PAGE_SIZE = 20;

const TYPE_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  DEBIT:        { icon: 'fas fa-shopping-cart', bg: 'bg-orange-100', color: 'text-orange-500' },
  CREDIT:       { icon: 'fas fa-building',      bg: 'bg-emerald-100', color: 'text-emerald-500' },
  TRANSFER_OUT: { icon: 'fas fa-arrow-right-arrow-left', bg: 'bg-purple-100', color: 'text-purple-500' },
  TRANSFER_IN:  { icon: 'fas fa-arrow-right-arrow-left', bg: 'bg-purple-100', color: 'text-purple-500' },
};

const RECONCILIATION_BADGE: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  RECONCILED:  { icon: 'fas fa-check',        bg: 'bg-green-100',  color: 'text-green-700',  label: 'Reconciled' },
  MATCHED:     { icon: 'fas fa-link',          bg: 'bg-blue-100',   color: 'text-blue-700',   label: 'Matched' },
  UNMATCHED:   { icon: 'fas fa-circle-xmark',  bg: 'bg-red-100',    color: 'text-red-700',    label: 'Unmatched' },
  PENDING:     { icon: 'fas fa-clock',         bg: 'bg-yellow-100', color: 'text-yellow-700', label: 'Pending' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function flattenCategories(cats: CategoryResponse[]): { id: string; name: string }[] {
  const flat: { id: string; name: string }[] = [];
  function walk(list: CategoryResponse[]) {
    for (const c of list) {
      flat.push({ id: c.id, name: c.name });
      if (c.children?.length) walk(c.children);
    }
  }
  walk(cats);
  return flat;
}

export default function TransactionListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    accountId: '',
    categoryId: '',
    startDate: ninetyDaysAgo,
    endDate: today,
    search: '',
    page: 0,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const flatCats = useMemo(() => categories ? flattenCategories(categories) : [], [categories]);
  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of flatCats) m.set(c.id, c.name);
    return m;
  }, [flatCats]);

  const accountMap = useMemo(() => {
    const m = new Map<string, AccountResponse>();
    for (const a of accounts ?? []) m.set(a.id, a);
    return m;
  }, [accounts]);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      api.get<PageResponse<TransactionResponse>>('/transactions', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          ...(filters.accountId ? { accountId: filters.accountId } : {}),
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          page: filters.page,
          size: PAGE_SIZE,
        },
      }).then((r) => r.data),
  });

  const setFilter = useCallback((patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 'page' in patch ? (patch.page ?? 0) : 0 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ accountId: '', categoryId: '', startDate: ninetyDaysAgo, endDate: today, search: '', page: 0 });
  }, []);

  const hasActiveFilters = filters.accountId || filters.categoryId || filters.search
    || filters.startDate !== ninetyDaysAgo || filters.endDate !== today;

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!filters.search.trim()) return data.data;
    const q = filters.search.toLowerCase();
    return data.data.filter(
      (t) => t.merchant.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q))
    );
  }, [data, filters.search]);

  const totalPages = data ? Math.ceil(data.meta.total / PAGE_SIZE) : 0;

  function pageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const pages: (number | 'ellipsis')[] = [0];
    const current = filters.page;
    if (current > 2) pages.push('ellipsis');
    for (let i = Math.max(1, current - 1); i <= Math.min(totalPages - 2, current + 1); i++) {
      pages.push(i);
    }
    if (current < totalPages - 3) pages.push('ellipsis');
    pages.push(totalPages - 1);
    return pages;
  }

  return (
    <div>
      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>

          {/* Account Filter */}
          <select
            value={filters.accountId}
            onChange={(e) => setFilter({ accountId: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          >
            <option value="">All Accounts</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filters.categoryId}
            onChange={(e) => setFilter({ categoryId: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          >
            <option value="">All Categories</option>
            {flatCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilter({ startDate: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilter({ endDate: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 text-sm"
            >
              <i className="fas fa-times-circle" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl text-sm font-medium text-gray-600">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Merchant / Description</div>
            <div className="col-span-2">Account</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filteredData.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No transactions found for the selected filters.
              </div>
            ) : (
              filteredData.map((txn) => {
                const isIncome = txn.type === 'CREDIT';
                const isTransfer = txn.type === 'TRANSFER_OUT' || txn.type === 'TRANSFER_IN';
                const noCat = !txn.categoryId;
                const account = accountMap.get(txn.accountId);
                const catName = txn.categoryId ? categoryMap.get(txn.categoryId) : null;
                const typeCfg = TYPE_ICON[txn.type] ?? TYPE_ICON['DEBIT'];
                const statusCfg = RECONCILIATION_BADGE[txn.reconciliationStatus] ?? RECONCILIATION_BADGE['PENDING'];

                return (
                  <div
                    key={txn.id}
                    onClick={() => navigate(`/transactions/${txn.id}`)}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center transition ${
                      isIncome ? 'bg-green-50/30' : ''
                    } ${noCat && !isTransfer ? 'border-l-4 border-amber-400' : ''}`}
                  >
                    {/* Date */}
                    <div className="col-span-2">
                      <p className="font-medium text-gray-800 text-sm">{formatDate(txn.date)}</p>
                    </div>

                    {/* Merchant / Description */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${typeCfg.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <i className={`${typeCfg.icon} ${typeCfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate text-sm">{txn.merchant}</p>
                          {txn.description ? (
                            <p className="text-xs text-gray-500 truncate">{txn.description}</p>
                          ) : noCat && !isTransfer ? (
                            <p className="text-xs text-amber-500 truncate">
                              <i className="fas fa-exclamation-triangle mr-1" />Needs categorization
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Account */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">{account?.name ?? '—'}</p>
                      {account?.institution && (
                        <p className="text-xs text-gray-500">{account.institution}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-1">
                      {isTransfer ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Transfer
                        </span>
                      ) : catName ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {catName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Uncategorized
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="col-span-2 text-right">
                      <p className={`font-semibold text-sm ${
                        isIncome ? 'text-green-600' :
                        isTransfer ? 'text-gray-700' :
                        'text-red-500'
                      }`}>
                        {isIncome ? '+' : '-'}
                        <CurrencyDisplay amount={txn.amount} />
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        <i className={`${statusCfg.icon} mr-1`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {data && data.meta.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{filters.page * PAGE_SIZE + 1}–{Math.min((filters.page + 1) * PAGE_SIZE, data.meta.total)}</span> of <span className="font-medium">{data.meta.total}</span> transactions
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={filters.page === 0}
                    onClick={() => setFilter({ page: filters.page - 1 })}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    <i className="fas fa-chevron-left" />
                  </button>
                  {pageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-2 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setFilter({ page: p })}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          p === filters.page
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p + 1}
                      </button>
                    )
                  )}
                  <button
                    disabled={filters.page >= totalPages - 1}
                    onClick={() => setFilter({ page: filters.page + 1 })}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
