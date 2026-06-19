/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        omnicord: {
          bg: "#050505",
          neon: "#deff9a",
          cyan: "#06b6d4",
          glass: "rgba(255, 255, 255, 0.03)",
          glassBorder: "rgba(255, 255, 255, 0.08)",
          card: "rgba(20, 20, 20, 0.6)",
        }
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
