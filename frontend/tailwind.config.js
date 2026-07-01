/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B4C9A',
          dark: '#4A306A',
          light: '#F0EBF5',
        },
        accent: {
          pink: '#D45B8B',
          amber: '#C88B35',
          teal: '#008B8B',
        },
      },
    },
  },
  plugins: [],
};