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
      screens: {
        'xs': '420px',
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        sidebar: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#94a3b8',
          active: '#ffffff',
          hover: '#1e293b',
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
