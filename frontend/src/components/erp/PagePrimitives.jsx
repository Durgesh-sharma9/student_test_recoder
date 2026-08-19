import React from 'react';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  blue: {
    header: 'bg-gradient-to-r from-blue-100/70 via-indigo-50 to-blue-100/50 border-blue-200 text-indigo-950',
    icon: 'text-indigo-600',
  },
  orange: {
    header: 'bg-gradient-to-r from-[#FFEEDD] via-[#FFF7ED] to-[#FFEEDD] border-orange-200/80 text-[#8E3200]',
    icon: 'text-orange-600',
  },
  indigo: {
    header: 'bg-gradient-to-r from-indigo-100/70 via-blue-50 to-indigo-100/50 border-indigo-200 text-indigo-950',
    icon: 'text-indigo-600',
  },
  green: {
    header: 'bg-gradient-to-r from-emerald-100/70 via-teal-50 to-emerald-100/50 border-emerald-200 text-emerald-950',
    icon: 'text-emerald-600',
  },
  purple: {
    header: 'bg-gradient-to-r from-violet-100/70 via-purple-50 to-violet-100/50 border-violet-200 text-violet-950',
    icon: 'text-violet-600',
  },
  yellow: {
    header: 'bg-gradient-to-r from-amber-100/70 via-yellow-50 to-amber-100/50 border-amber-200 text-amber-950',
    icon: 'text-amber-600',
  },
};

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-0.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between w-full max-w-full overflow-x-hidden">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl break-words leading-tight">
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
      <div className={cn('flex items-center justify-between gap-3 border-b px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-t-xl overflow-hidden', styles.header)}>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className={cn('h-4 w-4 shrink-0', styles.icon)} /> : null}
          <span className="font-semibold">{title}</span>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children != null && children !== false && (
        <div className={cn('p-2.5 sm:p-3', contentClassName)}>{children}</div>
      )}
    </section>
  );
});

export function FormField({ label, children, className, required }) {
  return (
    <div className={cn('space-y-0.5', className)}>
      {label ? (
        <label className="text-[11px] font-semibold text-slate-700 tracking-tight">
          {label}
          {required ? <span className="text-red-500 ml-0.5 font-bold">*</span> : null}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function PageStack({ children, className }) {
  return <div className={cn('space-y-2.5', className)}>{children}</div>;
}