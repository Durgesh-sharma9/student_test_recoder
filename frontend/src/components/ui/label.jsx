import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = React.forwardRef(
  (
    {
      className,
      ...props
    },
    ref
  ) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        `
          block
          mb-2
          text-sm
          font-semibold
          text-slate-700

          peer-disabled:cursor-not-allowed
          peer-disabled:opacity-50
        `,
        className
      )}
      {...props}
    />
  )
);

Label.displayName =
  LabelPrimitive.Root.displayName;

export { Label };