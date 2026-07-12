import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================================
      // IBM Carbon Design System Colors
      // ============================================================
      colors: {
        // Brand & Accent
        primary: '#0f62fe',
        'primary-hover': '#0050e6',
        'primary-pressed': '#002d9c',
        'blue-60': '#0043ce',
        'blue-80': '#002d9c',

        // Surfaces
        canvas: '#ffffff',
        'surface-1': '#f4f4f4',
        'surface-2': '#e0e0e0',
        hairline: '#e0e0e0',
        'hairline-strong': '#161616',

        // Text (Ink)
        ink: '#161616',
        'ink-muted': '#525252',
        'ink-subtle': '#8c8c8c',

        // Inverse (Dark backgrounds)
        'inverse-canvas': '#161616',
        'inverse-surface-1': '#262626',
        'inverse-ink': '#ffffff',
        'inverse-ink-muted': '#c6c6c6',

        // Semantic
        'semantic-success': '#24a148',
        'semantic-warning': '#f1c21b',
        'semantic-error': '#da1e28',
        'semantic-info': '#0f62fe',

        // On-primary text
        'on-primary': '#ffffff',
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
