// frontend/src/components/TradingSignals.jsx
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

function deriveSignal(predictionData) {
  if (!predictionData?.predictions?.length || !predictionData?.last_close) return null;

  const lastClose = predictionData.last_close;
  const finalPred = predictionData.predictions[predictionData.predictions.length - 1]?.price;
  if (!finalPred) return null;

  const pctChange = ((finalPred - lastClose) / lastClose) * 100;

  // Simple rule-based signal thresholds
  if (pctChange > 3)  return { signal: 'BUY',  pctChange, strength: pctChange > 8 ? 'Strong' : 'Moderate' };
  if (pctChange < -3) return { signal: 'SELL', pctChange, strength: pctChange < -8 ? 'Strong' : 'Moderate' };
  return { signal: 'HOLD', pctChange, strength: 'Neutral' };
}

const SIGNAL_STYLES = {
  BUY:  { bg: 'bg-brand-green/10', border: 'border-brand-green/30', text: 'text-brand-green', Icon: TrendingUp },
  SELL: { bg: 'bg-brand-red/10',   border: 'border-brand-red/30',   text: 'text-brand-red',   Icon: TrendingDown },
  HOLD: { bg: 'bg-brand-amber/10', border: 'border-brand-amber/30', text: 'text-brand-amber', Icon: Minus },
};

export default function TradingSignals({ predictionData }) {
  const signal = deriveSignal(predictionData);

  if (!signal) {
    return (
      <div className="card flex items-center gap-3 text-text-muted text-sm">
        <AlertTriangle size={16} />
        <span>No signal data — run a prediction first.</span>
      </div>
    );
  }

  const { signal: sig, pctChange, strength } = signal;
  const { bg, border, text, Icon } = SIGNAL_STYLES[sig];
  const isUp = pctChange > 0;

  return (
    <div className={`card border ${border} ${bg}`}>
      <div className="flex items-center justify-between">
        {/* Main signal */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${bg} border ${border}
                           flex items-center justify-center flex-shrink-0`}>
            <Icon size={20} className={text} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-display font-bold ${text}`}>{sig}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${border} ${text} opacity-80`}>
                {strength}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Model-based trading signal · horizon {predictionData.horizon}d
            </p>
          </div>
        </div>

        {/* Price details */}
        <div className="text-right">
          <p className={`text-lg font-mono font-bold ${isUp ? 'text-brand-green' : 'text-brand-red'}`}>
            {isUp ? '+' : ''}{pctChange.toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            ${predictionData.last_close?.toFixed(2)} → ${predictionData.predictions?.at(-1)?.price?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Mini prediction preview */}
      <div className="mt-4 pt-4 border-t border-bg-border grid grid-cols-3 gap-3">
        {[0, Math.floor(predictionData.predictions.length / 2), predictionData.predictions.length - 1]
          .filter((i) => predictionData.predictions[i])
          .map((i) => {
            const p = predictionData.predictions[i];
            const chg = ((p.price - predictionData.last_close) / predictionData.last_close) * 100;
            return (
              <div key={p.date} className="text-center">
                <p className="text-xs text-text-muted">{i === 0 ? 'Day 1' : i === predictionData.predictions.length - 1 ? `Day ${predictionData.predictions.length}` : 'Mid'}</p>
                <p className="text-sm font-mono text-text-primary mt-0.5">${p.price.toFixed(2)}</p>
                <p className={`text-xs font-mono ${chg >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                  {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                </p>
              </div>
            );
          })
        }
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-text-muted mt-3 flex items-center gap-1.5">
        <AlertTriangle size={10} />
        Not financial advice. Model predictions only — always do your own research.
      </p>
    </div>
  );
}
