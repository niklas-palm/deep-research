import type { PresentationDef } from 'unfold-ai'
import { slides } from './slides'

// Scandinavian palette aligned with the main app (warm neutrals + teal accent).
export const presentation: PresentationDef = {
  title: 'How Deep Research Works',
  theme: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',

    bgPage: '#f7f4ee',
    bgSurface: '#fdfbf6',
    bgMuted: '#eeebe3',

    text: '#1f232b',
    textBody: '#3a3f49',
    textMuted: '#6b7280',
    textLight: '#8a8f99',
    textFaint: '#a7abb3',

    borderLight: '#e4ded2',
    borderMedium: '#cbc4b3',
    borderDefault: '#c8c1af',

    colors: {
      sea:   { bg: '#e3eef3', border: '#2d7d9a', text: '#1b4d63' },
      sage:  { bg: '#e5ede3', border: '#7a9e7e', text: '#3c5a44' },
      warm:  { bg: '#f5e8d8', border: '#c4956a', text: '#6e4a22' },
      mist:  { bg: '#e1ebe8', border: '#5f8a85', text: '#2f504d' },
      sand:  { bg: '#f0e7d2', border: '#b09060', text: '#5a431c' },
      slate: { bg: '#e3e5ea', border: '#6b7280', text: '#2b303a' },
      sky:   { bg: '#dde7ee', border: '#577b91', text: '#27425a' },
      blush: { bg: '#f0dcd8', border: '#b4766e', text: '#663028' },
      clay:  { bg: '#efd3ca', border: '#c05050', text: '#6b2020' },
      stone: { bg: '#e8e4dc', border: '#9c9486', text: '#3c3830' },
      default: { bg: '#fdfbf6', border: '#cbc4b3', text: '#1f232b' },
    },
  },
  slides,
}
