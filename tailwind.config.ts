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
        background: '#f4f8fd',
        foreground: '#0f2238',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0f2238',
        },
        primary: {
          DEFAULT: '#0f4f99',
          foreground: '#f4f8fd',
        },
        secondary: {
          DEFAULT: '#e5eef9',
          foreground: '#12385f',
        },
        muted: {
          DEFAULT: '#edf3fb',
          foreground: '#4d6783',
        },
        border: '#cfdded',
      },
      boxShadow: {
        soft: '0 12px 34px -18px rgba(15, 79, 153, 0.35)',
      },
      fontFamily: {
        sans: ['"Manrope"', '"Segoe UI"', 'sans-serif'],
        display: ['"Syne"', '"Manrope"', '"Segoe UI"', 'sans-serif'],
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
