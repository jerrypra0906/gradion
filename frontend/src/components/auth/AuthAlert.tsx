import { cn } from '@/lib/utils';

interface AuthAlertProps {
  variant: 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

export function AuthAlert({ variant, children, className }: AuthAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'px-4 py-3 rounded-lg text-sm border',
        variant === 'error' && 'bg-red-50 border-red-200 text-red-700',
        variant === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
        className,
      )}
    >
      {children}
    </div>
  );
}
