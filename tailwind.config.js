// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0d14',
          secondary: '#0f1420',
          card: '#131929',
          hover: '#1a2236',
          border: '#1e2d45',
        },
        brand: {
          cyan: '#00d4ff',
          green: '#00ff88',
          red: '#ff3d6b',
          amber: '#ffb547',
          purple: '#a855f7',
        },
        text: {
          primary: '#e8f0fe',
          secondary: '#8899bb',
          muted: '#4a5a7a',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(30, 45, 69, 0.4) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(30, 45, 69, 0.4) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
    },
  },
  plugins: [],
};
