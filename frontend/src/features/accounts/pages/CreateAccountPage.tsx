import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { AccountResponse, CreateAccountRequest } from '@/shared/types/api';

const optionalNumber = z.union([
  z.literal('').transform(() => undefined),
  z.coerce.number(),
]).optional();

const optionalDayOfMonth = z.union([
  z.literal('').transform(() => undefined),
  z.coerce.number().min(1, 'Must be 1-31').max(31, 'Must be 1-31'),
]).optional();

const schema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.string().min(1, 'Type is required'),
  institution: z.string().optional(),
  currency: z.string().optional(),
  initialBalance: optionalNumber,
  creditLimit: optionalNumber,
  statementCloseDay: optionalDayOfMonth,
  paymentDueDay: optionalDayOfMonth,
  lastFourDigits: z.string().max(4).optional(),
  apr: optionalNumber,
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// Map UI subtypes to backend AccountType enum values
const ACCOUNT_GROUPS = [
  {
    label: 'Banking Account',
    description: 'Checking, Savings, Money Market',
    icon: 'building-columns',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    types: [
      { value: 'CHECKING', label: 'Checking Account' },
      { value: 'SAVINGS', label: 'Savings Account' },
      { value: 'SAVINGS_MM', label: 'Money Market', backendType: 'SAVINGS' },
      { value: 'SAVINGS_CD', label: 'Certificate of Deposit', backendType: 'SAVINGS' },
    ],
  },
  {
    label: 'Credit Account',
    description: 'Credit Cards, Lines of Credit',
    icon: 'credit-card',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    types: [
      { value: 'CREDIT_CARD', label: 'Credit Card' },
      { value: 'LINE_OF_CREDIT', label: 'Line of Credit', backendType: 'LOAN' },
      { value: 'STORE_CREDIT', label: 'Store Credit', backendType: 'CREDIT_CARD' },
    ],
  },
  {
    label: 'Investment Account',
    description: 'Brokerage, IRA, 401(k)',
    icon: 'chart-line',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    types: [
      { value: 'INVESTMENT', label: 'Brokerage Account' },
      { value: 'INVESTMENT_IRA', label: 'IRA (Traditional/Roth)', backendType: 'INVESTMENT' },
      { value: 'INVESTMENT_401K', label: '401(k) / 403(b)', backendType: 'INVESTMENT' },
      { value: 'INVESTMENT_HSA', label: 'HSA', backendType: 'INVESTMENT' },
    ],
  },
  {
    label: 'Assets & Liabilities',
    description: 'Property, Vehicles, Loans',
    icon: 'house',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    types: [
      { value: 'REAL_ESTATE', label: 'Real Estate', backendType: 'OTHER' },
      { value: 'VEHICLE', label: 'Vehicle', backendType: 'OTHER' },
      { value: 'MORTGAGE', label: 'Mortgage', backendType: 'LOAN' },
      { value: 'LOAN', label: 'Auto Loan / Personal Loan' },
    ],
  },
  {
    label: 'Cash',
    description: 'Physical cash, wallets',
    icon: 'banknotes',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    types: [
      { value: 'CASH', label: 'Cash' },
    ],
  },
] as const;

type AccountSubtype = typeof ACCOUNT_GROUPS[number]['types'][number];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (\u20ac)' },
  { value: 'GBP', label: 'GBP - British Pound (\u00a3)' },
  { value: 'INR', label: 'INR - Indian Rupee (\u20b9)' },
];

const DAY_OPTIONS = [1, 5, 10, 15, 20, 25, 28];

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getBackendType(subtype: string): string {
  for (const group of ACCOUNT_GROUPS) {
    const found = group.types.find((t) => t.value === subtype);
    if (found) {
      return (found as AccountSubtype & { backendType?: string }).backendType || found.value;
    }
  }
  return subtype;
}

