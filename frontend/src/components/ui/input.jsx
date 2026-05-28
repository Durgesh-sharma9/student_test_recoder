import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-lg border border-[#bbdefb] bg-[#f5f9ff] px-3 py-2 text-sm text-[#263238] placeholder:text-[#b0bec5] transition-colors focus:border-[#1976d2] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 font-[Poppins,sans-serif]',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };