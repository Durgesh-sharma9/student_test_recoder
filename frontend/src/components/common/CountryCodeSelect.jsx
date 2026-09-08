import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { ALL_COUNTRIES, POPULAR_COUNTRIES, DEFAULT_COUNTRY, getCountryByCode } from '@/utils/countryCodes';

export function FlagIcon({ iso, emoji, className = "h-3.5 w-5 rounded-[2px] object-cover inline-block" }) {
  const [imgError, setImgError] = useState(false);

  if (!iso || imgError) {
    return <span className="text-sm leading-none select-none">{emoji || '🌐'}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/w20/${iso.toLowerCase()}.png`}
      width="18"
      height="12"
      alt={iso}
      loading="lazy"
      onError={() => setImgError(true)}
      className={className}
    />
  );
}

export default function CountryCodeSelect({
  value = '+91',
  onChange,
  className = '',
  buttonClassName = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCountry = useMemo(() => {
    return getCountryByCode(value) || DEFAULT_COUNTRY;
  }, [value]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;

    return ALL_COUNTRIES.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
      );
    });
  }, [search]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (country) => {
    if (onChange) {
      onChange(country.code, country);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 px-2.5 h-9 min-w-[95px] max-w-[110px] rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <FlagIcon iso={selectedCountry.iso} emoji={selectedCountry.flag} />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCountry.code}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-[280px] sm:w-[300px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-[100] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/60 custom-scrollbar text-xs">
            {/* Quick-access popular section when search is empty */}
            {!search && (
              <div className="bg-slate-50/50 dark:bg-slate-800/30">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Popular
                </div>
                {POPULAR_COUNTRIES.map((country) => {
                  const isSelected = selectedCountry.code === country.code && selectedCountry.iso === country.iso;
                  return (
                    <button
                      key={`pop-${country.iso}-${country.code}`}
                      type="button"
                      onClick={() => handleSelect(country)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FlagIcon iso={country.iso} emoji={country.flag} />
                        <span className="truncate">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-slate-500 dark:text-slate-400">{country.code}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                      </div>
                    </button>
                  );
                })}
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800 mt-1">
                  All Countries
                </div>
              </div>
            )}

            {/* Filtered / All Countries */}
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No country found for &quot;{search}&quot;
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry.code === country.code && selectedCountry.iso === country.iso;
                return (
                  <button
                    key={`${country.iso}-${country.code}`}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors ${
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FlagIcon iso={country.iso} emoji={country.flag} />
                      <span className="truncate">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">{country.code}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
