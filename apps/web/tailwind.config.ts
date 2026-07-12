import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ============================================================
      // CSS Variable-based Theme Colors
      // Light mode (:root) ↔ Dark mode (.dark)
      // ============================================================
      colors: {
        // Brand & Accent
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-pressed': 'var(--color-primary-pressed)',
        'blue-60': 'var(--color-blue-60)',
        'blue-80': 'var(--color-blue-80)',

        // Surfaces
        canvas: 'var(--color-canvas)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        hairline: 'var(--color-hairline)',
        'hairline-strong': 'var(--color-hairline-strong)',

        // Text (Ink)
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        'ink-subtle': 'var(--color-ink-subtle)',

        // Inverse (Dark backgrounds)
        'inverse-canvas': 'var(--color-inverse-canvas)',
        'inverse-surface-1': 'var(--color-inverse-surface-1)',
        'inverse-ink': 'var(--color-inverse-ink)',
        'inverse-ink-muted': 'var(--color-inverse-ink-muted)',

        // Semantic
        'semantic-success': 'var(--color-semantic-success)',
        'semantic-warning': 'var(--color-semantic-warning)',
        'semantic-error': 'var(--color-semantic-error)',
        'semantic-info': 'var(--color-semantic-info)',

        // On-primary text
        'on-primary': 'var(--color-on-primary)',
      },

      // ============================================================
      // IBM Plex Sans Typography
      // ============================================================
      fontFamily: {
        sans: ['IBM Plex Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['76px', { lineHeight: '1.17', letterSpacing: '-0.5px', fontWeight: '300' }],
        'display-lg': ['60px', { lineHeight: '1.17', letterSpacing: '-0.4px', fontWeight: '300' }],
        'display-md': ['42px', { lineHeight: '1.20', letterSpacing: '0', fontWeight: '300' }],
        headline: ['32px', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '400' }],
        'card-title': ['24px', { lineHeight: '1.33', letterSpacing: '0', fontWeight: '400' }],
        subhead: ['20px', { lineHeight: '1.40', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.50', letterSpacing: '0', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.50', letterSpacing: '0.16px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '400' }],
        'body-emphasis': ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.33', letterSpacing: '0.32px', fontWeight: '400' }],
        button: ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '400' }],
        eyebrow: ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '400' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
      },

      // ============================================================
      // Spacing (4px base grid)
      // ============================================================
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        section: '96px',
      },

      // ============================================================
      // Border Radius (Carbon flat-square aesthetic)
      // ============================================================
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        pill: '9999px',
        full: '9999px',
      },

      // ============================================================
      // Max Width Container
      // ============================================================
      maxWidth: {
        container: '1584px',
      },
    },
  },
  plugins: [],
};

export default config;
