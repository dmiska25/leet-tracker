/** @type {import('tailwindcss').Config} */
const animate = require('tailwindcss-animate');

/**
 * Helper that returns an hsl() colour using the given CSS custom property
 * and supports Tailwind’s dynamic <alpha-value> placeholder.
 */
const withOpacity = (variable) => `hsl(var(--${variable}) / <alpha-value>)`;

module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /* ---------- Design‑system colours wired to CSS variables ---------- */
      colors: {
        /* Base palette */
        background: withOpacity('background'),
        foreground: withOpacity('foreground'),

        border: withOpacity('border'),
        input: withOpacity('input'),
        ring: withOpacity('ring'),

        card: withOpacity('card'),
        'card-foreground': withOpacity('card-foreground'),
        popover: withOpacity('popover'),
        'popover-foreground': withOpacity('popover-foreground'),

        muted: withOpacity('muted'),
        'muted-foreground': withOpacity('muted-foreground'),

        accent: withOpacity('accent'),
        'accent-foreground': withOpacity('accent-foreground'),

        destructive: withOpacity('destructive'),
        'destructive-foreground': withOpacity('destructive-foreground'),

        primary: {
          DEFAULT: withOpacity('primary'),
          foreground: withOpacity('primary-foreground'),
        },
        secondary: {
          DEFAULT: withOpacity('secondary'),
          foreground: withOpacity('secondary-foreground'),
        },

        /* ---------- Static LeetCode colour palette ---------- */
        leetcode: {
          orange: '#ffa116',
          easy: '#00b8a3',
          medium: '#ffc01e',
          hard: '#ff375f',
          dark: '#0a0a0a',
          gray: '#2d2d2d',
          lightGray: '#3e3e3e',
        },
      },

      /* Border‑radius scale driven by CSS variable */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /* Keyframes/animations copied from earlier config */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
