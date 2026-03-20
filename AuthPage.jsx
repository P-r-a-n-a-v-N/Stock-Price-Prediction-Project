// frontend/src/pages/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const navigate                = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    let ok;
    if (mode === 'login') {
      ok = await login(email, password);
    } else {
      ok = await register(name, email, password);
    }
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-pattern bg-grid
                    flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40
                          flex items-center justify-center glow-cyan">
            <Activity size={20} className="text-brand-cyan" />
          </div>
          <span className="text-xl font-display font-bold text-text-primary">StockPredictor TF</span>
        </div>

        <div className="card border-bg-border">
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-bg-secondary border border-bg-border p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); }}
                className={`flex-1 py-2 rounded-md text-sm font-display transition-all duration-150
                  ${mode === m
                    ? 'bg-brand-cyan text-bg-primary font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="stat-label block mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="input"
                />
              </div>
            )}

            <div>
              <label className="stat-label block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>

            <div>
              <label className="stat-label block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 6 characters' : 'Password'}
                  required
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-brand-red bg-brand-red/10 border border-brand-red/20
                              rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-2"
            >
              {isLoading
                ? 'Loading…'
                : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-5">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
              className="text-brand-cyan hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>

          <p className="text-center text-xs text-text-muted mt-3">
            Predictions work without an account — auth only required for training & watchlist.
          </p>
        </div>
      </div>
    </div>
  );
}
