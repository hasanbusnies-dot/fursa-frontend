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
        // DESIGN.md inputs: 12px radius, light-gray fill instead of a border;
        // focus = blue border + 4px soft glow.
        'block w-full px-3.5 py-2.5 rounded-field border bg-input-bg text-sm text-gray-900',
        'placeholder:text-gray-400 transition-colors',
        'focus:outline-none focus:ring-4 focus:ring-offset-0 focus:bg-white',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
          : 'border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-blue-100',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
