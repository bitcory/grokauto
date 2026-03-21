/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
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
        'neo-sm': '2px 2px 0px 0px var(--foreground)',
        'neo-md': '3px 3px 0px 0px var(--foreground)',
        'neo-lg': '4px 4px 0px 0px var(--foreground)',
        'neo-sm-primary': '2px 2px 0px 0px var(--primary)',
        'neo-md-primary': '3px 3px 0px 0px var(--primary)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
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
