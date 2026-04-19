/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        surface: {
          50:  '#f8f7ff',
          100: '#f0eeff',
          200: '#e4e0ff',
          900: '#0d0b14',
          950: '#07060d',
        },
        accent: {
          DEFAULT: '#7c5cfc',
          hover:   '#6b4bf0',
          light:   '#a78bfa',
          glow:    'rgba(124,92,252,0.35)',
        },
        status: {
          pending: '#f59e0b',
          running: '#3b82f6',
          success: '#10b981',
          failed:  '#ef4444',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.35s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 8px rgba(124,92,252,0.3)' }, '50%': { boxShadow: '0 0 24px rgba(124,92,252,0.6)' } },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237c5cfc' fill-opacity='0.04'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
