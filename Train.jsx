// frontend/src/pages/Train.jsx
import { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useJobSocket } from '../hooks/useSocket';
import { TickerSearch } from '../components/TickerSearch';
import MetricsPanel from '../components/MetricsPanel';
import { ProgressBar, Alert, SectionHeader } from '../components/StatCard';
import api from '../services/api';

const EPOCH_OPTIONS  = [25, 50, 100, 150];
const HORIZON_OPTIONS = [1, 3, 7, 14, 30];

function JobStatusBadge({ status }) {
  const map = {
    queued:    { color: 'text-brand-amber',  Icon: Clock,        label: 'Queued'    },
    running:   { color: 'text-brand-cyan',   Icon: Zap,          label: 'Running'   },
    completed: { color: 'text-brand-green',  Icon: CheckCircle,  label: 'Completed' },
    failed:    { color: 'text-brand-red',    Icon: XCircle,      label: 'Failed'    },
  };
  const { color, Icon, label } = map[status] || map.queued;
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${color}`}>
      <Icon size={14} /> {label}
    </span>
  );
}

function ModelCard({ model }) {
  return (
    <div className="card-hover flex items-center justify-between">
      <div>
        <p className="font-mono font-semibold text-text-primary">{model.ticker}</p>
        <p className="text-xs text-text-muted mt-0.5">Horizon: {model.horizon}d · {model.size_mb} MB</p>
      </div>
      <CheckCircle size={16} className="text-brand-green" />
    </div>
  );
}

export default function Train() {
  const { user } = useAuthStore();
  const {
    ticker, horizon, setTicker, setHorizon,
    startTraining, activeJobId, jobStatus, updateJobStatus, isTraining,
  } = useStockStore();

  const [epochs, setEpochs]       = useState(50);
  const [error, setError]         = useState(null);
  const [models, setModels]       = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Live job updates via WebSocket
  useJobSocket(activeJobId, updateJobStatus);

  // Fetch existing trained models on mount
  useEffect(() => {
    async function loadModels() {
      setLoadingModels(true);
      try {
        const { data } = await api.get('/train/models');
        setModels(data.models || []);
      } catch (_) {}
      setLoadingModels(false);
    }
    loadModels();
  }, [jobStatus?.status]); // re-fetch when a job completes

  async function handleStartTraining() {
    if (!user) { setError('You must be signed in to start training.'); return; }
    setError(null);
    try {
      await startTraining(epochs);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start training job');
    }
  }

  const isCompleted = jobStatus?.status === 'completed';
  const isFailed    = jobStatus?.status === 'failed';
  const progress    = jobStatus?.progress ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-purple/10 border border-brand-purple/30
                          flex items-center justify-center">
            <Cpu size={18} className="text-brand-purple" />
          </div>
          Train Custom Model
        </h1>
        <p className="text-sm text-text-secondary mt-2 ml-12">
          Fine-tune the LSTM-Transformer on any ticker's historical data.
          Walk-forward validation · Huber loss · ReduceLROnPlateau
        </p>
      </div>

      {!user && (
        <Alert type="info" message="Sign in to start training. Predictions still work without an account." />
      )}

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Config panel ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-5">
            <SectionHeader title="Training Config" />

            {/* Ticker */}
            <div>
              <label className="stat-label block mb-2">Ticker Symbol</label>
              <TickerSearch onSelect={setTicker} />
              <p className="text-xs text-text-muted mt-1">Current: <span className="font-mono text-brand-cyan">{ticker}</span></p>
            </div>

            {/* Horizon */}
            <div>
              <label className="stat-label block mb-2">Prediction Horizon</label>
              <div className="grid grid-cols-5 gap-1">
                {HORIZON_OPTIONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`py-2 rounded-lg text-xs font-mono transition-all duration-150
                      ${h === horizon
                        ? 'bg-brand-cyan text-bg-primary font-bold'
                        : 'bg-bg-secondary border border-bg-border text-text-muted hover:text-text-primary'
                      }`}
                  >
                    {h}d
                  </button>
                ))}
              </div>
            </div>

            {/* Epochs */}
            <div>
              <label className="stat-label block mb-2">
                Max Epochs <span className="normal-case text-text-muted">(early stop applies)</span>
              </label>
              <div className="grid grid-cols-4 gap-1">
                {EPOCH_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEpochs(e)}
                    className={`py-2 rounded-lg text-xs font-mono transition-all duration-150
                      ${e === epochs
                        ? 'bg-brand-purple text-white font-bold'
                        : 'bg-bg-secondary border border-bg-border text-text-muted hover:text-text-primary'
                      }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture summary */}
            <div className="bg-bg-secondary rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-text-muted font-body uppercase tracking-widest mb-2">Architecture</p>
              {[
                ['Model', 'LSTM-Transformer Hybrid'],
                ['LSTM layers', '2 × BiLSTM (128 → 64 units)'],
                ['Transformer', '2 blocks · 4 heads · dim 64'],
                ['Loss', 'Huber (δ=1.0)'],
                ['Optimizer', 'Adam · lr=5e-4 · clipnorm=1'],
                ['Lookback', '60 days'],
                ['Features', '25+ TA indicators + macro'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-text-muted">{k}</span>
                  <span className="text-text-secondary font-mono">{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStartTraining}
              disabled={isTraining || !user}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isTraining ? (
                <><Zap size={14} className="animate-pulse" /> Training…</>
              ) : (
                <><Play size={14} /> Start Training</>
              )}
            </button>
          </div>
        </div>

        {/* ── Training progress + results ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Progress panel */}
          <div className="card">
            <SectionHeader title="Training Progress" />

            {!activeJobId && !jobStatus ? (
              <div className="text-center py-10 text-text-muted">
                <Cpu size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Configure and start a training job to see live progress.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Status + job ID */}
                <div className="flex items-center justify-between">
                  <JobStatusBadge status={jobStatus?.status || 'queued'} />
                  <span className="text-xs text-text-muted font-mono truncate max-w-[180px]">
                    {activeJobId}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar value={progress} label="Overall Progress" />

                {/* Live log items */}
                <div className="bg-bg-secondary rounded-lg p-4 font-mono text-xs space-y-1.5
                                max-h-40 overflow-y-auto">
                  {progress >= 5  && <p className="text-brand-cyan">✓ Data fetched and engineered</p>}
                  {progress >= 15 && <p className="text-brand-cyan">✓ Walk-forward sequences prepared</p>}
                  {progress >= 25 && <p className="text-brand-cyan">✓ Model architecture compiled</p>}
                  {progress >= 40 && <p className="text-brand-amber">⟳ Training epochs running…</p>}
                  {progress >= 80 && <p className="text-brand-cyan">✓ Training complete — evaluating</p>}
                  {progress >= 90 && <p className="text-brand-cyan">✓ Test set evaluation done</p>}
                  {progress >= 95 && <p className="text-brand-cyan">✓ Model saved to disk</p>}
                  {isCompleted    && <p className="text-brand-green font-bold">✓ Job completed successfully!</p>}
                  {isFailed       && <p className="text-brand-red">✗ {jobStatus?.error || 'Job failed'}</p>}
                  {!isCompleted && !isFailed && progress < 40 && progress >= 25 && (
                    <p className="text-text-muted animate-pulse">Waiting for first epoch…</p>
                  )}
                </div>

                {/* Ticker + config echo */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Ticker',  jobStatus?.ticker  || ticker],
                    ['Horizon', `${jobStatus?.horizon || horizon} days`],
                    ['Epochs',  `${epochs} max`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-bg-secondary rounded-lg p-3 text-center">
                      <p className="stat-label">{k}</p>
                      <p className="text-sm font-mono font-semibold text-text-primary mt-1">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results metrics */}
          {isCompleted && jobStatus?.metrics && (
            <div>
              <SectionHeader
                title="Training Results"
                subtitle="Evaluated on held-out test split — no data leakage"
              />
              <MetricsPanel metrics={jobStatus.metrics} />
              <div className="mt-3">
                <Alert
                  type="success"
                  message={`Model for ${ticker} (horizon ${horizon}d) trained and saved. Switch to Predict page to use it.`}
                />
              </div>
            </div>
          )}

          {/* Existing models */}
          <div>
            <SectionHeader
              title="Saved Models"
              subtitle={loadingModels ? 'Loading…' : `${models.length} model(s) on disk`}
            />
            {models.length === 0 && !loadingModels ? (
              <div className="card text-center py-6 text-text-muted text-sm">
                No trained models yet — start your first training job above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {models.map((m) => <ModelCard key={`${m.ticker}_${m.horizon}`} model={m} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
