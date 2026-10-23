// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mk-comics.vercel.app',
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  adapter: vercel(),
  build: { inlineStylesheets: 'always' },
  markdown: { shikiConfig: { theme: 'github-light-high-contrast' } },
  redirects: {
    '/comic': '/',
    // Short links for bios and posts: GA4 reads the UTM tags, so each click shows up as linkedin / social
    '/li': { status: 302, destination: '/?utm_source=linkedin&utm_medium=social&utm_campaign=profile' },
    '/li-post': { status: 302, destination: '/?utm_source=linkedin&utm_medium=social&utm_campaign=post' },
  },
  integrations: [icon(), sitemap({ changefreq: 'monthly', priority: 1, lastmod: new Date() })],
  fonts: [
    { provider: fontProviders.fontsource(), name: 'Bangers', cssVariable: '--font-bangers', weights: [400], subsets: ['latin'], fallbacks: ['Impact', 'sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Patrick Hand', cssVariable: '--font-patrick', weights: [400], subsets: ['latin'], fallbacks: ['Arial', 'sans-serif'] },
  ],
});
