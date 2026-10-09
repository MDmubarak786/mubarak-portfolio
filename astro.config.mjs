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
  ],
});
