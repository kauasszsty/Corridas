/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        v2base: "#080807",
        v2card: "#12120f",
        v2elevated: "#1a1a16",
        v2line: { DEFAULT: "#23231d", soft: "#1a1a16" },
        v2ink: "#edebe4",
        v2muted: "#a89f88",
        v2faint: "#6b6656",
        v2accent: { DEFAULT: "#0d4eb0", soft: "#0a1e3d", text: "#6ea3f0" },
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Oswald"', "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};