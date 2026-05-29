import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  `
    inline-flex
    items-center
    rounded-full
    px-3
    py-1
    text-xs
    font-semibold
    tracking-wide
    transition-all
    duration-200
    border
  `,
  {
    variants: {
      variant: {
        default:
          'border-indigo-100 bg-indigo-50 text-indigo-700',

        secondary:
          'border-slate-200 bg-slate-100 text-slate-700',

        outline:
          'border-indigo-300 bg-white text-indigo-600',

        success:
          'border-emerald-100 bg-emerald-50 text-emerald-700',

        warning:
          'border-amber-100 bg-amber-50 text-amber-700',

        danger:
          'border-red-100 bg-red-50 text-red-700',

        purple:
          'border-violet-100 bg-violet-50 text-violet-700',

        info:
          'border-sky-100 bg-sky-50 text-sky-700',
      },
    },

    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };