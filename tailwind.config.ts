import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme base
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--color-surface-3) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-2': 'rgb(var(--color-border-2) / <alpha-value>)',

        // Brand — emerald green
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-light': 'rgb(var(--color-accent-light) / <alpha-value>)',
        'accent-mid': 'rgb(var(--color-accent-mid) / <alpha-value>)',
        'accent-dark': 'rgb(var(--color-accent-dark) / <alpha-value>)',
        'accent-glow': 'rgb(var(--color-accent) / 0.12)',

        // Navy text
        navy: 'rgb(var(--color-navy) / <alpha-value>)',
        'navy-2': 'rgb(var(--color-navy-2) / <alpha-value>)',
        'navy-3': 'rgb(var(--color-navy-3) / <alpha-value>)',

        // Muted text
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--color-muted-2) / <alpha-value>)',

        // Risk levels — restrained
        critical: 'rgb(var(--color-critical) / <alpha-value>)',
        'critical-bg': 'rgb(var(--color-critical-bg) / <alpha-value>)',
        'critical-border': 'rgb(var(--color-critical-border) / <alpha-value>)',
        high: 'rgb(var(--color-high) / <alpha-value>)',
        'high-bg': 'rgb(var(--color-high-bg) / <alpha-value>)',
        'high-border': 'rgb(var(--color-high-border) / <alpha-value>)',
        medium: 'rgb(var(--color-medium) / <alpha-value>)',
        'medium-bg': 'rgb(var(--color-medium-bg) / <alpha-value>)',
        'medium-border': 'rgb(var(--color-medium-border) / <alpha-value>)',
        low: 'rgb(var(--color-low) / <alpha-value>)',
        'low-bg': 'rgb(var(--color-low-bg) / <alpha-value>)',
        'low-border': 'rgb(var(--color-low-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
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
