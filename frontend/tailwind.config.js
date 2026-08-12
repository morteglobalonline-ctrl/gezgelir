/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        gg: {
          green: "#00C27A",
          "green-600": "#00A869",
          "green-700": "#008A57",
          charcoal: "#1A1F23",
          "charcoal-2": "#242A2F",
          gold: "#FFC14D",
          "gold-600": "#F0A92E",
          mint: "#E6F7F0",
          "mint-2": "#D5F0E4",
          canvas: "#F5FAF7",
          ink: "#1A1F23",
          "ink-2": "#5B6670",
          "ink-3": "#8B95A0",
          line: "#E7EEEA",
        },
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
        800: "800",
      },
      borderRadius: {
        xl: "18px",
        "2xl": "24px",
        "3xl": "30px",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(26,31,35,0.04), 0 8px 24px rgba(26,31,35,0.05)",
        card: "0 1px 2px rgba(26,31,35,0.04), 0 12px 30px rgba(26,31,35,0.06)",
        float: "0 10px 40px rgba(0,194,122,0.22)",
        dark: "0 18px 50px rgba(26,31,35,0.35)",
        nav: "0 -6px 24px rgba(26,31,35,0.06)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
