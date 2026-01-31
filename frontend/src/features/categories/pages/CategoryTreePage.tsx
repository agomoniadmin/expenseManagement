import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/shared/api/client';
import type { CategoryResponse, CreateCategoryRequest } from '@/shared/types/api';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Modal } from '@/shared/components/Modal';
import { FormField } from '@/shared/components/FormField';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  budgetLimit: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CategoryTreePage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryRequest) =>
      api.post('/categories', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowCreate(false);
      reset();
    },
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2">
          <Link to="/categories/mappings" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Mappings
          </Link>
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            New Category
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {categories && categories.length > 0 ? (
          <ul className="space-y-2">
            {categories.map((cat) => (
              <CategoryNode key={cat.id} category={cat} depth={0} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No categories found.</p>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Category">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as CreateCategoryRequest))} className="space-y-4">
          <FormField label="Name" {...register('name')} error={errors.name?.message} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Parent Category</label>
            <select {...register('parentId')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">None (top-level)</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Icon" {...register('icon')} />
            <FormField label="Color" type="color" {...register('color')} />
          </div>
          <FormField label="Budget Limit" type="number" step="0.01" {...register('budgetLimit')} />
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}

function CategoryNode({ category, depth }: { category: CategoryResponse; depth: number }) {
  return (
    <li>
      <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${depth * 24}px` }}>
        {category.color && (
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
        )}
        <span className="text-sm font-medium">{category.name}</span>
        {category.budgetLimit && (
          <span className="text-xs text-gray-500 ml-auto">Budget: ${category.budgetLimit.toFixed(2)}</span>
        )}
      </div>
      {category.children?.length > 0 && (
        <ul>
          {category.children.map((child) => (
            <CategoryNode key={child.id} category={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
