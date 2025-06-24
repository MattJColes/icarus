/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        helios: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#5D2E46',
        },
        maroon: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#f8d0e7',
          300: '#f2a9d1',
          400: '#e875af',
          500: '#d8488a',
          600: '#bd2e67',
          700: '#9d1f4e',
          800: '#831843',
          900: '#6f163a',
          950: '#5D2E46',
        },
        purple: {
          50: '#f6f3f9',
          100: '#ede9f3',
          200: '#ddd6e9',
          300: '#c5b5d9',
          400: '#a88dc4',
          500: '#906dac',
          600: '#7B3F61',
          700: '#6b3382',
          800: '#5a2c6b',
          900: '#4b2759',
          950: '#2f1738',
        },
      },
      backgroundImage: {
        'helios-gradient': 'linear-gradient(135deg, #5D2E46 0%, #7B3F61 100%)',
        'helios-gradient-radial': 'radial-gradient(circle at top left, #5D2E46, #7B3F61)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { 
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}