/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          dark: '#0a0d14',
          panel: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          card: 'rgba(30, 41, 59, 0.7)',
          accent: '#10b981',
          accentGlow: '#059669',
          green: '#22c55e',
          gold: '#eab308',
          diamond: '#38bdf8',
          redstone: '#ef4444',
          amethyst: '#a855f7',
        }
      },
      fontFamily: {
        minecraft: ['"Minecraft"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(34, 197, 94, 0.5)',
        'glow-diamond': '0 0 25px -5px rgba(56, 189, 248, 0.5)',
        'glow-amethyst': '0 0 25px -5px rgba(168, 85, 247, 0.5)',
        'glow-gold': '0 0 25px -5px rgba(234, 179, 8, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
