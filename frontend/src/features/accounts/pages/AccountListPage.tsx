import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/shared/api/client';
import type { AccountResponse, ImportProfileResponse, CreateImportProfileRequest } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ColumnMappingForm, type MappingResult } from '@/features/import/components/ColumnMappingForm';

const TYPE_CONFIG: Record<string, { label: string; icon: string; iconBg: string; iconColor: string; group: string }> = {
  CHECKING:    { label: 'Checking',    icon: 'fas fa-building-columns', iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    group: 'Banking' },
  SAVINGS:     { label: 'Savings',     icon: 'fas fa-piggy-bank',       iconBg: 'bg-green-100',   iconColor: 'text-green-600',   group: 'Banking' },
  CASH:        { label: 'Cash',        icon: 'fas fa-money-bill-wave',  iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', group: 'Banking' },
  CREDIT_CARD: { label: 'Credit Card', icon: 'fas fa-credit-card',      iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  group: 'Credit Cards' },
  INVESTMENT:  { label: 'Investment',  icon: 'fas fa-chart-line',       iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600',  group: 'Investments' },
  LOAN:        { label: 'Loan',        icon: 'fas fa-landmark',         iconBg: 'bg-red-100',     iconColor: 'text-red-600',     group: 'Loans' },
  OTHER:       { label: 'Other',       icon: 'fas fa-wallet',           iconBg: 'bg-gray-100',    iconColor: 'text-gray-600',    group: 'Other' },
};

const GROUP_CONFIG: Record<string, { icon: string; iconColor: string }> = {
  'Banking':      { icon: 'fas fa-building-columns', iconColor: 'text-blue-600' },
  'Credit Cards': { icon: 'fas fa-credit-card',      iconColor: 'text-purple-600' },
  'Investments':  { icon: 'fas fa-chart-line',        iconColor: 'text-emerald-600' },
  'Loans':        { icon: 'fas fa-landmark',          iconColor: 'text-red-600' },
  'Other':        { icon: 'fas fa-wallet',            iconColor: 'text-gray-600' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All Accounts' },
  { key: 'Banking', label: 'Banking' },
  { key: 'Credit Cards', label: 'Credit Cards' },
  { key: 'Investments', label: 'Investments' },
  { key: 'Loans', label: 'Loans' },
  { key: 'Other', label: 'Other' },
];

const LIABILITY_TYPES = new Set(['CREDIT_CARD', 'LOAN']);

async function fetchAllProfiles(): Promise<ImportProfileResponse[]> {
  const res = await api.get<ImportProfileResponse[]>('/import/profiles');
  return res.data;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AccountListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  const { data: profiles } = useQuery({
    queryKey: ['import-profiles'],
    queryFn: fetchAllProfiles,
  });

  const saveProfileMutation = useMutation({
    mutationFn: (req: CreateImportProfileRequest) =>
      api.post<ImportProfileResponse>('/import/profiles', req).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['import-profile'] });
      setEditingAccountId(null);
    },
  });

  function profileForAccount(accountId: string): ImportProfileResponse | undefined {
    return profiles?.find((p) => p.accountId === accountId);
  }

  function handleMappingSubmit(result: MappingResult) {
    if (!editingAccountId) return;
    saveProfileMutation.mutate({
      accountId: editingAccountId,
      profileName: result.profileName,
      dateColumn: result.dateColumn,
      merchantColumn: result.merchantColumn,
      amountColumn: result.amountColumn,
      typeColumn: result.typeColumn,
      dateFormat: result.dateFormat,
    });
  }

  const summary = useMemo(() => {
    if (!accounts) return { assets: 0, liabilities: 0, netWorth: 0, count: 0 };
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      if (LIABILITY_TYPES.has(a.type)) {
        liabilities += Math.abs(a.currentBalance);
      } else {
        assets += a.currentBalance;
      }
    }
    return { assets, liabilities, netWorth: assets - liabilities, count: accounts.length };
  }, [accounts]);

  const grouped = useMemo(() => {
    if (!accounts) return {};
    const filtered = activeTab === 'all'
      ? accounts
      : accounts.filter((a) => (TYPE_CONFIG[a.type]?.group ?? 'Other') === activeTab);

    const groups: Record<string, AccountResponse[]> = {};
    for (const a of filtered) {
      const group = TYPE_CONFIG[a.type]?.group ?? 'Other';
      (groups[group] ??= []).push(a);
    }
    return groups;
  }, [accounts, activeTab]);

  const editingProfile = editingAccountId ? profileForAccount(editingAccountId) : undefined;
  const editingAccountName = editingAccountId
    ? accounts?.find((a) => a.id === editingAccountId)?.name ?? ''
    : '';

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Accounts</h1>
          <p className="text-sm text-gray-500">Manage all your financial accounts</p>
        </div>
        <Link
          to="/accounts/new"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          <i className="fas fa-plus" />
          Add Account
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-green-600">
            <CurrencyDisplay amount={summary.assets} />
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-500">
            <CurrencyDisplay amount={summary.liabilities} />
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Net Worth</p>
          <p className="text-2xl font-bold text-gray-800">
            <CurrencyDisplay amount={summary.netWorth} />
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-800">{summary.count}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Account Cards */}
      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          No accounts yet. Create your first account to get started.
        </div>
      )}

      {Object.entries(grouped).map(([groupName, groupAccounts]) => {
        const groupCfg = GROUP_CONFIG[groupName] ?? GROUP_CONFIG['Other'];
        return (
          <div key={groupName} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className={`${groupCfg.icon} ${groupCfg.iconColor}`} />
              {groupName}
              <span className="text-sm font-normal text-gray-500">
                ({groupAccounts.length} account{groupAccounts.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  hasProfile={!!profileForAccount(account.id)}
                  onSetupMapping={() => setEditingAccountId(account.id)}
                  onClick={() => navigate(`/accounts/${account.id}`)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Column Mapping Modal */}
      {editingAccountId && (
        <ColumnMappingForm
          onSubmit={handleMappingSubmit}
          onCancel={() => setEditingAccountId(null)}
          alwaysSaveAsProfile
          initialProfileName={editingProfile?.profileName ?? editingAccountName}
          initialMapping={editingProfile ? {
            dateColumn: editingProfile.dateColumn,
            merchantColumn: editingProfile.merchantColumn,
            amountColumn: editingProfile.amountColumn,
            typeColumn: editingProfile.typeColumn,
            dateFormat: editingProfile.dateFormat,
          } : undefined}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  hasProfile,
  onSetupMapping,
  onClick,
}: {
  account: AccountResponse;
  hasProfile: boolean;
  onSetupMapping: () => void;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[account.type] ?? TYPE_CONFIG['OTHER'];
  const isCreditCard = account.type === 'CREDIT_CARD';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${cfg.iconBg} rounded-xl flex items-center justify-center`}>
            <i className={`${cfg.icon} ${cfg.iconColor} text-xl`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{account.name}</h3>
            <p className="text-sm text-gray-500">
              {account.institution || cfg.label}
              {account.status !== 'ACTIVE' && (
                <span className="ml-1 text-xs text-gray-400">({account.status})</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetupMapping();
          }}
          className="text-gray-400 hover:text-gray-600"
          title="CSV Mapping"
        >
          <i className={hasProfile ? 'fas fa-file-csv text-green-500' : 'fas fa-ellipsis-vertical'} />
        </button>
      </div>

      {/* Balance */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Balance</p>
          <p className={`text-2xl font-bold ${isCreditCard && account.currentBalance < 0 ? 'text-red-500' : 'text-gray-800'}`}>
            <CurrencyDisplay amount={account.currentBalance} currency={account.currency} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Last synced</p>
          <p className="text-sm text-gray-600">{formatRelativeTime(account.lastSynced)}</p>
        </div>
      </div>

      {/* Credit Card Utilization (if available balance differs, implying a limit) */}
      {isCreditCard && account.availableBalance > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Utilization</span>
            <span>
              {Math.round((Math.abs(account.currentBalance) / (Math.abs(account.currentBalance) + account.availableBalance)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                (Math.abs(account.currentBalance) / (Math.abs(account.currentBalance) + account.availableBalance)) > 0.5
                  ? 'bg-red-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((Math.abs(account.currentBalance) / (Math.abs(account.currentBalance) + account.availableBalance)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">{cfg.label}</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="text-primary-600 hover:underline"
        >
          View ledger &rarr;
        </span>
      </div>
    </div>
  );
}
