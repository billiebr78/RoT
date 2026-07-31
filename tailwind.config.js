/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{tsx,ts}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        medieval: {
          900: '#1a1008',
          800: '#2d1b0e',
          700: '#4a2c17',
          600: '#6d4c2d',
          500: '#8f6e45',
          400: '#b39263',
          300: '#d4b985',
          200: '#f0dcae',
          100: '#fcf3da',
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
      }
    }
  },
  plugins: [],
}
