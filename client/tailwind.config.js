/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a6b3a",
          dark: "#134e2a",
          light: "#238c4d",
        },
        accent: "#f4a261",
        emergency: {
          DEFAULT: "#e63946",
          light: "#ffe8e8",
        },
        prompt: {
          DEFAULT: "#e67e22",
          light: "#fff3e0",
        },
        general: {
          DEFAULT: "#2e7d32",
          light: "#e8f5e9",
        },
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.85, transform: "scale(1.02)" },
        },
      },
      animation: {
        "pulse-red": "pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
