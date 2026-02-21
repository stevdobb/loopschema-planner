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
        background: '#f4f4f5',
        foreground: '#27272a',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#27272a',
        },
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#e4e4e7',
          foreground: '#3f3f46',
        },
        muted: {
          DEFAULT: '#efeff1',
          foreground: '#71717a',
        },
        border: '#d4d4d8',
      },
      boxShadow: {
        soft: '0 14px 34px -24px rgba(39, 39, 42, 0.28)',
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
