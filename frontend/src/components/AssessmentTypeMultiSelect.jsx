import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AssessmentTypeMultiSelect({
  value = [],
  onChange,
  options = [],
  allValue = 'All Assessments',
  placeholder = 'Select assessments',
  className,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const normalizedValue = useMemo(() => [...new Set((value || []).filter(Boolean))], [value]);

  const isAll = normalizedValue.includes(allValue) || normalizedValue.length === 0;

  const label = useMemo(() => {
    if (isAll) return allValue;
    if (normalizedValue.length === 1) return normalizedValue[0];
    return `${normalizedValue.length} selected`;
  }, [isAll, normalizedValue, allValue]);

  const toggle = (opt) => {
    const current = new Set(normalizedValue);
    if (opt === allValue) {
      onChange([allValue]);
      return;
    }
    current.delete(allValue);
    if (current.has(opt)) current.delete(opt);
    else current.add(opt);
    const next = [...current];
    onChange(next.length ? next : [allValue]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between rounded-md border-slate-200 bg-white font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn('truncate', !label && 'text-slate-400')}>{label || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-60 overflow-auto p-2 space-y-1">
            {options.map((opt) => {
              const checked = opt === allValue ? isAll : normalizedValue.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={cn('text-sm', checked && opt !== allValue && 'font-semibold text-blue-700')}>
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

