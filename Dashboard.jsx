// frontend/src/pages/Dashboard.jsx
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { useTickerSocket } from '../hooks/useSocket';
import { TickerSearch } from '../components/TickerSearch';
import PriceChart from '../components/PriceChart';
import TradingSignals from '../components/TradingSignals';
import WatchlistPanel from '../components/WatchlistPanel';
import { StatCard, CardSkeleton, Alert, SectionHeader } from '../components/StatCard';

const HORIZON_OPTIONS = [1, 3, 7, 14, 30];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    ticker, horizon, predictionData, isLoadingPrediction, predictionError,
    setTicker, setHorizon, fetchPrediction,
  } = useStockStore();

  // Real-time WS updates
  const onPrediction = useCallback((data) => {
    useStockStore.setState({ predictionData: data });
  }, []);
  useTickerSocket(ticker, onPrediction);

  // Fetch on mount and ticker/horizon change
  useEffect(() => {
    fetchPrediction();
  }, [ticker, horizon]);

  function handleTickerChange(t) {
    setTicker(t);
  }

  const pdata = predictionData;
  const lastClose = pdata?.last_close;
  const firstPred = pdata?.predictions?.[0]?.price;
  const change1d  = lastClose && firstPred ? ((firstPred - lastClose) / lastClose) * 100 : null;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Market Overview
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            AI-powered LSTM-Transformer price forecasting
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <TickerSearch onSelect={handleTickerChange} />

          {/* Horizon selector */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-bg-border
                          rounded-lg p-1">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150
                            ${h === horizon
                              ? 'bg-brand-cyan text-bg-primary font-bold'
                              : 'text-text-muted hover:text-text-primary'
                            }`}
              >
                {h}d
              </button>
            ))}
          </div>

          <button
            onClick={fetchPrediction}
            disabled={isLoadingPrediction}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw size={13} className={isLoadingPrediction ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {predictionError && (
        <Alert
          type="error"
          message={predictionError}
          onClose={() => useStockStore.setState({ predictionError: null })}
        />
      )}

      {/* ── Stats row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoadingPrediction ? (
          Array(4).fill(null).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Current Price"
              value={lastClose ? `$${lastClose.toFixed(2)}` : '—'}
              sub={ticker}
            />
            <StatCard
              label="1-Day Prediction"
              value={firstPred ? `$${firstPred.toFixed(2)}` : '—'}
              trend={change1d}
            />
            <StatCard
              label={`${horizon}-Day Target`}
              value={pdata?.predictions?.at(-1)?.price
                ? `$${pdata.predictions.at(-1).price.toFixed(2)}` : '—'}
              trend={
                lastClose && pdata?.predictions?.at(-1)?.price
                  ? ((pdata.predictions.at(-1).price - lastClose) / lastClose) * 100
                  : undefined
              }
            />
            <StatCard
              label="Model Status"
              value={pdata?.model_trained ? 'Trained' : 'Default'}
              sub={pdata?.model_trained ? 'Custom weights' : 'Train for accuracy'}
            />
          </>
        )}
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* Chart + Signals — 3/4 width */}
        <div className="xl:col-span-3 space-y-5">
          {/* Price Chart */}
          <div className="card">
            <SectionHeader
              title={`${ticker} Price Chart`}
              subtitle={`${pdata?.history?.length ?? 0} days history · ${horizon}-day forecast`}
              action={
                <button
                  onClick={() => navigate('/predict')}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                >
                  Full Analysis <ArrowRight size={12} />
                </button>
              }
            />
            {isLoadingPrediction ? (
              <div className="skeleton h-80 w-full rounded-lg" />
            ) : (
              <PriceChart predictionData={pdata} height={300} />
            )}
          </div>

          {/* Trading signal */}
          <div>
            <SectionHeader title="Trading Signal" subtitle="Rule-based signal derived from model output" />
            {isLoadingPrediction ? (
              <div className="skeleton h-36 w-full rounded-xl" />
            ) : (
              <TradingSignals predictionData={pdata} />
            )}
          </div>
        </div>

        {/* Sidebar — 1/4 width */}
        <div className="xl:col-span-1 space-y-4">
          <WatchlistPanel onSelectTicker={handleTickerChange} />

          {/* Quick nav cards */}
          <div className="card hover:border-brand-cyan/30 transition-colors cursor-pointer"
               onClick={() => navigate('/predict')}>
            <p className="text-xs text-text-muted mb-1">Deep Analysis</p>
            <p className="text-sm font-display font-semibold text-text-primary">Prediction Page</p>
            <p className="text-xs text-text-muted mt-1">Metrics, confidence bands, full chart</p>
          </div>

          <div className="card hover:border-brand-purple/30 transition-colors cursor-pointer"
               onClick={() => navigate('/train')}>
            <p className="text-xs text-text-muted mb-1">Improve Accuracy</p>
            <p className="text-sm font-display font-semibold text-text-primary">Train Custom Model</p>
            <p className="text-xs text-text-muted mt-1">Fine-tune on {ticker} historical data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
