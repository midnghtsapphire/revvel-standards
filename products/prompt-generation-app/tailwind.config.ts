import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        signal: '#0f766e',
        ember: '#b45309',
        night: '#020617',
      },
    },
  },
  plugins: [],
};

export default config;