function getIcon(iconName: string, className: string) {
  const icons: Record<string, JSX.Element> = {
    'building-columns': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
      </svg>
    ),
    'credit-card': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
    'chart-line': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    'house': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    'banknotes': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
    'check-circle': (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
      </svg>
    ),
    'arrow-left': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
    ),
    'arrow-right': (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    ),
  };
  return icons[iconName] || null;
}

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: '', currency: 'USD' },
  });

  const selectedType = useWatch({ control, name: 'type' });
  const formValues = useWatch({ control });

  // Find which group the selected type belongs to
  const selectedGroup = ACCOUNT_GROUPS.find((g) =>
    g.types.some((t) => t.value === selectedType),
  );

  const isCreditType = selectedType === 'CREDIT_CARD' || selectedType === 'LINE_OF_CREDIT' || selectedType === 'STORE_CREDIT';
  const showInstitution = selectedType && selectedType !== 'CASH';

  const detailsTitle = selectedGroup
    ? `${selectedGroup.types.find((t) => t.value === selectedType)?.label ?? 'Account'} Details`
    : 'Account Details';

  // Update step based on form state
  const hasTypeSelected = !!selectedType;
  const hasDetailsStarted = !!formValues.name || !!formValues.institution;
  const effectiveStep = !hasTypeSelected ? 1 : hasDetailsStarted ? 2 : 1;

  const mutation = useMutation({
    mutationFn: (data: CreateAccountRequest) =>
      api.post<AccountResponse>('/accounts', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigate('/accounts');
    },
  });

  function onSubmit(data: FormData) {
    const backendType = getBackendType(data.type);
    const payload: CreateAccountRequest = {
      name: data.name,
      type: backendType,
      currency: data.currency || undefined,
      initialBalance: data.initialBalance,
    };

    if (showInstitution) {
      payload.institution = data.institution;
    }
    if (isCreditType) {
      payload.creditLimit = data.creditLimit;
      payload.statementCloseDay = data.statementCloseDay;
      payload.paymentDueDay = data.paymentDueDay;
    }

    mutation.mutate(payload);
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/accounts')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          {getIcon('arrow-left', 'h-4 w-4')}
          Back to Accounts
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add New Account</h1>
        <p className="text-sm text-gray-500 mt-1">Set up a new financial account</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              effectiveStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className={`ml-3 font-medium ${effectiveStep >= 1 ? 'text-gray-800' : 'text-gray-500'}`}>
              Account Type
            </span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full transition-all ${effectiveStep >= 2 ? 'bg-primary-600 w-full' : 'w-0'}`} />
          </div>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              effectiveStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className={`ml-3 ${effectiveStep >= 2 ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
              Account Details
            </span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full transition-all ${effectiveStep >= 3 ? 'bg-primary-600 w-full' : 'w-0'}`} />
          </div>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              effectiveStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className={`ml-3 ${effectiveStep >= 3 ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
              Review & Create
            </span>
          </div>
        </div>
      </div>

      {mutation.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Failed to create account.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('type')} />

        {/* Step 1: Account Type Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Select Account Type</h2>
          <p className="text-sm text-gray-500 mb-6">Choose the type of account you want to add</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACCOUNT_GROUPS.map((group) => {
              const isGroupSelected = group.types.some((t) => t.value === selectedType);
              return (
                <div
                  key={group.label}
                  className={`rounded-xl border-2 p-4 transition cursor-pointer ${
                    isGroupSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-500'
                  }`}
                  onClick={() => {
                    if (!isGroupSelected) {
                      setValue('type', group.types[0].value);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 ${group.iconBg} rounded-xl flex items-center justify-center transition ${
                      isGroupSelected ? '' : 'group-hover:opacity-80'
                    }`}>
                      {getIcon(group.icon, `h-7 w-7 ${group.iconColor}`)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{group.label}</h3>
                      <p className="text-sm text-gray-500">{group.description}</p>
                    </div>
                    {isGroupSelected && getIcon('check-circle', 'h-5 w-5 text-primary-600')}
                  </div>
                  <div className="space-y-2">
                    {group.types.map((t) => (
                      <label
                        key={t.value}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded text-sm ${
                          isGroupSelected ? 'hover:bg-white' : 'hover:bg-gray-50'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="radio"
                          name="accountTypeRadio"
                          checked={selectedType === t.value}
                          onChange={() => setValue('type', t.value)}
                          className="text-primary-600"
                        />
                        <span className={selectedType === t.value ? 'font-medium' : ''}>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {errors.type && <p className="text-xs text-red-600 mt-2">{errors.type.message}</p>}
        </div>

        {/* Step 2: Account Details (shown when type is selected) */}
        {selectedType && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{detailsTitle}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Account Name */}
              <div>
                <label htmlFor="acct-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name *
                </label>
                <input
                  id="acct-name"
                  {...register('name')}
                  placeholder={isCreditType ? 'e.g., Amazon Visa' : 'e.g., Primary Checking'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">A friendly name to identify this account</p>
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              {/* Financial Institution */}
              {showInstitution && (
                <div>
                  <label htmlFor="acct-institution" className="block text-sm font-medium text-gray-700 mb-2">
                    Financial Institution *
                  </label>
                  <input
                    id="acct-institution"
                    {...register('institution')}
                    placeholder="e.g., Chase Bank"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
              )}

              {/* Last 4 Digits (Credit types only) */}
              {isCreditType && (
                <div>
                  <label htmlFor="acct-last4" className="block text-sm font-medium text-gray-700 mb-2">
                    Last 4 Digits of Card
                  </label>
                  <input
                    id="acct-last4"
                    {...register('lastFourDigits')}
                    placeholder="e.g., 9945"
                    maxLength={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
              )}

              {/* Currency */}
              <div>
                <label htmlFor="acct-currency" className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  id="acct-currency"
                  {...register('currency')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Credit Limit (Credit types only) */}
              {isCreditType && (
                <div>
                  <label htmlFor="acct-limit" className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Limit *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      id="acct-limit"
                      type="number"
                      step="0.01"
                      {...register('creditLimit')}
                      placeholder="10,000.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>
                  {errors.creditLimit && <p className="text-xs text-red-600 mt-1">{errors.creditLimit.message}</p>}
                </div>
              )}

              {/* Current Balance */}
              <div>
                <label htmlFor="acct-balance" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    id="acct-balance"
                    type="number"
                    step="0.01"
                    {...register('initialBalance')}
                    placeholder={isCreditType ? '1,250.00' : '0.00'}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                {isCreditType && (
                  <p className="text-xs text-gray-500 mt-1">Enter as positive number (will be shown as negative)</p>
                )}
                {errors.initialBalance && <p className="text-xs text-red-600 mt-1">{errors.initialBalance.message}</p>}
              </div>

              {/* Statement Close Day (Credit types only) */}
              {isCreditType && (
                <div>
                  <label htmlFor="acct-close-day" className="block text-sm font-medium text-gray-700 mb-2">
                    Statement Close Day
                  </label>
                  <select
                    id="acct-close-day"
                    {...register('statementCloseDay')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    <option value="">Select day</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{ordinal(d)}</option>
                    ))}
                  </select>
                  {errors.statementCloseDay && <p className="text-xs text-red-600 mt-1">{errors.statementCloseDay.message}</p>}
                </div>
              )}

              {/* Payment Due Day (Credit types only) */}
              {isCreditType && (
                <div>
                  <label htmlFor="acct-due-day" className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Due Day
                  </label>
                  <select
                    id="acct-due-day"
                    {...register('paymentDueDay')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    <option value="">Select day</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{ordinal(d)}</option>
                    ))}
                  </select>
                  {errors.paymentDueDay && <p className="text-xs text-red-600 mt-1">{errors.paymentDueDay.message}</p>}
                </div>
              )}

              {/* APR (Credit types only) */}
              {isCreditType && (
                <div>
                  <label htmlFor="acct-apr" className="block text-sm font-medium text-gray-700 mb-2">
                    APR (%)
                  </label>
                  <div className="relative">
                    <input
                      id="acct-apr"
                      type="number"
                      step="0.01"
                      {...register('apr')}
                      placeholder="19.99"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="sm:col-span-2">
                <label htmlFor="acct-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="acct-notes"
                  rows={3}
                  {...register('notes')}
                  placeholder="Add any notes about this account..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              disabled
              title="Draft saving not yet supported"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedType}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
              {getIcon('arrow-right', 'h-4 w-4')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
