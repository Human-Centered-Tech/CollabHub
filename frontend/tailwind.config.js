/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fa',
          100: '#e8eaf2',
          200: '#c8cce0',
          300: '#9ba2c1',
          400: '#6c759a',
          500: '#475080',
          600: '#343c66',
          700: '#262c4d',
          800: '#181d36',
          900: '#0c1024',
          950: '#070918',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
