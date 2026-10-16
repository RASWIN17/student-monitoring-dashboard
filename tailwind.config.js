/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        sidebar: {
          bg: '#ffffff',
          card: '#f8fafc',
          border: '#e2e8f0',
          text: '#64748b',
          active: '#0f172a',
          hover: '#f1f5f9',
        },
        surface: {
          main: '#ffffff',
          subtle: '#f8fafc',
          section: '#f1f5f9',
          border: '#e2e8f0',
        },
        status: {
          active: '#16a34a',
          inactive: '#64748b',
          unavailable: '#dc2626',
          partial: '#d97706',
          unlinked: '#94a3b8',
          stale: '#ca8a04',
        }
      },
    },
  },
  plugins: [],
};
