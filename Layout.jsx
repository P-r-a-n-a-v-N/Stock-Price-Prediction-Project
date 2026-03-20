// frontend/src/components/Layout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Cpu, Star, LogOut,
  LogIn, Menu, X, Activity,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/predict', icon: TrendingUp, label: 'Predict' },
  { to: '/train', icon: Cpu, label: 'Train Model' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } flex-shrink-0 flex flex-col bg-bg-secondary border-r border-bg-border
          transition-all duration-300 ease-in-out z-20`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-bg-border min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40
                          flex items-center justify-center flex-shrink-0 glow-cyan">
            <Activity size={16} className="text-brand-cyan" />
          </div>
          {sidebarOpen && (
            <span className="font-display font-bold text-text-primary text-sm tracking-wide
                             animate-fade-in whitespace-nowrap">
              StockPredictor
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body
                 transition-all duration-200 group
                 ${isActive
                   ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20'
                   : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                 }`
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="animate-fade-in whitespace-nowrap">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-bg-border space-y-1">
          {user ? (
            <>
              {sidebarOpen && (
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                  <p className="text-xs font-medium text-text-secondary truncate">{user.name}</p>
                </div>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                           text-sm text-text-secondary hover:text-brand-red hover:bg-brand-red/5
                           transition-all duration-200"
              >
                <LogOut size={16} className="flex-shrink-0" />
                {sidebarOpen && <span>Sign Out</span>}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                         text-sm text-text-secondary hover:text-brand-cyan hover:bg-brand-cyan/5
                         transition-all duration-200"
            >
              <LogIn size={16} className="flex-shrink-0" />
              {sidebarOpen && <span>Sign In</span>}
            </button>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-full flex items-center justify-center py-2 rounded-lg
                       text-text-muted hover:text-text-primary hover:bg-bg-hover
                       transition-all duration-200"
          >
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-bg-primary bg-grid-pattern bg-grid">
        <div className="max-w-7xl mx-auto p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
