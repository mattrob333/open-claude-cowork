import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f0f0f',
        panel: '#141414',
        card: '#1c1c1c',
        border: 'rgba(255,255,255,0.06)',
        primaryText: '#f5f5f5',
        secondaryText: '#888888',
        accent: '#D97757',
        hover: 'rgba(255,255,255,0.04)'
      }
    }
  },
  plugins: []
} satisfies Config
