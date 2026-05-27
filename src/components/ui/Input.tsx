import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'block w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-gray-900',
        'placeholder:text-gray-400 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
          : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
