// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Astro hashes the scripts it bundles but not <script is:inline> ones (the preloader, the intro, the calendar and the
// analytics loader stay inline because they must run before first paint). Their text is emitted verbatim, so hash it
// straight from the source. They take no define:vars: values travel on data-* attributes, keeping the text constant.
const sha = (text) => 'sha256-' + createHash('sha256').update(text).digest('base64');
const astroFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'content' ? [] : astroFiles(join(dir, e.name))) : e.name.endsWith('.astro') ? [join(dir, e.name)] : []);
const inlineScriptHashes = [...new Set(astroFiles('src').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<script is:inline(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => sha(m[1]))))];

// Fails the build if any page ships an inline script its CSP does not allow, so an edit can never silently switch off
// a script in production.
const cspGuard = {
  name: 'csp-guard',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const root = fileURLToPath(dir), html = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? html(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : []);
      // With the adapter's staticHeaders the policy ships as a per-route HTTP header in .vercel/output/config.json
      // instead of a <meta>; read whichever this build produced.
      let headers = {};
      try { headers = Object.fromEntries(JSON.parse(readFileSync('.vercel/output/config.json', 'utf8')).routes.filter((r) => r.headers?.['content-security-policy']).map((r) => [r.src, r.headers['content-security-policy']])); } catch {}
      const bad = [];
      for (const f of html(root)) {
        const page = readFileSync(f, 'utf8');
        const route = '/' + f.slice(root.length).replace(/^\//, '').replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
        const csp = page.match(/<meta http-equiv="content-security-policy" content="([^"]+)"/)?.[1] ?? headers[route] ?? '';
        if (!csp) { bad.push(`${route}: no CSP found`); continue; }
        for (const [, attrs, body] of page.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
          if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
          if (!csp.includes(sha(body))) bad.push(`${f.slice(root.length)}: ${body.trim().slice(0, 60)}`);
        }
      }
      const pages = html(root).length;
      if (!pages) throw new Error('csp-guard found no HTML to check in ' + root);
      if (bad.length) throw new Error(`CSP would block ${bad.length} inline script(s):\n` + bad.slice(0, 10).join('\n'));
      logger.info(`every inline script on ${pages} pages is allowed by its CSP`);
      // The adapter writes each page's CSP route as an exact path ("/blog/post"), but pages are linked and served with a
      // trailing slash, which then got no policy. Vercel route srcs are regexes, so accept an optional slash.
      try {
        const file = '.vercel/output/config.json', cfg = JSON.parse(readFileSync(file, 'utf8'));
        let n = 0;
        for (const r of cfg.routes) if (r.headers?.['content-security-policy'] && r.src !== '/' && !r.src.endsWith('/?')) { r.src += '/?'; n++; }
        writeFileSync(file, JSON.stringify(cfg, null, 2));
        logger.info(`CSP header routes now match with or without a trailing slash (${n})`);
      } catch (e) { if (Object.keys(headers).length) throw e; }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://mk-comics.vercel.app',
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  adapter: vercel({ staticHeaders: true }),
  // Content-Security-Policy: Astro hashes every inline script and <style> it renders, so script-src needs no
  // 'unsafe-inline'. Inline style="" attributes (the --c/--i custom properties and Shiki's code colours) are allowed on
  // style-src-attr only. Third parties are the ones Tag Manager, GA4 and Clarity actually use.
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://img.youtube.com https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
        "font-src 'self'",
        "media-src 'self'",
        "frame-src 'self' https://www.googletagmanager.com",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: { resources: ["'self'", "https://www.googletagmanager.com", "https://www.clarity.ms", "https://scripts.clarity.ms"], hashes: inlineScriptHashes },
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  build: { inlineStylesheets: 'always' },
  markdown: { shikiConfig: { theme: 'github-light-high-contrast' } },
  redirects: {
    '/comic': '/',
    // Short links for bios and posts: GA4 reads the UTM tags, so each click shows up as linkedin / social
    '/li': { status: 302, destination: '/?utm_source=linkedin&utm_medium=social&utm_campaign=profile' },
    '/li-post': { status: 302, destination: '/?utm_source=linkedin&utm_medium=social&utm_campaign=post' },
  },
  integrations: [cspGuard, icon(), sitemap({ changefreq: 'monthly', priority: 1, lastmod: new Date() })],
  fonts: [
    { provider: fontProviders.fontsource(), name: 'Bangers', cssVariable: '--font-bangers', weights: [400], subsets: ['latin'], fallbacks: ['Impact', 'sans-serif'] },
    { provider: fontProviders.fontsource(), name: 'Patrick Hand', cssVariable: '--font-patrick', weights: [400], subsets: ['latin'], fallbacks: ['Arial', 'sans-serif'] },
  ],
});
