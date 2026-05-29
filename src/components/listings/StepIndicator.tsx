import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  current: number; // 1-based
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <>
      {/* Mobile: compact numbered-dot progress (labels live in the header text) */}
      <div className="flex md:hidden items-center w-full max-w-full">
        {steps.map((label, i) => {
          const number = i + 1;
          const isCompleted = number < current;
          const isActive = number === current;

          return (
            <Fragment key={label}>
              <div
                className={cn(
                  'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                  isCompleted && 'bg-blue-600 border-blue-600 text-white',
                  isActive && 'bg-white border-blue-600 text-blue-600',
                  !isCompleted && !isActive && 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : number}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 transition-colors',
                    number < current ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Desktop (md+): full labeled stepper — unchanged; overflow-x-auto guards against page-level overflow */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex items-center justify-center">
          {steps.map((label, i) => {
            const number = i + 1;
            const isCompleted = number < current;
            const isActive = number === current;

            return (
              <div key={label} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  isCompleted && 'bg-blue-600 border-blue-600 text-white',
                  isActive && 'bg-white border-blue-600 text-blue-600',
                  !isCompleted && !isActive && 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : number}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive && 'text-blue-600',
                  isCompleted && 'text-blue-500',
                  !isCompleted && !isActive && 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 sm:w-24 mx-2 mb-5 transition-colors',
                  number < current ? 'bg-blue-600' : 'bg-gray-200'
                )}
              />
            )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
