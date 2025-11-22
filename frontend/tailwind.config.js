/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          active: '#37373d',
          border: '#3c3c3c',
          text: '#cccccc',
          accent: '#0078d4',
        },
      },
    },
  },
  plugins: [],
}
