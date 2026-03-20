// frontend/src/components/WatchlistPanel.jsx
import { useEffect } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';

export default function WatchlistPanel({ onSelectTicker }) {
  const { user } = useAuthStore();
  const { watchlist, fetchWatchlist, addToWatchlist, removeFromWatchlist, ticker } = useStockStore();

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user, fetchWatchlist]);

  if (!user) {
    return (
      <div className="card text-center text-sm text-text-muted py-6">
        <Star size={20} className="mx-auto mb-2 opacity-40" />
        <p>Sign in to save watchlist</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-semibold text-text-primary flex items-center gap-2">
          <Star size={14} className="text-brand-amber" /> Watchlist
        </h3>
        <button
          onClick={() => addToWatchlist(ticker)}
          disabled={watchlist.includes(ticker)}
          className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-30"
          title={`Add ${ticker} to watchlist`}
        >
          <Plus size={12} /> Add {ticker}
        </button>
      </div>

      {watchlist.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-4">No tickers saved yet.</p>
      ) : (
        <ul className="space-y-1">
          {watchlist.map((t) => (
            <li
              key={t}
              className={`flex items-center justify-between px-3 py-2 rounded-lg
                          cursor-pointer transition-all duration-150 group
                          ${t === ticker
                            ? 'bg-brand-cyan/10 border border-brand-cyan/20'
                            : 'hover:bg-bg-hover border border-transparent'
                          }`}
              onClick={() => onSelectTicker(t)}
            >
              <span className={`text-sm font-mono font-semibold
                               ${t === ticker ? 'text-brand-cyan' : 'text-text-primary'}`}>
                {t}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(t); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100
                           text-brand-red transition-opacity"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
