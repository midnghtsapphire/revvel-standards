import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pplx: {
          50: "#f0f7ff",
          100: "#e0effe",
          500: "#20808d",
          600: "#1a6b76",
          700: "#14555e",
          900: "#0b2f35",
        },
      },
    },
  },
  plugins: [],
};

export default config;
