import { getContributions } from "./github";

/** The GitHub contribution grid as one SVG string. It is served from /calendar.svg and fetched when the "Daily strip"
 *  panel comes near the viewport, so its 365 cells never sit in the home page HTML. */
const empty = "#fff", levels = ["#ffd6e0", "#ff9ab5", "#ff5c8a", "#ff2e63"], ink = "#111";
const size = 11, gap = 3, step = size + gap;

export async function calendar() {
  const c = await getContributions();
  const offset = new Date(c.days[0].date + "T00:00:00Z").getUTCDay();
  const cells: (typeof c.days[number] | null)[] = [...Array(offset).fill(null), ...c.days];
  const weeks: (typeof cells)[] = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const w = weeks.length * step - gap, h = 7 * step - gap + 16;
  const fill = [empty, ...levels];
  const months: string[] = [];
  weeks.forEach((wk, i) => { const d = wk.find(Boolean); if (!d) return; const dt = new Date(d.date + "T00:00:00Z"); if (dt.getUTCDate() <= 7) months.push(`<text x="${i * step}" y="10" font-size="10" fill="${ink}" opacity=".7">${dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</text>`); });
  const css = `rect{width:${size}px;height:${size}px;rx:2;stroke:${ink};stroke-opacity:.15}` + fill.map((f, i) => `.l${i}{fill:${f}}`).join("");
  const rects = weeks.flatMap((wk, x) => wk.map((d, y) => d ? `<rect x="${x * step}" y="${y * step}" class="l${Math.min(d.level, 4)}"><title>${d.count} on ${d.date}</title></rect>` : "")).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${c.total} contributions on GitHub in the last year" class="block w-full h-auto"><style>${css}</style>${months.join("")}<g transform="translate(0 16)">${rects}</g></svg>`;
  return { svg, w, h, total: c.total, source: c.source, fetchedAt: c.fetchedAt };
}
