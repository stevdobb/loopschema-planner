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
        background: '#0d3f85',
        foreground: '#eaf3ff',
        card: {
          DEFAULT: 'rgba(19, 79, 155, 0.62)',
          foreground: '#eaf3ff',
        },
        primary: {
          DEFAULT: '#4ea0ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'rgba(74, 138, 221, 0.26)',
          foreground: '#d9ecff',
        },
        muted: {
          DEFAULT: 'rgba(126, 184, 255, 0.16)',
          foreground: '#c7e1ff',
        },
        border: 'rgba(141, 192, 255, 0.35)',
      },
      boxShadow: {
        soft: '0 18px 38px -26px rgba(6, 21, 46, 0.58)',
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
