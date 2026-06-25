import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function SubjectSelect({
  value,
  onChange,
  subjects = [],
  loading = false,
  allowCustom = false,
  canAddSubjects = false,
  onRegisterSubject,
  placeholder = 'Search or select subject',
  emptyMessage = 'No subjects available.',
  includeAllOption = false,
  allLabel = 'All Subjects',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const normalized = useMemo(
    () => [...new Set(subjects.map((s) => String(s).trim().toUpperCase()).filter(Boolean))].sort(),
    [subjects]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return normalized;
    return normalized.filter((s) => s.includes(q));
  }, [normalized, query]);

  const customValue = query.trim().toUpperCase();
  const showCustom =
    allowCustom &&
    customValue &&
    !normalized.includes(customValue);

  const pick = async (subject) => {
    const next = String(subject).trim().toUpperCase();
    if (canAddSubjects && onRegisterSubject && !normalized.includes(next)) {
      await onRegisterSubject(next);
    }
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 pr-9"
          placeholder={loading ? 'Loading subjects...' : placeholder}
          value={query}
          disabled={loading}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
            if (!e.target.value) onChange('');
          }}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && <p className="px-3 py-2 text-sm text-slate-500">Loading...</p>}
          {!loading && includeAllOption && (
            <button
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 border-b border-slate-100',
                !value && 'bg-blue-50 font-medium text-blue-700'
              )}
              onClick={() => {
                onChange('');
                setQuery('');
                setOpen(false);
              }}
            >
              {allLabel}
            </button>
          )}
          {!loading && filtered.length === 0 && !showCustom && (
            <p className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</p>
          )}
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50',
                value === s && 'bg-blue-50 font-medium text-blue-700'
              )}
              onClick={() => pick(s)}
            >
              {s}
            </button>
          ))}
          {showCustom && (
            <button
              type="button"
              className="w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
              onClick={() => pick(customValue)}
            >
              {canAddSubjects ? `Add & use "${customValue}"` : `Use custom "${customValue}"`}
            </button>
          )}
          {!loading && allowCustom && !canAddSubjects && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Custom subjects must match your assignment or save will be rejected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
