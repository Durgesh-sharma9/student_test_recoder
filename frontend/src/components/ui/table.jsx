import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      className="
        relative
        w-full
        overflow-auto
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm',
          className
        )}
        {...props}
      />
    </div>
  )
);

Table.displayName = 'Table';

const TableHeader = React.forwardRef(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'bg-slate-50',
        className
      )}
      {...props}
    />
  )
);

TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn(
        '[&_tr:last-child]:border-0',
        className
      )}
      {...props}
    />
  )
);

TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        `
          border-b
          border-slate-100
          transition-colors
          hover:bg-indigo-50/50
        `,
        className
      )}
      {...props}
    />
  )
);

TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        `
          h-12
          px-4
          text-left
          align-middle
          text-xs
          font-bold
          uppercase
          tracking-wider
          text-slate-600
        `,
        className
      )}
      {...props}
    />
  )
);

TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        `
          px-4
          py-3
          align-middle
          text-slate-700
        `,
        className
      )}
      {...props}
    />
  )
);

TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn(
        `
          mt-4
          text-sm
          text-slate-500
        `,
        className
      )}
      {...props}
    />
  )
);

TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};