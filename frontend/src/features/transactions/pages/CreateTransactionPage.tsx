import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import api from '@/shared/api/client';
import type { AccountResponse, TransactionResponse, CreateTransactionRequest, CategoryResponse } from '@/shared/types/api';
import { FormField } from '@/shared/components/FormField';

const UNITS = ['ea', 'lb', 'oz', 'gal', 'kg', 'ml'] as const;

const lineItemSchema = z.object({
  name: z.string().min(1, 'Name required'),
  quantity: z.coerce.number().min(0).default(1),
  unit: z.string().default('ea'),
  unitPrice: z.coerce.number({ required_error: 'Price required' }),
  categoryId: z.string().optional(),
});

const schema = z.object({
  accountId: z.string().min(1, 'Account required'),
  date: z.string().min(1, 'Date required'),
  merchant: z.string().min(1, 'Merchant required'),
  amount: z.coerce.number({ required_error: 'Amount required' }),
  type: z.string().min(1, 'Type required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  taxAmount: z.coerce.number().optional(),
  referenceNumber: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

type FormData = z.infer<typeof schema>;

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

const TYPE_CONFIG = [
  { value: 'DEBIT', label: 'Expense', icon: '↑', color: 'red' },
  { value: 'CREDIT', label: 'Income', icon: '↓', color: 'green' },
  { value: 'TRANSFER', label: 'Transfer', icon: '⇄', color: 'blue' },
] as const;

export default function CreateTransactionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveAndAddRef = useRef(false);

  const { register, handleSubmit, control, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: 'DEBIT',
      lineItems: [],
      taxAmount: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const watchedType = useWatch({ control, name: 'type' });
  const watchedAmount = useWatch({ control, name: 'amount' });
  const watchedTax = useWatch({ control, name: 'taxAmount' });
  const watchedLineItems = useWatch({ control, name: 'lineItems' });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  const mutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) =>
      api.post<TransactionResponse>('/transactions', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (saveAndAddRef.current) {
        saveAndAddRef.current = false;
        reset({
          date: new Date().toISOString().slice(0, 10),
          type: 'DEBIT',
          lineItems: [],
          taxAmount: undefined,
          amount: undefined as unknown as number,
          merchant: '',
          accountId: '',
          description: '',
          categoryId: '',
          referenceNumber: '',
        });
      } else {
        navigate('/transactions');
      }
    },
  });

  function onSubmit(data: FormData) {
    const payload: CreateTransactionRequest = {
      ...data,
      taxAmount: data.taxAmount || undefined,
      referenceNumber: data.referenceNumber || undefined,
      lineItems: data.lineItems?.length ? data.lineItems : undefined,
    };
    mutation.mutate(payload);
  }

  // --- Summary calculations ---
  const subtotal = (watchedLineItems ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const tax = Number(watchedTax) || 0;
  const total = Number(watchedAmount) || 0;
  const expectedTotal = subtotal + tax;
  const hasLineItems = (watchedLineItems ?? []).length > 0;
  const isBalanced = hasLineItems && Math.abs(expectedTotal - total) < 0.01;
  // --- Category breakdown ---
  const categoryBreakdown: { id: string; name: string; color: string; amount: number }[] = [];
  if (hasLineItems) {
    const grouped = new Map<string, number>();
    for (const item of watchedLineItems ?? []) {
      const catId = item?.categoryId || 'uncategorized';
      const qty = Number(item?.quantity) || 0;
      const price = Number(item?.unitPrice) || 0;
      grouped.set(catId, (grouped.get(catId) || 0) + qty * price);
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

  // --- Check if line items have mixed categories ---
  const lineItemCategoryIds = new Set(
    (watchedLineItems ?? []).map((item) => item?.categoryId).filter(Boolean),
  );
  const hasMixedCategories = lineItemCategoryIds.size > 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Transaction</h1>
        <p className="text-sm text-gray-500 mt-1">Record a new transaction with optional line items</p>
      </div>

      {mutation.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Failed to create transaction.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== LEFT COLUMN ===== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Type Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Transaction Type</label>
              <div className="grid grid-cols-3 gap-3">
                {TYPE_CONFIG.map((t) => {
                  const isActive = watchedType === t.value;
                  const colorMap = {
                    red: isActive
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    green: isActive
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    blue: isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  };
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setValue('type', t.value)}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${colorMap[t.color]}`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register('type')} />
            </div>

            {/* Transaction Details Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Account */}
                <div className="space-y-1">
                  <label htmlFor="txn-account" className="block text-sm font-medium text-gray-700">Account</label>
                  <select
                    id="txn-account"
                    {...register('accountId')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select account</option>
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.accountId && <p className="text-xs text-red-600">{errors.accountId.message}</p>}
                </div>

                {/* Date */}
                <FormField label="Date" type="date" {...register('date')} error={errors.date?.message} />

                {/* Merchant */}
                <div className="space-y-1">
                  <label htmlFor="txn-merchant" className="block text-sm font-medium text-gray-700">Merchant</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0 0 20.25 9.35m-16.5 0a3.004 3.004 0 0 0 2.25-5.1 3.004 3.004 0 0 0-2.25-1.5H5.25A3 3 0 0 0 2.25 5.75v.6a2.993 2.993 0 0 0 1.5 2.6" />
                      </svg>
                    </span>
                    <input
                      id="txn-merchant"
                      {...register('merchant')}
                      placeholder="e.g. Whole Foods"
                      className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  {errors.merchant && <p className="text-xs text-red-600">{errors.merchant.message}</p>}
                </div>

                {/* Total Amount */}
                <div className="space-y-1">
                  <label htmlFor="txn-amount" className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">$</span>
                    <input
                      id="txn-amount"
                      type="number"
                      step="0.01"
                      {...register('amount')}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
                </div>

                {/* Tax Amount */}
                <div className="space-y-1">
                  <label htmlFor="txn-tax" className="block text-sm font-medium text-gray-700">Tax Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">$</span>
                    <input
                      id="txn-tax"
                      type="number"
                      step="0.01"
                      {...register('taxAmount')}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label htmlFor="txn-category" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="txn-category"
                    {...register('categoryId')}
                    disabled={hasMixedCategories}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">{hasMixedCategories ? 'Mixed (per line item)' : 'Select category'}</option>
                    {flatCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <FormField label="Reference Number" {...register('referenceNumber')} placeholder="Optional" />

                {/* Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="txn-notes" className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    id="txn-notes"
                    {...register('description')}
                    rows={3}
                    placeholder="Add any notes about this transaction..."
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <button
                  type="button"
                  onClick={() => append({ name: '', quantity: 1, unit: 'ea', unitPrice: 0 })}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Item
                </button>
              </div>

              {fields.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No line items yet. Click "Add Item" to itemize this transaction.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 min-w-[700px]">
                    <div className="col-span-3">Item Name</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-2">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Rows */}
                  {fields.map((field, index) => {
                    const qty = Number(watchedLineItems?.[index]?.quantity) || 0;
                    const price = Number(watchedLineItems?.[index]?.unitPrice) || 0;
                    const lineTotal = qty * price;

                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-50 min-w-[700px]">
                        {/* Item Name */}
                        <div className="col-span-3">
                          <input
                            {...register(`lineItems.${index}.name`)}
                            placeholder="Item name"
                            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        {/* Category */}
                        <div className="col-span-2">
                          <select
                            {...register(`lineItems.${index}.categoryId`)}
                            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">None</option>
                            {flatCats.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Qty */}
                        <div className="col-span-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`lineItems.${index}.quantity`)}
                            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        {/* Unit */}
                        <div className="col-span-1">
                          <select
                            {...register(`lineItems.${index}.unit`)}
                            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              {...register(`lineItems.${index}.unitPrice`)}
                              className="block w-full rounded-md border border-gray-300 pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="col-span-2 text-sm font-medium text-gray-700 pl-2">
                          ${lineTotal.toFixed(2)}
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT COLUMN (sticky) ===== */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg">${total.toFixed(2)}</span>
                </div>

                {hasLineItems && total > 0 && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    isBalanced
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {isBalanced ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Line items + tax match total
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        Items + tax (${expectedTotal.toFixed(2)}) ≠ total (${total.toFixed(2)})
                      </span>
                    )}
                  </div>
                )}
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

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  saveAndAddRef.current = true;
                  handleSubmit(onSubmit)();
                }}
                className="w-full rounded-lg border border-primary-600 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors"
              >
                Save & Add Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
