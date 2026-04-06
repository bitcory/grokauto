/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        content2: 'var(--content2)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        border: 'var(--border)',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        neo: '12px',
        'neo-sm': '8px',
      },
      boxShadow: {
        'neo-sm': '0 1px 3px rgba(30,32,48,0.05), 0 4px 12px rgba(30,32,48,0.06)',
        'neo-md': '0 2px 8px rgba(30,32,48,0.07), 0 8px 24px rgba(30,32,48,0.08)',
        'neo-lg': '0 4px 16px rgba(30,32,48,0.09), 0 16px 40px rgba(30,32,48,0.10)',
        'neo-sm-primary': '0 4px 12px rgba(99,102,241,0.35)',
        'neo-md-primary': '0 6px 18px rgba(99,102,241,0.45)',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'card-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'card-enter': 'card-enter 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'slide-up': 'slide-up 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
