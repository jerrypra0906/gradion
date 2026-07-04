import { TextareaHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  variant?: 'default' | 'brand';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        <textarea
          ref={ref}
          className={cn(
            'w-full min-h-[96px] rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2',
            isBrand
              ? 'border-[#E5E8EB] focus:border-[#00C1B2] focus:ring-[#00C1B2]/30 placeholder:text-[#1A2B4C]/35'
              : 'border-gray-300 focus:border-transparent focus:ring-blue-500',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

