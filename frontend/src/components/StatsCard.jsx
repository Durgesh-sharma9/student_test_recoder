import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEMES = [
  { wrap: 'bg-blue-50 border-blue-100', icon: 'bg-blue-100 text-blue-600', accent: 'text-blue-700' },
  { wrap: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', accent: 'text-violet-700' },
  { wrap: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-700' },
  { wrap: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-600', accent: 'text-amber-700' },
  { wrap: 'bg-orange-50 border-orange-100', icon: 'bg-orange-100 text-orange-600', accent: 'text-orange-700' },
];

let cardCounter = 0;

export default function StatsCard({ title, value, icon: Icon, description, themeIndex, className }) {
  const theme = THEMES[(themeIndex ?? cardCounter++) % THEMES.length];

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-3 sm:p-5 shadow-xs transition-all hover:shadow-md',
        theme.wrap,
        className
      )}
    >
      <div className="mb-1.5 sm:mb-3 flex items-center justify-between gap-2">
        <p className={cn('text-[10px] sm:text-xs font-bold uppercase tracking-wider', theme.accent)}>{title}</p>
        {Icon ? (
          <div className={cn('flex h-7 sm:h-10 w-7 sm:w-10 items-center justify-center rounded-lg', theme.icon)}>
            <Icon className="h-3.5 sm:h-5 w-3.5 sm:w-5" />
          </div>
        ) : null}
      </div>
      <p className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      {description ? (
        <p className={cn('mt-1 sm:mt-2 flex items-center gap-1 text-[11px] sm:text-xs font-medium', theme.accent)}>
          <TrendingUp className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          {description}
        </p>
      ) : null}
    </div>
  );
}
