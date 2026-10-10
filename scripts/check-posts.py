#!/usr/bin/env python3
"""Validate blog posts against the schema in src/content.config.ts and the brief in docs/blog-agent-brief.md.
Usage: python3 scripts/check-posts.py [--fix]   (--fix trims over-long descriptions at a sentence boundary)
"""
import glob, json, re, sys

FIX = "--fix" in sys.argv
PILLARS = {"model-watch", "building", "case-files"}
RECORDS = {p.split("/")[-1][:-3] for p in glob.glob("src/content/records/*.md")}
calendar = {e["slug"]: e for e in json.load(open("docs/blog-calendar.json"))}

def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    return (m.group(1), m.group(2)) if m else (None, text)

problems = 0
seen = set()
all_slugs = {p.split("/")[-1][:-3] for p in glob.glob("src/content/posts/*.md")}
for path in sorted(glob.glob("src/content/posts/*.md")):
    slug = path.split("/")[-1][:-3]
    seen.add(slug)
    text = open(path).read()
    fm, body = frontmatter(text)
    errs = []
    if fm is None:
        errs.append("no frontmatter")
    else:
        def field(name):
            m = re.search(rf'^{name}:\s*"(.*)"\s*$', fm, re.M)
            return m.group(1) if m else None
        title, desc = field("title"), field("description")
        if title is None: errs.append("title missing/unquoted")
        elif len(title) > 90: errs.append(f"title {len(title)} chars")
        if desc is None: errs.append("description missing/unquoted")
        else:
            if len(desc) > 170:
                if FIX:
                    cut = desc[:170]
                    cut = cut[: max(cut.rfind(". "), cut.rfind("; "), cut.rfind(", "))] if max(cut.rfind(". "), cut.rfind("; "), cut.rfind(", ")) > 80 else cut[:167].rstrip() + "…"
                    text = text.replace(f'description: "{desc}"', f'description: "{cut.rstrip(". ,;") if not cut.endswith("…") else cut}"')
                    open(path, "w").write(text)
                    errs.append(f"description {len(desc)} chars (fixed to {len(cut)})")
                else:
                    errs.append(f"description {len(desc)} chars")
            elif len(desc) < 80: errs.append(f"description {len(desc)} chars (short)")
        if not re.search(r"^date:\s*2026-10-10", fm, re.M): errs.append("date not 2026-10-10")
        pm = re.search(r"^pillar:\s*(\S+)", fm, re.M)
        if not pm or pm.group(1) not in PILLARS: errs.append("pillar invalid")
        rm = re.search(r"^related:\s*(\S+)", fm, re.M)
        if rm and rm.group(1) not in RECORDS: errs.append(f"related {rm.group(1)} not a record")
        n_sources = len(re.findall(r"^\s+- title:", fm, re.M))
        urls = re.findall(r'url:\s*"([^"]+)"', fm)
        if n_sources < 4: errs.append(f"only {n_sources} sources")
        bad = [u for u in urls if not u.startswith("http")]
        if bad: errs.append(f"bad urls {bad}")
        if not re.search(r"^draft:\s*false", fm, re.M): errs.append("draft flag missing")
        if "tags: [" not in fm: errs.append("tags missing")
    words = len(re.findall(r"\S+", body))
    if words < 1000: errs.append(f"{words} words (short)")
    if words > 2200: errs.append(f"{words} words (long)")
    if "## Sources" in body: errs.append("body has a Sources section")
    if re.search(r"<(img|div|iframe)", body): errs.append("raw HTML in body")
    for link in re.findall(r"\]\(/blog/([a-z0-9-]+)/?\)", body):
        if link not in all_slugs: errs.append(f"dead link /blog/{link}")
    for link in re.findall(r"\]\(/#file-([a-z0-9-]+)\)", body):
        if link not in RECORDS: errs.append(f"dead file link {link}")
    status = "ok " if not errs else "ERR"
    if errs: problems += 1
    print(f"{status} {slug:60s} {words:5d}w  {'; '.join(errs)}")

missing = [s for s in calendar if s not in seen]
print(f"\n{len(seen)} posts, {problems} with problems, {len(missing)} calendar entries not written")
for s in missing: print("  missing:", s)
sys.exit(1 if problems or missing else 0)
