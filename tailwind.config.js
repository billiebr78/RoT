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
    // Mobile-first breakpoints. Default (no prefix) = mobile.
    // Use sm:, md:, lg: for larger screens.
    screens: {
      'xs': '360px',   // very small phones (iPhone SE 1st gen)
      'sm': '640px',   // large phones / small tablets (portrait)
      'md': '768px',   // tablets (portrait)
      'lg': '1024px',  // tablets (landscape) / small desktop
      'xl': '1280px',  // desktop
      '2xl': '1536px', // large desktop
    },
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
      },
      // Spacing utilities for safe areas (notch, home indicator).
      // Usage: pb-safe, pt-safe, etc.
      padding: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
    }
  },
  plugins: [],
}
