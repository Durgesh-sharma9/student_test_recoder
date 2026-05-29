import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `
    inline-flex
    items-center
    justify-center
    whitespace-nowrap
    rounded-xl
    text-sm
    font-semibold
    transition-all
    duration-200
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-indigo-500
    focus-visible:ring-offset-2
    disabled:pointer-events-none
    disabled:opacity-50
    shadow-sm
  `,
  {
    variants: {
      variant: {
        default:
          'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',

        destructive:
          'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',

        outline:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',

        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200',

        ghost:
          'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600',

        success:
          'bg-emerald-600 text-white hover:bg-emerald-700',

        warning:
          'bg-amber-500 text-white hover:bg-amber-600',

        purple:
          'bg-violet-600 text-white hover:bg-violet-700',

        info:
          'bg-sky-600 text-white hover:bg-sky-700',

        link:
          'text-indigo-600 underline-offset-4 hover:underline shadow-none',
      },

      size: {
        default: 'h-10 px-5 py-2',

        sm: 'h-8 px-3 text-xs rounded-lg',

        lg: 'h-12 px-8 text-base rounded-xl',

        icon: 'h-10 w-10 rounded-xl',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({
            variant,
            size,
            className,
          })
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };