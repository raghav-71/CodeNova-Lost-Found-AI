/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4FAF6',
          100: '#E6F7EC',
          200: '#C7EED4',
          300: '#9CE0B2',
          400: '#64CC8B',
          500: '#35B86B', // Primary Green
          600: '#239E55',
          700: '#168A4A', // Dark Green
          800: '#116B3A',
          900: '#0C4E2A',
          950: '#062B17',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          bg: '#F7FBF8',
          soft: '#EEF8F1',
          light: '#E6F7EC',
          border: '#E3ECE6',
          card: '#FFFFFF',
        },
        content: {
          title: '#102018',
          body: '#2D3D34',
          muted: '#66756C',
          subtle: '#94A39B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '3d-subtle': '0 4px 14px -2px rgba(22, 138, 74, 0.06), 0 2px 6px -1px rgba(16, 32, 24, 0.03)',
        '3d-card': '0 10px 28px -4px rgba(22, 138, 74, 0.08), 0 4px 10px -2px rgba(16, 32, 24, 0.04), 0 1px 2px 0 rgba(16, 32, 24, 0.02)',
        '3d-card-hover': '0 20px 40px -8px rgba(22, 138, 74, 0.14), 0 8px 18px -4px rgba(16, 32, 24, 0.06), 0 2px 4px 0 rgba(16, 32, 24, 0.02)',
        '3d-float': '0 24px 48px -12px rgba(22, 138, 74, 0.16), 0 12px 24px -6px rgba(16, 32, 24, 0.06)',
        '3d-green-btn': '0 8px 20px -4px rgba(53, 184, 107, 0.35), 0 2px 6px -1px rgba(53, 184, 107, 0.2)',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-reverse': 'float-rev 5s ease-in-out infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(0.5deg)' },
        },
        'float-rev': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(8px) rotate(-0.5deg)' },
        }
      }
    },
  },
  plugins: [],
}
