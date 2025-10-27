/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-strong": "var(--surface-strong)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
        },
        muted: "var(--muted)",
        overlay: "var(--overlay)",
      },
    },
  },
  plugins: [],
  safelist: [
    // Add color classes that are dynamically generated
    "bg-indigo-100",
    "bg-indigo-900",
    "bg-green-100",
    "bg-green-900",
    "bg-blue-100",
    "bg-blue-900",
    "bg-purple-100",
    "bg-purple-900",
    "dark:bg-indigo-900",
    "dark:bg-green-900",
    "dark:bg-blue-900",
    "dark:bg-purple-900",
  ],
};
