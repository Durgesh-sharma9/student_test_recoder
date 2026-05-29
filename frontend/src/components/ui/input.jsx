import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(
  (
    {
      className,
      type,
      ...props
    },
    ref
  ) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        `
          flex
          h-11
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-2
          text-sm
          text-slate-800
          shadow-sm
          transition-all
          duration-200

          placeholder:text-slate-400

          focus:outline-none
          focus:ring-2
          focus:ring-indigo-500/20
          focus:border-indigo-500

          disabled:cursor-not-allowed
          disabled:opacity-50
        `,
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';

export { Input };