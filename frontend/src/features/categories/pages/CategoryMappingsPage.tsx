import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/shared/api/client';
import type { MappingResponse, CategoryResponse, CreateMappingRequest } from '@/shared/types/api';
import { DataTable, type Column } from '@/shared/components/DataTable';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Modal } from '@/shared/components/Modal';
import { FormField } from '@/shared/components/FormField';

const schema = z.object({
  pattern: z.string().min(1, 'Pattern required'),
  matchType: z.string().min(1, 'Match type required'),
  categoryId: z.string().min(1, 'Category required'),
  priority: z.coerce.number().int().min(0),
});

type FormData = z.infer<typeof schema>;

const columns: Column<MappingResponse>[] = [
  { key: 'pattern', header: 'Pattern', render: (r) => <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{r.pattern}</code> },
  { key: 'matchType', header: 'Match Type', render: (r) => r.matchType },
  { key: 'priority', header: 'Priority', render: (r) => r.priority },
  { key: 'active', header: 'Active', render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {r.active ? 'Yes' : 'No'}
    </span>
  )},
];

export default function CategoryMappingsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['mappings'],
    queryFn: () => api.get<MappingResponse[]>('/categories/mappings').then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { matchType: 'CONTAINS', priority: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateMappingRequest) =>
      api.post('/categories/mappings', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      setShowCreate(false);
      reset();
    },
  });

  // Flatten categories for select
  const flatCategories: { id: string; name: string }[] = [];
  function flattenCats(cats: CategoryResponse[], prefix = '') {
    for (const c of cats) {
      flatCategories.push({ id: c.id, name: prefix + c.name });
      if (c.children) flattenCats(c.children, prefix + c.name + ' > ');
    }
  }
  if (categories) flattenCats(categories);

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Category Mappings</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          New Mapping
        </button>
      </div>

      <DataTable
        columns={columns}
        data={mappings ?? []}
        keyExtractor={(r) => r.id}
        emptyMessage="No mappings configured."
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Mapping">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <FormField label="Pattern" {...register('pattern')} error={errors.pattern?.message} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Match Type</label>
            <select {...register('matchType')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="EXACT">Exact</option>
              <option value="CONTAINS">Contains</option>
              <option value="STARTS_WITH">Starts With</option>
              <option value="REGEX">Regex</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select {...register('categoryId')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select category</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>
          <FormField label="Priority" type="number" {...register('priority')} error={errors.priority?.message} />
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}
