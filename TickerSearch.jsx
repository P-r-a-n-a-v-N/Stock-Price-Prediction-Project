// frontend/src/components/TickerSearch.jsx
import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useStockStore } from '../store/stockStore';

const POPULAR = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'INTC'];

export function TickerSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { ticker } = useStockStore();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const filtered = query.length >= 1
    ? POPULAR.filter((t) => t.includes(query.toUpperCase()))
    : POPULAR;

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(t) {
    setQuery('');
    setOpen(false);
    onSelect(t);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim().length >= 1) handleSelect(query.trim().toUpperCase());
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={`${ticker} — change ticker`}
            className="input pl-9 pr-9 font-mono text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </form>

      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-bg-card border border-bg-border
                        rounded-lg shadow-2xl z-50 overflow-hidden animate-slide-in">
          {filtered.map((t) => (
            <button
              key={t}
              onMouseDown={() => handleSelect(t)}
              className="w-full px-4 py-2.5 text-left text-sm font-mono text-text-secondary
                         hover:bg-bg-hover hover:text-brand-cyan transition-colors duration-100
                         flex items-center justify-between group"
            >
              <span>{t}</span>
              {t === ticker && (
                <span className="text-xs text-brand-cyan opacity-60">active</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
