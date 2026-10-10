import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { site } from "../lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const items = posts.map((p) => `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${site.url}/blog/${p.id}/</link>
      <guid isPermaLink="true">${site.url}/blog/${p.id}/</guid>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
      <description>${esc(p.data.description)}</description>
      ${p.data.tags.map((t) => `<category>${esc(t)}</category>`).join("")}
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The strip – ${esc(site.name)}</title>
    <link>${site.url}/blog/</link>
    <description>Weekly posts on the AI models and tools that matter to people shipping products.</description>
    <language>en</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
