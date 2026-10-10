// Shapes a Tamil string with HarfBuzz (the wasm build Astro already depends on) and prints its glyph outlines as one SVG
// path. The cover's pronounce chip inlines that path instead of Tamil text, because a page whose first frame needs a
// system Tamil font stalls first paint on machines that have to search for one (PageSpeed's servers took ~600 ms).
// Usage: node scripts/tamil-name.cjs "/System/Library/Fonts/Supplemental/Tamil Sangam MN.ttc" "முகமது முபாரக்" 0 > out.json
const fs = require("fs");
const path = require("path");
const hbjs = require(process.cwd() + "/node_modules/harfbuzzjs/hbjs.js");
(async () => {
  const hb = await require(process.cwd() + "/node_modules/harfbuzzjs/index.js");
  const fontPath = process.argv[2], text = process.argv[3], index = Number(process.argv[4] || 0);
  const blob = hb.createBlob(fs.readFileSync(fontPath));
  const face = hb.createFace(blob, index);
  const font = hb.createFont(face);
  const upem = face.upem;
  const buf = hb.createBuffer();
  buf.addText(text); buf.guessSegmentProperties();
  hb.shape(font, buf);
  const glyphs = buf.json();
  let x = 0, d = "";
  const scale = 100 / upem; // 100 units per em
  const f = (v) => (Math.round(v * 10) / 10).toString();
  for (const g of glyphs) {
    const p = font.glyphToPath(g.g); // SVG path in font units, y up
    // translate by pen position + offsets, flip y, scale to 100/em; baseline at y=0 → shift later via viewBox
    const tx = x + g.dx, ty = g.dy;
    const moved = p.replace(/([MLQCZ])|(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/g, (m, cmd, a, b) => cmd ? cmd : `${f((Number(a) + tx) * scale)} ${f((-Number(b) - ty) * scale)}`);
    d += moved;
    x += g.ax;
  }
  const ext = face.getAxisInfos ? null : null;
  const asc = 100 * 0.95, desc = 100 * 0.25; // generous box; trimmed by viewBox below
  // compute bbox from the path numbers
  const nums = [...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const xs = nums.map((n) => n[0]), ys = nums.map((n) => n[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  console.error({ glyphs: glyphs.length, advance: x * scale, minX, maxX, minY, maxY, pathBytes: d.length });
  process.stdout.write(JSON.stringify({ d, minX: f(minX), minY: f(minY), w: f(maxX - minX), h: f(maxY - minY), baseline: f(0 - minY) }));
  buf.destroy(); font.destroy(); face.destroy(); blob.destroy();
})();
