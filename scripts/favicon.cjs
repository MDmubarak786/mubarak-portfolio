// Draws the site icon: the yellow "MK" chest badge the hero wears, set in Bangers (outlined with HarfBuzz so it does
// not depend on a font being installed), inside a black comic outline. Writes favicon.svg, favicon.ico (48 px, which
// Google's result favicons need: a multiple of 48), icon-192.png, icon-512.png (web app manifest) and
// apple-touch-icon.png (180) into public/.
// Usage: node scripts/favicon.cjs
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const root = process.cwd();
const YELLOW = "#ffb703", INK = "#111", PINK = "#ff2e63";

(async () => {
  const hb = await require(path.join(root, "node_modules/harfbuzzjs/index.js"));
  const blob = hb.createBlob(fs.readFileSync(path.join(root, "src/assets/fonts/bangers-400.ttf")));
  const face = hb.createFace(blob, 0), font = hb.createFont(face), buf = hb.createBuffer();
  buf.addText("MK"); buf.guessSegmentProperties(); hb.shape(font, buf);

  // Collect glyph outlines in font units (y up), then flip y and fit them into the badge.
  let pen = 0; const parts = [];
  for (const g of buf.json()) { parts.push({ d: font.glyphToPath(g.g), dx: pen + g.dx, dy: g.dy }); pen += g.ax; }
  const pts = []; const num = /(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/g;
  for (const p of parts) for (const m of p.d.matchAll(num)) pts.push([Number(m[1]) + p.dx, -(Number(m[2]) + p.dy)]);
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const box = 43, s = box / Math.max(maxX - minX, maxY - minY);
  const ox = 32 - ((maxX - minX) * s) / 2, oy = 32.5 - ((maxY - minY) * s) / 2;
  const r = (v) => Math.round(v * 100) / 100;
  const d = parts.map((p) => p.d.replace(/([MLQCZ])|(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/g, (m, cmd, a, b) => cmd ? cmd
    : `${r((Number(a) + p.dx - minX) * s + ox)} ${r((-(Number(b) + p.dy) - minY) * s + oy)}`)).join("");
  buf.destroy(); font.destroy(); face.destroy(); blob.destroy();

  // Pink offset path behind the letters gives the comic "print shadow" without growing past the circle Google crops to.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29.5" fill="${YELLOW}" stroke="${INK}" stroke-width="4"/><path d="${d}" fill="${PINK}" transform="translate(1.6 1.6)"/><path d="${d}" fill="${INK}"/></svg>`;
  fs.writeFileSync(path.join(root, "public/favicon.svg"), svg);

  const png = (size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  fs.writeFileSync(path.join(root, "public/icon-192.png"), png(192));
  fs.writeFileSync(path.join(root, "public/icon-512.png"), png(512));
  fs.writeFileSync(path.join(root, "public/apple-touch-icon.png"), png(180));

  // ICO with one embedded 48 px PNG: 6-byte header, one 16-byte directory entry, then the PNG bytes.
  const p48 = png(48), ico = Buffer.alloc(22);
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico.writeUInt8(48, 6); ico.writeUInt8(48, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(p48.length, 14); ico.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(root, "public/favicon.ico"), Buffer.concat([ico, p48]));
  console.log({ svgBytes: svg.length, png48: p48.length });
})();
