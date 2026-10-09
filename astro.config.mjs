// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://mk-full-stack-developer.vercel.app',
  vite: { plugins: [tailwindcss()] },
  adapter: vercel(),
  integrations: [icon()],
  fonts: [
    {
      // Display: a Clarendon. The face of 19th-century stamped and filed documents.
      provider: fontProviders.fontsource(),
      name: 'Besley',
      cssVariable: '--font-display',
      weights: [500, 600, 700, 800],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      // Text: a workhorse document serif with optical sizes.
      provider: fontProviders.fontsource(),
      name: 'Source Serif 4',
      cssVariable: '--font-text',
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      // Tamil: his name, set in a serif that sits beside the Latin faces.
      provider: fontProviders.fontsource(),
      name: 'Noto Serif Tamil',
      cssVariable: '--font-tamil',
      weights: [500, 700],
      styles: ['normal'],
      subsets: ['tamil'],
      fallbacks: ['serif'],
    },
    {
      // Mono: identifiers, dates and figures only. Never a costume.
      provider: fontProviders.fontsource(),
      name: 'Source Code Pro',
      cssVariable: '--font-mono',
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
