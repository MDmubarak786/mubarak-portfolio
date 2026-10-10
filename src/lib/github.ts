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
    // Each day is a <td> with an id, a data-date and a data-level; attribute order is not guaranteed.
    const days: (ContributionDay & { id?: string })[] = [];
    for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
      const tag = m[0];
      const level = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0);
      const id = tag.match(/\bid="([^"]+)"/)?.[1];
      days.push({ date: m[1], level, count: 0, id });
    }
    // Counts live in tooltips keyed by the cell id: <tool-tip for="contribution-day-component-D-W">N contributions on Month Dth
    // Keying by id (not by the day label) matters: a 53-week grid repeats five calendar days with no year in the label.
    const byId = new Map<string, number>();
    const byLabel = new Map<string, number>();
    for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*(No|[\d,]+) contributions? on ([^<.]+)/g)) {
      const n = m[2] === "No" ? 0 : Number(m[2].replace(/,/g, ""));
      byId.set(m[1], n);
      if (!byLabel.has(m[3].trim())) byLabel.set(m[3].trim(), n);
    }
    const totalMatch = html.match(/([\d,]+)\s+contributions\s+in\s+the\s+last\s+year/);
    if (days.length < 300) throw new Error("Contribution grid not found");
    for (const d of days) {
      const label = new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
      const withSuffix = label.replace(/(\d+)$/, (n) => n + ordinal(Number(n)));
      d.count = (d.id && byId.get(d.id)) ?? byLabel.get(withSuffix) ?? byLabel.get(label) ?? (d.level > 0 ? d.level : 0);
      delete d.id;
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
