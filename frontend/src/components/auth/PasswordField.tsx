'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  id?: string;
}

export function PasswordField({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  error,
  required,
  autoComplete,
  id,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gradion-navy mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'w-full px-4 py-2.5 pr-11 border rounded-lg text-gradion-navy placeholder:text-gradion-navy/35',
            'focus:outline-none focus:ring-2 focus:ring-gradion-teal/30 focus:border-gradion-teal transition-colors',
            error ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-gradion-grey',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gradion-navy/45 hover:text-gradion-navy transition-colors"
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        >
          {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
