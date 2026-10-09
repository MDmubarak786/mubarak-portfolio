import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { site } from "../lib/site";

const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}) => ({ type, props: { style, children, ...extra } });

export const GET: APIRoute = async () => {
  const [display, text, portrait] = await Promise.all([
    readFile(resolve(process.cwd(), "src/assets/fonts/bricolage-700.woff")),
    readFile(resolve(process.cwd(), "src/assets/fonts/geist-400.woff")),
    readFile(resolve(process.cwd(), "src/assets/portrait.jpg")),
  ]);
  const portraitUrl = `data:image/jpeg;base64,${portrait.toString("base64")}`;
  const stat = (v: string, l: string) => h("div", { display: "flex", flexDirection: "column", gap: 6 }, [
    h("span", { fontFamily: "Bricolage", fontSize: 48, letterSpacing: "-0.04em", color: "#f2f2f0" }, v),
    h("span", { fontFamily: "Geist", fontSize: 20, color: "#9c9c98" }, l),
  ]);
  const tree = h("div", { width: 1200, height: 630, display: "flex", background: "#0b0b0c", color: "#f2f2f0", padding: 64, position: "relative", fontFamily: "Geist" }, [
    h("div", { display: "flex", flexDirection: "column", justifyContent: "space-between", width: 720, height: 502 }, [
      h("div", { display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#9c9c98" }, [
        h("span", { width: 10, height: 10, borderRadius: 999, background: "#4f6bff" }),
        h("span", {}, `${site.role} · ${site.location}`),
      ]),
      h("div", { display: "flex", fontFamily: "Bricolage", fontSize: 100, lineHeight: 0.95, letterSpacing: "-0.04em" }, site.name),
      h("div", { display: "flex", gap: 48 }, [stat("1.25M+", "monthly users"), stat("23+", "languages"), stat("96.5%", "cost cut")]),
    ]),
    h("img", { position: "absolute", left: 816, top: 64, width: 320, height: 400, borderRadius: 28, objectFit: "cover" }, undefined, { src: portraitUrl }),
    h("div", { position: "absolute", left: 816, top: 500, display: "flex", fontSize: 22, color: "#9c9c98" }, site.url.replace("https://", "")),
  ]);
  const svg = await satori(tree as any, {
    width: 1200, height: 630,
    fonts: [
      { name: "Bricolage", data: display, weight: 700, style: "normal" },
      { name: "Geist", data: text, weight: 400, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
};
