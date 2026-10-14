import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme base
        bg: '#f8fafc',
        surface: '#ffffff',
        'surface-2': '#f1f5f9',
        'surface-3': '#e2e8f0',
        border: '#e2e8f0',
        'border-2': '#cbd5e1',

        // Brand — emerald green
        accent: '#059669',
        'accent-light': '#ecfdf5',
        'accent-mid': '#d1fae5',
        'accent-dark': '#047857',
        'accent-glow': 'rgba(5,150,105,0.12)',

        // Navy text
        navy: '#0f172a',
        'navy-2': '#1e293b',
        'navy-3': '#334155',

        // Muted text
        muted: '#64748b',
        'muted-2': '#94a3b8',

        // Risk levels — restrained
        critical: '#dc2626',
        'critical-bg': '#fef2f2',
        'critical-border': '#fecaca',
        high: '#d97706',
        'high-bg': '#fffbeb',
        'high-border': '#fde68a',
        medium: '#ca8a04',
        'medium-bg': '#fefce8',
        'medium-border': '#fef08a',
        low: '#16a34a',
        'low-bg': '#f0fdf4',
        'low-border': '#bbf7d0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 16px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.10)',
        glow: '0 0 0 3px rgba(5,150,105,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 2.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
