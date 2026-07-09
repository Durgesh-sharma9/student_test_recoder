import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function SearchableTeacherSelect({
  value,
  onChange,
  teachers = [],
  loading = false,
  placeholder = 'Search or select teacher',
  emptyMessage = 'No teachers available.',
  includeAllOption = false,
  allLabel = 'All Teachers',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value) {
      const teacher = teachers.find((t) => t._id === value);
      setQuery(teacher ? (teacher.teacherName || teacher.name) : '');
    } else {
      setQuery('');
    }
  }, [value, teachers]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = (t.teacherName || t.name || '').toLowerCase();
      const email = (t.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teachers, query]);

  const pick = (teacher) => {
    onChange(teacher._id);
    setQuery(teacher.teacherName || teacher.name);
    setOpen(false);
  };

  const pickAll = () => {
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 pr-9"
          placeholder={loading ? 'Loading teachers...' : placeholder}
          value={query}
          disabled={loading}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
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
        <div 
          className="absolute z-50 mt-1 max-h-[300px] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
          {loading && <p className="px-3 py-2 text-sm text-slate-500">Loading...</p>}
          {!loading && includeAllOption && (
            <button
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 border-b border-slate-100',
                !value && 'bg-blue-50 font-medium text-blue-700'
              )}
              onClick={pickAll}
            >
              {allLabel}
            </button>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</p>
          )}
          {filtered.map((teacher) => (
            <button
              key={teacher._id}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50',
                value === teacher._id && 'bg-blue-50 font-medium text-blue-700'
              )}
              onClick={() => pick(teacher)}
            >
              <div className="font-medium">{teacher.teacherName || teacher.name}</div>
              {teacher.email && <div className="text-xs text-slate-500">{teacher.email}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
