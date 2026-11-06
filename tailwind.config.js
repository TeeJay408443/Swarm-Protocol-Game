/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette from the spec
        'slate-carbon': '#0B0F19',
        'cyan-accent': '#00F0FF',
        'hazard-gold': '#FFD700',
        'alert-red': '#FF0055',
      },
    },
  },
  plugins: [],
}
