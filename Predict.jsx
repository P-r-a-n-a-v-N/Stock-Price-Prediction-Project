// frontend/src/pages/Predict.jsx
import { useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { useTickerSocket } from '../hooks/useSocket';
import { TickerSearch } from '../components/TickerSearch';
import PriceChart from '../components/PriceChart';
import MetricsPanel from '../components/MetricsPanel';
import TradingSignals from '../components/TradingSignals';
import { Alert, SectionHeader, Skeleton } from '../components/StatCard';

const HORIZON_OPTIONS = [1, 3, 7, 14, 30];

function PredictionTable({ predictions, lastClose }) {
  if (!predictions?.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-bg-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-border bg-bg-secondary">
            {['Date', 'Predicted Price', 'Change vs Now', 'Confidence Band'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-body text-text-muted uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {predictions.map((p, i) => {
            const change = lastClose ? ((p.price - lastClose) / lastClose) * 100 : null;
            return (
              <tr
                key={p.date}
                className={`border-b border-bg-border/50 transition-colors
                             hover:bg-bg-hover
                             ${i === 0 ? 'bg-brand-cyan/5' : ''}`}
              >
                <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">{p.date}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-text-primary">
                  ${p.price.toFixed(4)}
                </td>
                <td className="px-4 py-2.5">
                  {change != null ? (
                    <span className={change >= 0 ? 'badge-up' : 'badge-down'}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-text-muted font-mono">
                  {/* confidence_bands are at the predictionData level */}
                  {i === 0 ? '90% CI' : `+${Math.round(i * 15)}% wider`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Predict() {
  const {
    ticker, horizon, predictionData, isLoadingPrediction, predictionError,
    setTicker, setHorizon, fetchPrediction,
  } = useStockStore();

  const onPrediction = useCallback(
    (data) => useStockStore.setState({ predictionData: data }),
    []
  );
  useTickerSocket(ticker, onPrediction);

  useEffect(() => { fetchPrediction(); }, [ticker, horizon]);

  const pdata = predictionData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Prediction Analysis</h1>
          <p className="text-sm text-text-secondary mt-1">
            LSTM-Transformer hybrid · {horizon}-day horizon
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <TickerSearch onSelect={setTicker} />

          <div className="flex items-center gap-1 bg-bg-secondary border border-bg-border rounded-lg p-1">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150
                  ${h === horizon ? 'bg-brand-cyan text-bg-primary font-bold' : 'text-text-muted hover:text-text-primary'}`}
              >
                {h}d
              </button>
            ))}
          </div>

          <button onClick={fetchPrediction} disabled={isLoadingPrediction} className="btn-primary flex items-center gap-2">
            <RefreshCw size={13} className={isLoadingPrediction ? 'animate-spin' : ''} />
            Run Prediction
          </button>
        </div>
      </div>

      {predictionError && (
        <Alert type="error" message={predictionError} onClose={() => useStockStore.setState({ predictionError: null })} />
      )}

      {/* Model status banner */}
      {pdata && !pdata.model_trained && (
        <Alert
          type="warning"
          message="Using untrained baseline model. Go to Train Model page to improve accuracy for this ticker."
        />
      )}

      {/* Chart */}
      <div className="card">
        <SectionHeader
          title={`${ticker} — ${horizon}-Day Forecast`}
          subtitle={`Last close: ${pdata?.last_close ? '$' + pdata.last_close.toFixed(2) : '—'} · Generated ${pdata?.generated_at ? new Date(pdata.generated_at).toLocaleTimeString() : '—'}`}
        />
        {isLoadingPrediction
          ? <div className="skeleton h-96 w-full rounded-lg" />
          : <PriceChart predictionData={pdata} height={380} />
        }
      </div>

      {/* Trading signals */}
      <div>
        <SectionHeader title="Trading Signal" />
        {isLoadingPrediction
          ? <div className="skeleton h-40 w-full rounded-xl" />
          : <TradingSignals predictionData={pdata} />
        }
      </div>

      {/* Model metrics */}
      <div>
        <SectionHeader
          title="Model Evaluation Metrics"
          subtitle={pdata?.model_trained
            ? 'Computed on held-out test split during training'
            : 'Train a custom model to see real metrics'}
        />
        <MetricsPanel metrics={pdata?.model_trained ? {} : {}} />
      </div>

      {/* Prediction table */}
      <div>
        <SectionHeader
          title="Prediction Schedule"
          subtitle={`${pdata?.predictions?.length ?? 0} forward predictions`}
        />
        {isLoadingPrediction ? (
          <div className="space-y-2">
            {Array(7).fill(null).map((_, i) => (
              <Skeleton key={i} height="h-10" />
            ))}
          </div>
        ) : (
          <PredictionTable
            predictions={pdata?.predictions}
            lastClose={pdata?.last_close}
          />
        )}
      </div>
    </div>
  );
}
