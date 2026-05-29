import { cn } from '@/lib/utils';

const TONE_STYLES = {
  blue: {
    header: 'bg-blue-50 border-blue-100 text-blue-900',
    icon: 'text-blue-600',
  },
  orange: {
    header: 'bg-orange-50 border-orange-100 text-orange-900',
    icon: 'text-orange-600',
  },
  green: {
    header: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    icon: 'text-emerald-600',
  },
  purple: {
    header: 'bg-violet-50 border-violet-100 text-violet-900',
    icon: 'text-violet-600',
  },
  yellow: {
    header: 'bg-amber-50 border-amber-100 text-amber-900',
    icon: 'text-amber-600',
  },
};

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function ErpSection({ title, icon: Icon, tone = 'green', children, action, className, contentClassName }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.green;

  return (
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className={cn('flex items-center justify-between gap-3 border-b px-4 py-3', styles.header)}>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className={cn('h-4 w-4 shrink-0', styles.icon)} /> : null}
          <span className="font-semibold">{title}</span>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  );
}

export function FormField({ label, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <label className="text-sm font-medium text-slate-700">{label}</label> : null}
      {children}
    </div>
  );
}

export function PageStack({ children, className }) {
  return <div className={cn('space-y-5', className)}>{children}</div>;
}
