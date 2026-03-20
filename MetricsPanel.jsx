// frontend/src/components/MetricsPanel.jsx
import { Target, TrendingUp, BarChart2, Crosshair } from 'lucide-react';

const METRIC_CONFIG = [
  {
    key: 'mae',
    label: 'MAE',
    icon: Target,
    description: 'Mean Absolute Error',
    format: (v) => `$${Number(v).toFixed(3)}`,
    color: 'text-brand-cyan',
    border: 'border-brand-cyan/20',
    bg: 'bg-brand-cyan/5',
  },
  {
    key: 'rmse',
    label: 'RMSE',
    icon: BarChart2,
    description: 'Root Mean Sq Error',
    format: (v) => `$${Number(v).toFixed(3)}`,
    color: 'text-brand-purple',
    border: 'border-brand-purple/20',
    bg: 'bg-brand-purple/5',
  },
  {
    key: 'mape',
    label: 'MAPE',
    icon: TrendingUp,
    description: 'Mean Abs % Error',
    format: (v) => `${Number(v).toFixed(2)}%`,
    color: 'text-brand-amber',
    border: 'border-brand-amber/20',
    bg: 'bg-brand-amber/5',
  },
  {
    key: 'directional_accuracy',
    label: 'Dir. Acc',
    icon: Crosshair,
    description: 'Directional Accuracy',
    format: (v) => `${Number(v).toFixed(1)}%`,
    color: 'text-brand-green',
    border: 'border-brand-green/20',
    bg: 'bg-brand-green/5',
  },
];

export default function MetricsPanel({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRIC_CONFIG.map((m) => (
          <div key={m.key} className={`card border ${m.border} ${m.bg}`}>
            <p className="stat-label mb-2">{m.label}</p>
            <p className="text-lg font-mono font-bold text-text-muted">—</p>
            <p className="text-xs text-text-muted mt-1">{m.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {METRIC_CONFIG.map((m) => {
        const value = metrics[m.key];
        const Icon = m.icon;
        return (
          <div key={m.key} className={`card border ${m.border} ${m.bg} group`}>
            <div className="flex items-center justify-between mb-2">
              <p className="stat-label">{m.label}</p>
              <Icon size={14} className={`${m.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className={`text-xl font-mono font-bold ${value != null ? m.color : 'text-text-muted'}`}>
              {value != null ? m.format(value) : '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">{m.description}</p>
          </div>
        );
      })}
    </div>
  );
}
