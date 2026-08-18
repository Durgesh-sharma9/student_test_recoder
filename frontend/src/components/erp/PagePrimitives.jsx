import React from 'react';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  blue: {
    header: 'bg-gradient-to-r from-blue-50 to-indigo-50/60 border-blue-100 text-indigo-950',
    icon: 'text-indigo-600',
  },
  orange: {
    header: 'bg-gradient-to-r from-orange-50 to-amber-50/60 border-orange-100 text-orange-950',
    icon: 'text-orange-600',
  },
  indigo: {
    header: 'bg-gradient-to-r from-indigo-50 to-blue-50/60 border-indigo-100 text-indigo-950',
    icon: 'text-indigo-600',
  },
  green: {
    header: 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-100 text-emerald-950',
    icon: 'text-emerald-600',
  },
  purple: {
    header: 'bg-gradient-to-r from-violet-50 to-purple-50/60 border-violet-100 text-violet-950',
    icon: 'text-violet-600',
  },
  yellow: {
    header: 'bg-gradient-to-r from-amber-50 to-yellow-50/60 border-amber-100 text-amber-950',
    icon: 'text-amber-600',
  },
};

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full max-w-full overflow-x-hidden">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl break-words leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500 break-words leading-normal">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div> : null}
    </div>
  );
}

export const ErpSection = React.forwardRef(function ErpSection(
  { title, icon: Icon, tone = 'green', children, action, className, contentClassName, ...props },
  ref
) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.green;

  return (
    <section ref={ref} className={cn('rounded-xl border border-slate-200 shadow-sm', (!className?.includes?.('bg-')) && 'bg-white', className)} {...props}>
      <div className={cn('flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm font-semibold rounded-t-xl overflow-hidden', styles.header)}>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className={cn('h-4 w-4 shrink-0', styles.icon)} /> : null}
          <span className="font-semibold">{title}</span>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children != null && children !== false && (
        <div className={cn('p-3 sm:p-4', contentClassName)}>{children}</div>
      )}
    </section>
  );
});

export function FormField({ label, children, className, required }) {
  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <label className="text-xs font-semibold text-slate-700">
          {label}
          {required ? <span className="text-red-500 ml-0.5 font-bold">*</span> : null}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function PageStack({ children, className }) {
  return <div className={cn('space-y-3.5', className)}>{children}</div>;
}