/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Quattrocento', 'serif'],
      },
      colors: {
        'day-bg-start': '#F0F4F8',
        'day-bg-end': '#D9E2EC',
        'day-text-primary': '#1E293B',
        'day-text-secondary': '#475569',
        'day-accent': '#6366F1',
        'day-card-bg': 'rgba(255, 255, 255, 0.65)',
        'day-border': 'rgba(0, 0, 0, 0.08)',
        'night-bg-start': '#0F172A',
        'night-bg-end': '#1E293B',
        'night-text-primary': '#E2E8F0',
        'night-text-secondary': '#94A3B8',
        'night-accent': '#818CF8',
        'night-card-bg': 'rgba(30, 41, 59, 0.65)',
        'night-border': 'rgba(255, 255, 255, 0.1)',
        'sleep-bg-start': '#1A0A00',
        'sleep-bg-end': '#2D1810',
        'sleep-text-primary': '#FFD4B8',
        'sleep-text-secondary': '#C4A68A',
        'sleep-accent': '#FF6B35',
        'sleep-card-bg': 'rgba(45, 24, 16, 0.65)',
        'sleep-border': 'rgba(255, 107, 53, 0.2)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        inhale: {
          'from': { transform: 'scale(0.8)', opacity: '0.7' },
          'to': { transform: 'scale(1.6)', opacity: '1' }
        },
        exhale: {
          'from': { transform: 'scale(1.6)', opacity: '1' },
          'to': { transform: 'scale(0.8)', opacity: '0.7' }
        },
        'box-breathing-path': {
          '0%': { strokeDashoffset: '480' },
          '25%': { strokeDashoffset: '360' },
          '50%': { strokeDashoffset: '240' },
          '75%': { strokeDashoffset: '120' },
          '100%': { strokeDashoffset: '0' }
        },
        'soundwave-1': {
          '0%, 100%': { height: '40%' },
          '50%': { height: '100%' }
        },
        'soundwave-2': {
          '0%, 100%': { height: '70%' },
          '50%': { height: '30%' }
        },
        'soundwave-3': {
          '0%, 100%': { height: '55%' },
          '50%': { height: '85%' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        'inhale-4s': 'inhale 4s linear forwards',
        'inhale-5s': 'inhale 5.5s linear forwards',
        'exhale-8s': 'exhale 8s linear forwards',
        'exhale-4s': 'exhale 4s linear forwards',
        'exhale-5s': 'exhale 5.5s linear forwards',
        'box-breathing-16s': 'box-breathing-path 16s linear infinite',
        'soundwave-1': 'soundwave-1 0.8s ease-in-out infinite',
        'soundwave-2': 'soundwave-2 0.6s ease-in-out infinite',
        'soundwave-3': 'soundwave-3 0.9s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite'
      }
    }
  },
  plugins: [],
}
