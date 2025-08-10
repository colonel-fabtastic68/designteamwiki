/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        '49ers-red': '#AA0000',
        '49ers-gold': '#B3995D',
      }
    },
  },
  plugins: [],
} 