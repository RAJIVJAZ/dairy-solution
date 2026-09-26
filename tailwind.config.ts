import type { Config } from 'tailwindcss';

/**
 * DairyOS tokens, taken from the "Brand and design system" board.
 * One colour per measured quantity (fat, SNF, cost, loss, balanced), each with
 * a light tint for fills and a darker ink for text on those fills, plus the
 * dark-surface variants used on the ledger cards.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#11201B', 2: '#0F1B17', 3: '#152621', 4: '#182A24', 5: '#1E3A2E', rule: '#24382F' },
        paper: { DEFAULT: '#F6F3EC', 2: '#F1EEE5', 3: '#EBE6D9', 4: '#ECE8DB', track: '#F0EBDD' },
        line: { DEFAULT: '#DAD5C8', strong: '#B9B29F', warm: '#D2CBB9' },
        body: '#3E4F49',
        muted: { DEFAULT: '#56655F', dark: '#9FB2AA', faint: '#7F918A', nav: '#C9D3CE' },
        cloud: '#EDE9DD',
        fat: { DEFAULT: '#C9821A', text: '#8A5A0A', tint: '#FBF0D8', edge: '#EBD6A6', ink: '#5A3D0A', badge: '#7A5210', glow: '#F0B04F' },
        snf: { DEFAULT: '#2A7A73', text: '#1F6660', glow: '#63C6BD' },
        cost: { DEFAULT: '#23446B', tint: '#E3EAF3' },
        loss: { DEFAULT: '#B4432A', tint: '#FBE9E3', edge: '#EBC3B7', ink: '#7A2A17', glow: '#F19A86', dash: '#C4472D' },
        ok: { DEFAULT: '#1F5A38', tint: '#E2F0E8', edge: '#BBD9C7', glow: '#8FE0B0' },
        butter: '#8A7A5A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'var(--font-deva)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        panel: '14px',
        tile: '16px',
      },
      maxWidth: {
        shell: '1440px',
      },
      spacing: {
        gutter: 'clamp(16px, 6.6vw, 96px)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
