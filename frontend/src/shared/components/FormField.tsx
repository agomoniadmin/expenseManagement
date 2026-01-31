import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    return (
      <div className={clsx('space-y-1', className)}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
          ref={ref}
          id={id}
          className={clsx(
            'block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            error ? 'border-red-300 text-red-900' : 'border-gray-300',
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

FormField.displayName = 'FormField';
