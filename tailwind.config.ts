import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      colors: {
        background: '#f3f4f6',
        foreground: '#1f2937',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },
        primary: {
          DEFAULT: '#374151',
          foreground: '#f9fafb',
        },
        secondary: {
          DEFAULT: '#e5e7eb',
          foreground: '#374151',
        },
        muted: {
          DEFAULT: '#eceff3',
          foreground: '#6b7280',
        },
        border: '#d1d5db',
      },
      boxShadow: {
        soft: '0 14px 34px -24px rgba(31, 41, 55, 0.34)',
      },
      fontFamily: {
        sans: ['"Manrope"', '"Segoe UI"', 'sans-serif'],
        display: ['"Sora"', '"Manrope"', '"Segoe UI"', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.45s ease forwards',
      },
    },
  },
  plugins: [],
} satisfies Config
