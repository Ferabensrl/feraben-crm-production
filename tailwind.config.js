/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#A58A73',
          DEFAULT: '#8F6A50', // Marrón MARÉ
          dark: '#7A5A43',
        },
        secondary: {
          DEFAULT: '#F5F0EB', // Nude suave
        }
      }
    },
  },
  plugins: [],
}