/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0df259",
        "background-light": "#f5f8f6",
        "background-dark": "#102216",
        "surface-dark": "#1a3021",
      },
      fontFamily: {
        display: ["Lexend"],
      },
    },
  },
  plugins: [],
}
