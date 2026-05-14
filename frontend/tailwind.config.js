/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f8fc',
          100: '#ecedf4',
          200: '#d4d9e8',
          300: '#b2b9d3',
          400: '#8a92b7',
          500: '#646e9c',
          600: '#3e4670',
          700: '#2c3358',
          800: '#1f2542',
          900: '#13182f',
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
