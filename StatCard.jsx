// frontend/src/components/StatCard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ label, value, sub, trend, className = '' }) {
  const isUp   = trend > 0;
  const isDown = trend < 0;

  return (
    <div className={`card flex flex-col gap-2 ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value font-mono">{value ?? '—'}</span>
      {(sub !== undefined || trend !== undefined) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span className={isUp ? 'badge-up' : isDown ? 'badge-down' : 'text-text-muted text-xs'}>
              {isUp   && <TrendingUp  size={10} />}
              {isDown && <TrendingDown size={10} />}
              {trend > 0 ? '+' : ''}{Number(trend).toFixed(2)}%
            </span>
          )}
          {sub && <span className="text-xs text-text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
export function Skeleton({ className = '', height = 'h-6' }) {
  return <div className={`skeleton ${height} ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton height="h-3" className="w-20" />
      <Skeleton height="h-8" className="w-32" />
      <Skeleton height="h-3" className="w-16" />
    </div>
  );
}

// ── Alert / Toast ──────────────────────────────────────────────────────────────
export function Alert({ type = 'error', message, onClose }) {
  const styles = {
    error:   'bg-brand-red/10 border-brand-red/30 text-brand-red',
    success: 'bg-brand-green/10 border-brand-green/30 text-brand-green',
    info:    'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan',
    warning: 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber',
  };

  return (
    <div className={`flex items-start justify-between gap-3 p-4 rounded-lg border
                     text-sm font-body animate-slide-in ${styles[type]}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">✕</button>
      )}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, label }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs text-text-muted">
          <span>{label}</span>
          <span className="font-mono">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-cyan to-brand-green rounded-full
                     transition-all duration-500 ease-out"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
