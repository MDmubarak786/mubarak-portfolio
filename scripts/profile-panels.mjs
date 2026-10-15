// Render the comic panels used by the GitHub profile README (github.com/MDmubarak786) as PNGs, with the site's own
// fonts and head cut-out. Usage: node scripts/profile-panels.mjs <output dir>
// The hero figure is taken from the live site so it always matches what the portfolio ships.
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const OUT = resolve(process.argv[2] ?? "profile-assets");
await mkdir(OUT, { recursive: true });
const [bangers, patrick, head] = await Promise.all([
  readFile(resolve("src/assets/fonts/bangers-400.ttf")), readFile(resolve("src/assets/fonts/patrick-hand-400.ttf")), readFile(resolve("src/assets/head.png")),
]);
const headUrl = `data:image/png;base64,${head.toString("base64")}`;
const INK = "#111", CREAM = "#fff8e7", PINK = "#ff2e63", YELLOW = "#ffb703", TEAL = "#1b998b", BLUE = "#3a86ff", PURPLE = "#8338ec", PALE = "#fff3b0";
const h = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });
const fonts = [{ name: "Bangers", data: bangers, weight: 400, style: "normal" }, { name: "Patrick", data: patrick, weight: 400, style: "normal" }];
const outline = (px = 3) => `${px}px ${px}px 0 ${INK}, -${px}px -${px}px 0 ${INK}, ${px}px -${px}px 0 ${INK}, -${px}px ${px}px 0 ${INK}, ${px}px 0 0 ${INK}, -${px}px 0 0 ${INK}, 0 ${px}px 0 ${INK}, 0 -${px}px 0 ${INK}`;
const halftone = { backgroundColor: CREAM, backgroundImage: `radial-gradient(circle at 3px 3px, ${INK} 1.6px, transparent 2px)`, backgroundSize: "14px 14px" };
const panel = (style, children) => h("div", { display: "flex", background: "#fff", border: `5px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, ...style }, children);
const caption = (text, style = {}) => h("div", { display: "flex", background: PALE, border: `4px solid ${INK}`, padding: "6px 16px", fontFamily: "Patrick", fontSize: 30, color: INK, transform: "rotate(-1deg)", ...style }, text);
const bang = (text, style = {}) => h("div", { display: "flex", fontFamily: "Bangers", color: INK, ...style }, text);

async function render(name, width, height, tree) {
  const svg = await satori(tree, { width, height, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  await writeFile(resolve(OUT, name), png);
  console.log("wrote", name, width, "x", height);
}

// 1 · The cover
await render("cover.png", 1600, 640, h("div", { width: 1600, height: 640, display: "flex", position: "relative", ...halftone, padding: "40px 54px 54px 40px" }, [
  panel({ width: 1506, height: 546, position: "relative", padding: "44px 56px", flexDirection: "column" }, [
    h("div", { display: "flex", alignItems: "center", gap: 18 }, [
      bang("MK", { fontSize: 54 }), bang("COMICS", { fontSize: 54, color: PINK, textShadow: outline(2) }),
      caption("Issue #1 · Chennai, India · he/him", { marginLeft: 26, fontSize: 28 }),
    ]),
    h("div", { display: "flex", flexDirection: "column", marginTop: 30, width: 1000 }, [
      bang("THE FULL-STACK", { fontSize: 136, lineHeight: 0.9, color: PINK, textShadow: outline(4), letterSpacing: 2 }),
      bang("+ AI CHRONICLES", { fontSize: 136, lineHeight: 0.9, color: PINK, textShadow: outline(4), letterSpacing: 2 }),
    ]),
    h("div", { display: "flex", marginTop: 34, fontFamily: "Patrick", fontSize: 40, color: INK, width: 1000, lineHeight: 1.25 },
      "Starring Mubarak Shajahan, Senior Software Engineer at Galent. Five years of full-stack engineering meeting AI, told one panel at a time."),
    h("img", { position: "absolute", right: 70, top: 40, width: 330, height: 476, objectFit: "contain" }, undefined, { src: headUrl }),
    h("div", { position: "absolute", right: 24, top: 352, width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center", background: YELLOW, clipPath: "polygon(50% 0%, 61% 12%, 77% 6%, 80% 23%, 96% 29%, 88% 44%, 100% 56%, 85% 65%, 88% 82%, 71% 82%, 63% 97%, 50% 87%, 37% 97%, 29% 82%, 12% 82%, 15% 65%, 0% 56%, 12% 44%, 4% 29%, 20% 23%, 23% 6%, 39% 12%)", transform: "rotate(12deg)" },
      bang("2026\nEDITION", { fontSize: 34, textAlign: "center", lineHeight: 1, whiteSpace: "pre" })),
  ]),
]));

// 2 · By the numbers
const numbers = [["1.25M+", "monthly users", "multilingual platform, 23+ languages", TEAL], ["95%", "accuracy", "AI document processing, 17+ document types", YELLOW], ["96.5%", "cost cut", "TIBCO to AWS Glue, $24k to $840 a year", BLUE], ["9", "witnesses", "leaders and clients vouching on record", PINK]];
await render("numbers.png", 1600, 320, h("div", { width: 1600, height: 320, display: "flex", gap: 32, padding: "20px 44px 40px 28px", ...halftone }, numbers.map(([v, k, d, c]) =>
  panel({ width: 350, height: 250, flexDirection: "column", padding: "22px 24px", gap: 6 }, [
    bang(v, { fontSize: 78, color: c, textShadow: outline(3), lineHeight: 1 }),
    h("div", { display: "flex", fontFamily: "Patrick", fontSize: 34, color: INK, marginTop: 8 }, k),
    h("div", { display: "flex", fontFamily: "Patrick", fontSize: 25, color: "#555", lineHeight: 1.2 }, d),
  ]))));

// 3 · A witness on record
await render("witness.png", 1600, 400, h("div", { width: 1600, height: 400, display: "flex", flexDirection: "column", padding: "28px 48px", ...halftone }, [
  h("div", { display: "flex", position: "relative", background: "#fff", border: `4px solid ${INK}`, borderRadius: 34, padding: "30px 40px", fontFamily: "Patrick", fontSize: 40, lineHeight: 1.3, color: INK }, [
    h("span", {}, "“One of those rare engineers who combines technical excellence with genuine business acumen. The entire migration finished on time, before our Tibco contract ended, with no disruption to our daily operations.”"),
    h("div", { position: "absolute", left: 60, bottom: -22, width: 34, height: 34, background: "#fff", borderRight: `4px solid ${INK}`, borderBottom: `4px solid ${INK}`, transform: "rotate(45deg)" }),
  ]),
  h("div", { display: "flex", alignItems: "center", gap: 18, marginTop: 34, marginLeft: 30 }, [
    h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: 999, background: YELLOW, border: `4px solid ${INK}`, fontFamily: "Bangers", fontSize: 26, color: INK }, "JW"),
    bang("01/09", { fontSize: 26, color: "#b5123b" }),
    h("div", { display: "flex", fontFamily: "Patrick", fontSize: 30, color: INK }, "Jason Wheeler · VP of Technology, EF Academy"),
  ]),
]));

// 4 · The back cover
const balloons = [["Email", PINK], ["WhatsApp", TEAL], ["LinkedIn", YELLOW], ["GitHub", BLUE], ["X", PURPLE]];
await render("backcover.png", 1600, 300, h("div", { width: 1600, height: 300, display: "flex", position: "relative", padding: "30px 48px", ...halftone }, [
  h("div", { display: "flex", flexDirection: "column", width: 980 }, [
    bang("NEXT ISSUE NEEDS A PUBLISHER.", { fontSize: 82, color: PINK, textShadow: outline(3), lineHeight: 1 }),
    h("div", { display: "flex", marginTop: 22, fontFamily: "Patrick", fontSize: 36, color: INK, lineHeight: 1.25 }, "Hiring for a senior or lead role? Write, call, or send a message. I read everything."),
  ]),
  ...balloons.map(([l, c], i) => h("div", { position: "absolute", left: 1040 + i * 108, top: 40 + (i % 2) * 70, width: 112, height: 128, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50% 50% 50% 50% / 55% 55% 45% 45%", background: c, border: `4px solid ${INK}`, boxShadow: `4px 6px 0 rgba(17,17,17,.25)`, fontFamily: "Bangers", fontSize: 24, color: c === PURPLE ? "#fff" : INK, transform: `rotate(${(i % 2 ? -1 : 1) * 4}deg)` }, l)),
]));

// 5 · The hero, straight from the live site (cape on), rendered through resvg
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => sessionStorage.setItem("preloaded", "1"));
await p.goto("https://mk-comics.vercel.app/", { waitUntil: "networkidle" });
const svgText = await p.evaluate(async () => {
  const svg = document.querySelector("[data-powerups] .hero-figure").cloneNode(true);
  svg.querySelectorAll("[data-gear]").forEach((g) => { g.removeAttribute("hidden"); if (g.dataset.gear !== "4") g.setAttribute("display", "none"); });
  svg.style.setProperty("--shirt", "#3a86ff");
  svg.querySelectorAll('[stroke="var(--shirt, #1b998b)"], [fill="var(--shirt, #1b998b)"]').forEach((el) => { for (const a of ["stroke", "fill"]) if (el.getAttribute(a)?.startsWith("var(")) el.setAttribute(a, "#3a86ff"); });
  svg.querySelector("image").setAttribute("href", "HEAD_PNG");
  svg.querySelectorAll("text").forEach((t) => t.setAttribute("font-family", "Bangers"));
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", "640"); svg.setAttribute("height", "1100"); svg.removeAttribute("class");
  return svg.outerHTML;
});
await b.close();
const heroPng = new Resvg(svgText.replace("HEAD_PNG", headUrl), { fitTo: { mode: "width", value: 640 }, font: { fontFiles: [resolve("src/assets/fonts/bangers-400.ttf")], defaultFontFamily: "Bangers", loadSystemFonts: false } }).render().asPng();
await writeFile(resolve(OUT, "hero.png"), heroPng);
console.log("wrote hero.png");
