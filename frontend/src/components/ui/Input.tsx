import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'brand';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, variant = 'default', className, ...props }, ref) => {
    const isBrand = variant === 'brand';

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-sm font-medium mb-1.5',
              isBrand ? 'text-[#1A2B4C]' : 'text-gray-700',
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-gray-900',
            isBrand
              ? 'border-[#E5E8EB] focus:ring-[#00C1B2]/30 focus:border-[#00C1B2] placeholder:text-[#1A2B4C]/35'
              : 'border-gray-300 focus:ring-blue-500 focus:border-transparent',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

