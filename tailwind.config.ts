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
        background: '#f7f5ee',
        foreground: '#1f2a2b',
        card: {
          DEFAULT: '#fffdf8',
          foreground: '#1f2a2b',
        },
        primary: {
          DEFAULT: '#0f766e',
          foreground: '#f7fffb',
        },
        secondary: {
          DEFAULT: '#e9f2ea',
          foreground: '#25413f',
        },
        muted: {
          DEFAULT: '#eef1e7',
          foreground: '#556968',
        },
        border: '#d7dfd3',
      },
      boxShadow: {
        soft: '0 16px 36px -22px rgba(19, 63, 59, 0.34)',
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
