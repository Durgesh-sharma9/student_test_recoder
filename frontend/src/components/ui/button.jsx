import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1976d2] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-[Poppins,sans-serif]',
  {
    variants: {
      variant: {
        default:     'bg-[#1976d2] text-white hover:bg-[#1565c0]',
        destructive: 'bg-[#fce4ec] text-[#c2185b] hover:bg-[#f8bbd0]',
        outline:     'border border-[#bbdefb] bg-[#f5f9ff] text-[#1976d2] hover:bg-[#e3f2fd]',
        secondary:   'bg-[#e3f2fd] text-[#1565c0] hover:bg-[#bbdefb]',
        ghost:       'text-[#546e7a] hover:bg-[#e3f2fd] hover:text-[#1565c0]',
        success:     'bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9]',
        link:        'text-[#1976d2] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 rounded-md px-3 text-xs',
        lg:      'h-11 rounded-lg px-8',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };