import fallback from "../data/contributions.json";

export interface ContributionDay { date: string; level: number; count: number }
export interface Contributions { total: number; days: ContributionDay[]; fetchedAt: string; source: "live" | "fallback" }

const USER = "MDmubarak786";

/** GitHub's public contribution calendar, parsed at build time. Falls back to a committed snapshot. */
export async function getContributions(): Promise<Contributions> {
  try {
    const res = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { "user-agent": "mubarak-portfolio-build" } });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const html = await res.text();
    const days: ContributionDay[] = [];
    const cell = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>/g;
    for (const m of html.matchAll(cell)) days.push({ date: m[1], level: Number(m[2]), count: 0 });
    // Counts live in tooltips: "<tool-tip for="...">N contributions on ..."
    const tip = /<tool-tip[^>]*for="contribution-day-component-(\d+)-(\d+)"[^>]*>\s*(No|\d+) contributions? on ([^<.]+)/g;
    const counts = new Map<string, number>();
    for (const m of html.matchAll(tip)) counts.set(m[4].trim(), m[3] === "No" ? 0 : Number(m[3]));
    const totalMatch = html.match(/([\d,]+)\s+contributions\s+in\s+the\s+last\s+year/);
    if (days.length < 300) throw new Error("Contribution grid not found");
    for (const d of days) {
      const label = new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
      const withSuffix = label.replace(/(\d+)$/, (n) => n + ordinal(Number(n)));
      d.count = counts.get(withSuffix) ?? counts.get(label) ?? (d.level > 0 ? d.level : 0);
    }
    days.sort((a, b) => a.date.localeCompare(b.date));
    const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : days.reduce((n, d) => n + d.count, 0);
    return { total, days, fetchedAt: new Date().toISOString().slice(0, 10), source: "live" };
  } catch {
    return { ...(fallback as Omit<Contributions, "source">), source: "fallback" };
  }
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
