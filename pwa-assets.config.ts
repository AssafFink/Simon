import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the install icons and favicon from the single SVG source (run: npm run generate-pwa-assets).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
