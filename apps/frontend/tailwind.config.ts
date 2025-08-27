// path: apps/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          page: 'hsl(var(--bg-page))',
          elev1: 'hsl(var(--bg-elev-1))',
          elev2: 'hsl(var(--bg-elev-2))',
        },
        fg: {
          primary: 'hsl(var(--fg-primary))',
          secondary: 'hsl(var(--fg-secondary))',
          invert: 'hsl(var(--fg-invert))',
        },
        primary: { 500: 'hsl(var(--color-primary-500))', 600: 'hsl(var(--color-primary-600))' },
        accent: { 500: 'hsl(var(--color-accent-500))', 600: 'hsl(var(--color-accent-600))' },
        success: 'hsl(var(--color-success))',
        warning: 'hsl(var(--color-warning))',
        danger: 'hsl(var(--color-danger))',
        info: 'hsl(var(--color-info))',
        cloud: 'hsl(var(--color-cloud))',
        smoke: 'hsl(var(--color-smoke))',
        focus: 'hsl(var(--focus))',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        'ease-out': 'var(--ease-out)',
        'ease-in': 'var(--ease-in)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
};

export default config;
