import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { AccountResponse, TransactionResponse, TransferRequest } from '@/shared/types/api';
import { FormField } from '@/shared/components/FormField';

const schema = z.object({
  fromAccountId: z.string().min(1, 'Source account required'),
  toAccountId: z.string().min(1, 'Destination account required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: 'Source and destination must be different',
  path: ['toAccountId'],
});

type FormData = z.infer<typeof schema>;

export default function TransferPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: TransferRequest) =>
      api.post<TransactionResponse>('/transactions/transfer', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigate('/transactions');
    },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Transfer Between Accounts</h1>
      {mutation.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Transfer failed.
        </div>
      )}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">From Account</label>
          <select {...register('fromAccountId')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select source</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {errors.fromAccountId && <p className="text-xs text-red-600">{errors.fromAccountId.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">To Account</label>
          <select {...register('toAccountId')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select destination</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {errors.toAccountId && <p className="text-xs text-red-600">{errors.toAccountId.message}</p>}
        </div>
        <FormField label="Amount" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
        <FormField label="Description (optional)" {...register('description')} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Transferring...' : 'Transfer'}
          </button>
          <button type="button" onClick={() => navigate('/transactions')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
