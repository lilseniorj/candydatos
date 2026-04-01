/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef5fc',
          100: '#d5e7f7',
          200: '#aacef0',
          300: '#7ab3e6',
          400: '#5097d8',
          500: '#3D7FC3',
          600: '#3068a3',
          700: '#255080',
          800: '#1a3a5e',
          900: '#0f2540',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
