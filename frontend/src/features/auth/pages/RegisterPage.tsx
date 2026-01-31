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
  password: z.string().min(12, 'Password must be at least 12 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      setError('');
      await registerUser(data.email, data.password, data.firstName, data.lastName);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        const apiErr = err.response?.data as ApiError | undefined;
        setError(apiErr?.message ?? 'Registration failed.');
      } else {
        setError('An unexpected error occurred.');
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Create your account</h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" {...register('firstName')} error={errors.firstName?.message} />
            <FormField label="Last name" {...register('lastName')} error={errors.lastName?.message} />
          </div>
          <FormField label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <FormField label="Password" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
