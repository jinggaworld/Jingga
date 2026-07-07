import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f62fe',
        'primary-hover': '#0050e6',
        'primary-pressed': '#002d9c',
        ink: '#161616',
        'ink-muted': '#525252',
        'ink-subtle': '#8c8c8c',
        canvas: '#ffffff',
        'surface-1': '#f4f4f4',
        'surface-2': '#e0e0e0',
        hairline: '#e0e0e0',
        'hairline-strong': '#161616',
        'blue-60': '#0043ce',
        'blue-80': '#002d9c',
        'semantic-success': '#24a148',
        'semantic-warning': '#f1c21b',
        'semantic-error': '#da1e28',
        'inverse-canvas': '#161616',
        'inverse-surface-1': '#262626',
        'inverse-ink': '#ffffff',
        'inverse-ink-muted': '#c6c6c6',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['76px', { lineHeight: '1.17', letterSpacing: '-0.5px', fontWeight: '300' }],
        'display-lg': ['60px', { lineHeight: '1.17', letterSpacing: '-0.4px', fontWeight: '300' }],
        'display-md': ['42px', { lineHeight: '1.20', letterSpacing: '0', fontWeight: '300' }],
        'headline': ['32px', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '400' }],
        'card-title': ['24px', { lineHeight: '1.33', letterSpacing: '0', fontWeight: '400' }],
        'subhead': ['20px', { lineHeight: '1.40', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.50', letterSpacing: '0', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.50', letterSpacing: '0.16px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '400' }],
        'body-emphasis': ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '600' }],
        'caption': ['12px', { lineHeight: '1.33', letterSpacing: '0.32px', fontWeight: '400' }],
        'button': ['14px', { lineHeight: '1.29', letterSpacing: '0.16px', fontWeight: '400' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'section': '96px',
      },
      borderRadius: {
        'none': '0px',
        'xs': '2px',
        'sm': '4px',
      },
    },
  },
  plugins: [],
};

export default config;
