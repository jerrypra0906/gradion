import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 rounded-lg',
    brand:
      'bg-[#00C1B2] text-white hover:bg-[#00A896] focus:ring-[#00C1B2] shadow-md shadow-[#00C1B2]/20 rounded-full',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 rounded-lg',
    outline:
      'border-2 border-[#1A2B4C]/20 text-[#1A2B4C] hover:bg-[#1A2B4C] hover:text-white focus:ring-[#1A2B4C] rounded-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 rounded-lg',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
