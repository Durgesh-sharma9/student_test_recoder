import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:   'border-transparent bg-[#e3f2fd] text-[#1565c0]',
        secondary: 'border-transparent bg-[#f5f9ff] text-[#546e7a]',
        outline:   'border-[#bbdefb] text-[#1976d2] bg-transparent',
        success:   'border-transparent bg-[#e8f5e9] text-[#2e7d32]',
        warning:   'border-transparent bg-[#fff3e0] text-[#e65100]',
        danger:    'border-transparent bg-[#fce4ec] text-[#c2185b]',
        purple:    'border-transparent bg-[#ede7f6] text-[#7b1fa2]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };