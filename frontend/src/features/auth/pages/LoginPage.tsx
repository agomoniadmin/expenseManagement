import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/shared/auth/AuthContext';
import { FormField } from '@/shared/components/FormField';
import { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      setError('');
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        const apiErr = err.response?.data as ApiError | undefined;
        setError(apiErr?.message ?? 'Login failed. Check your credentials.');
      } else {
        setError('An unexpected error occurred.');
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Sign in to ExpenseTracker</h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <FormField label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <FormField label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Don't have an account? <Link to="/register" className="text-primary-600 hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
