/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0E1A',
          secondary: '#111827',
          tertiary: '#1A2237',
          elevated: '#1E2A3F',
        },
        text: {
          primary: '#F0F2F5',
          secondary: '#8B95A8',
          tertiary: '#4E5A6E',
        },
        accent: {
          primary: '#6366F1',
          teal: '#06B6D4',
          subtle: 'rgba(99,102,241,0.12)',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.14)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shield-glow': 'shieldGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        shieldGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8', filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.4))' },
          '50%': { transform: 'scale(1.04)', opacity: '1', filter: 'drop-shadow(0 0 28px rgba(6,182,212,0.6))' },
        },
      },
    },
  },
  plugins: [],
};
