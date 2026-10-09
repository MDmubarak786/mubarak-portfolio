// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mk-full-stack-developer.vercel.app',
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  adapter: vercel(),
  integrations: [icon(), sitemap()],
  fonts: [
    { provider: fontProviders.fontsource(), name: 'Bricolage Grotesque', cssVariable: '--font-display', weights: [400, 500, 600, 700, 800], styles: ['normal'], subsets: ['latin'], fallbacks: ['Arial Narrow', 'sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Geist', cssVariable: '--font-text', weights: [400, 500, 600], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Geist Mono', cssVariable: '--font-mono', weights: [400, 500], styles: ['normal'], subsets: ['latin'], fallbacks: ['ui-monospace', 'monospace'] },
    { provider: fontProviders.fontsource(), name: 'Noto Sans Tamil', cssVariable: '--font-tamil', weights: [500, 700], styles: ['normal'], subsets: ['tamil'], fallbacks: ['sans-serif'] },
    // ---- story-variant round fonts (local review only) ----
    { provider: fontProviders.fontsource(), name: 'Barlow', cssVariable: '--font-barlow', weights: [400, 600, 800], subsets: ['latin'], fallbacks: ['sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Bangers', cssVariable: '--font-bangers', weights: [400], subsets: ['latin'], fallbacks: ['Impact', 'sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Patrick Hand', cssVariable: '--font-patrick', weights: [400], subsets: ['latin'], fallbacks: ['cursive'] },
    { provider: fontProviders.fontsource(), name: 'Teko', cssVariable: '--font-teko', weights: [500, 700], subsets: ['latin'], fallbacks: ['sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Caveat', cssVariable: '--font-caveat', weights: [500, 700], subsets: ['latin'], fallbacks: ['cursive'] },
    { provider: fontProviders.fontsource(), name: 'Special Elite', cssVariable: '--font-elite', weights: [400], subsets: ['latin'], fallbacks: ['monospace'] },
    { provider: fontProviders.fontsource(), name: 'Chakra Petch', cssVariable: '--font-chakra', weights: [500, 700], subsets: ['latin'], fallbacks: ['sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Baloo Thambi 2', cssVariable: '--font-baloo', weights: [500, 700, 800], subsets: ['latin', 'tamil'], fallbacks: ['sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Mukta Malar', cssVariable: '--font-mukta', weights: [400, 600], subsets: ['latin', 'tamil'], fallbacks: ['sans-serif'] },
    // ---- dream-world round (variants 11–16) ----
    { provider: fontProviders.fontsource(), name: 'Bodoni Moda', cssVariable: '--font-bodoni', weights: [400, 500], styles: ['normal', 'italic'], subsets: ['latin'], fallbacks: ['Georgia', 'serif'] },
    { provider: fontProviders.fontsource(), name: 'Hanken Grotesk', cssVariable: '--font-hanken', weights: [300, 400, 500], styles: ['normal'], subsets: ['latin'], fallbacks: ['sans-serif'] },
  ],
});
