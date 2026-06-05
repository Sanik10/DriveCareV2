// path: apps/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Поддержка темной темы по классу (standard для Next.js + next-themes)
  darkMode: 'class',
  theme: {
    extend: {
      // СТРОГАЯ ШКАЛА ОТСТУПОВ (DriveCare Design System v1.1)
      // Важно: мы ДОБАВЛЯЕМ токены, не ломая стандартную шкалу Tailwind (w-4, h-4 и т.д.)
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
        section: '48px',
      },

      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',

        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',

        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',

        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',

        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',

        'surface-1': 'hsl(var(--surface-1))',
        'surface-2': 'hsl(var(--surface-2))',

        // Системные статусы (DriveCare V1.1)
        'status-active': 'hsl(142 76% 36%)', // Зеленый
        'status-pending': 'hsl(45 93% 47%)', // Желтый
        'status-progress': 'hsl(199 89% 48%)', // Синий
        'status-error': 'hsl(0 84% 60%)', // Красный
        'status-draft': 'hsl(215 16% 47%)', // Серый
      },

      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },

      // Строгие формы - убираем слишком большие скругления
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },

      boxShadow: {
        // Минималистичные тени в стиле Linear/Vercel
        card: '0 1px 2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'dark-card':
          '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 1px 2px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
