/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0e1626',
          800: '#121c2e',
          700: '#1b283f',
          600: '#26344f',
        },
        emerald: { DEFAULT: '#10b981', soft: '#34d399' },
        cyan: { DEFAULT: '#22d3ee' },
        line: 'rgba(148,163,184,0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(16,185,129,0.25), 0 8px 30px -8px rgba(16,185,129,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -15px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up 0.35s ease-out both' },
    },
  },
  plugins: [],
};
