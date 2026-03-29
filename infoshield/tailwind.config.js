/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00d4ff',
          50:  '#e0faff',
          100: '#b3f2ff',
          200: '#66e6ff',
          300: '#33d9ff',
          400: '#00ccff',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#007a99',
          800: '#004d66',
          900: '#002233',
        },
        accent: {
          purple: '#7c3aed',
          pink:   '#ec4899',
          green:  '#10b981',
          orange: '#f59e0b',
          red:    '#ef4444',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          border:  'rgba(255,255,255,0.12)',
          strong:  'rgba(255,255,255,0.10)',
        },
        dark: {
          DEFAULT: '#050b18',
          100: '#0a1628',
          200: '#0d1f3c',
          300: '#112448',
          400: '#172c55',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'slide-in-up':  'slideInUp 0.5s ease-out',
        'fade-in':      'fadeIn 0.6s ease-out',
        'scan':         'scan 2s linear infinite',
        'gradient-x':   'gradientX 4s ease infinite',
        'spin-slow':    'spin 8s linear infinite',
        'ping-slow':    'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(0, 212, 255, 0.7), 0 0 80px rgba(0, 212, 255, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'cyber-grid':   'linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)',
        'glow-radial':  'radial-gradient(ellipse at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid-50': '50px 50px',
      },
      boxShadow: {
        'glow':      '0 0 20px rgba(0, 212, 255, 0.25)',
        'glow-lg':   '0 0 40px rgba(0, 212, 255, 0.35), 0 0 80px rgba(0, 212, 255, 0.15)',
        'glow-red':  '0 0 20px rgba(239, 68, 68, 0.4)',
        'glow-green':'0 0 20px rgba(16, 185, 129, 0.4)',
        'glass':     '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glass-lg':  '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
};
