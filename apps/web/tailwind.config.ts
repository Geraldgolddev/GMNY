import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    // Include the shared UI package so its Tailwind classes are generated.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ring: '#10b981',
      },
    },
  },
  plugins: [],
};

export default config;
