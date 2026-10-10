import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { site } from "../../../lib/site";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { title: post.data.title, date: post.data.date, pillar: post.data.pillar } }));
}

const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}) => ({ type, props: { style, children, ...extra } });

export const GET: APIRoute = async ({ props }) => {
  const { title, date, pillar } = props as { title: string; date: Date; pillar: string };
  const [bangers, patrick] = await Promise.all([
    readFile(resolve(process.cwd(), "src/assets/fonts/bangers-400.ttf")),
    readFile(resolve(process.cwd(), "src/assets/fonts/patrick-hand-400.ttf")),
  ]);
  const label = { "model-watch": "Model watch", building: "Building with AI", "case-files": "From the case files" }[pillar] ?? "The strip";
  const when = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const tree = h("div", { width: 1200, height: 630, display: "flex", background: "#fff8e7", backgroundImage: "radial-gradient(#111 1.2px, transparent 1.4px)", backgroundSize: "10px 10px", padding: 48, fontFamily: "Patrick" }, [
    h("div", { display: "flex", flexDirection: "column", justifyContent: "space-between", width: 1104, height: 534, background: "#fff", border: "6px solid #111", boxShadow: "14px 14px 0 #111", padding: 56 }, [
      h("div", { display: "flex", alignItems: "center", gap: 18 }, [
        h("span", { background: "#fff3b0", border: "4px solid #111", padding: "6px 16px", fontSize: 28 }, `${label} · ${when}`),
      ]),
      h("div", { display: "flex", fontFamily: "Bangers", fontSize: title.length > 60 ? 64 : 78, lineHeight: 1.02, color: "#ff2e63", letterSpacing: "0.01em" }, title),
      h("div", { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }, [
        h("span", { fontFamily: "Bangers", fontSize: 40, color: "#111" }, "MK COMICS"),
        h("span", { color: "#555" }, `${site.name} · ${site.url.replace("https://", "")}`),
      ]),
    ]),
  ]);
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts: [{ name: "Bangers", data: bangers, weight: 400, style: "normal" }, { name: "Patrick", data: patrick, weight: 400, style: "normal" }] });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
};
