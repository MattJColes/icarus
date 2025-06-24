export const colors = {
  primary: {
    DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
    foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
  },
  secondary: {
    DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
    foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
  },
  accent: {
    DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
    foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
  },
  background: 'rgb(var(--color-background) / <alpha-value>)',
  foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
  muted: {
    DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
    foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
  },
  border: 'rgb(var(--color-border) / <alpha-value>)',
  ring: 'rgb(var(--color-ring) / <alpha-value>)',
} as const;

export const heliosTheme = {
  maroon: '#5D2E46',
  purple: '#7B3F61',
  gradient: 'linear-gradient(135deg, #5D2E46 0%, #7B3F61 100%)',
} as const;