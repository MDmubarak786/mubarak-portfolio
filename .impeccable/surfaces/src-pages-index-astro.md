---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: []
---

# Surface brief: home page (src/pages/index.astro)

Scope: the single home page of Mohammed Mubarak's portfolio, mode Persuade. Audience: hiring managers screening for Lead/Staff engineer roles, laptop, 60 seconds. Job: confirm seniority, judgment, ownership; action: start a conversation (email, call/WhatsApp, LinkedIn). Proof: nine named testimonials, the EF Academy platform (1.25M+ monthly users, 23+ languages), the Tibco→AWS Glue migration ($24k→$840/yr, delivered before contract end), 100% Lighthouse on the Incresco & Camped site. Constraint: keep every piece of content from the incumbent site (user decision), one signature interaction, no WebGL, 100 Lighthouse, reduced-motion honoured. Stack: Astro + Tailwind on Vercel.

## Direction contract

THESIS: The page is a set of engineering decision records about his own career: each major outcome is written the way a lead engineer writes an ADR (context, options weighed, decision, consequences, reviewed-by), so a hiring manager reads judgment, not a stack list. It refuses the category's hero-plus-stat-tiles-plus-card-grid arrangement and the dark-mode template it replaces.

OWN-WORLD: Ruled document paper as the ground (warm off-white with faint rule lines), near-black ink, one green for ACCEPTED status stamps and one rust-red for superseded/rejected options; stamps and approver signature blocks are the only ornament. A display face with real typographic character for record titles (not Inter/Space Grotesk/IBM Plex; source a face from the technical-document tradition, self-hosted), a workhorse text face with Tamil coverage for body, monospace only for identifiers (ADR numbers, dates, metrics tables). Components: record header with status stamp, numbered section rules, options table with pros/cons, consequence ledger with tabular figures, reviewed-by block with name, title, and quoted words. With all content removed it still reads as a filed engineering record, not a website.

STORY: A hiring manager lands on ADR-001 already open, understands within seconds that this engineer replaced a licensed integration pipeline with AWS Glue, weighed real options, delivered before a deadline, and that a VP of Technology signed off on it in his own words. They scan the record index (every outcome, role, and project is a record), believe the proof because it is attributed, and request a conversation.

FIRST VIEWPORT: Left rail (desktop) is the record index: his name in Latin and Tamil with pronunciation, role, location, then the numbered list of records (ADR-001 Tibco→AWS Glue; ADR-002 EF Academy multilingual platform; ADR-003 Incresco & Camped redesign; ADR-004 Planet IoT dashboards; ADR-005 Edvanza team lead; …) plus Witnesses, Experience, Stack, Earlier work, Contact. Main column opens on ADR-001 at full size: title, status stamp ACCEPTED with date, Context (two lines), Options considered (three rows, pros/cons), Decision (one paragraph), Consequences as a ledger: $24,000 → $840 per year, 96.5%, delivered before contract end. Reviewed-by block top-right of the main column: Jason Wheeler, VP of Technology, EF Academy, quoting his line about $30,000 annual savings. The primary action, "Request a conversation", is a working form/link block pinned at the foot of the rail and repeated at the end of every record: email, call/WhatsApp, LinkedIn. On mobile the rail collapses to a sticky record index bar; ADR-001 stays first.

FORM: Candidate 1 of my ordered grounded list (the engineering decision record), presented as IMPECCABLE'S PICK and chosen by the user over the assigned candidate 4 (painted signboard); seed key f03d02c2, mode persuade, code-led (no image generation in this harness). Signature interaction: as the visitor scrolls each record, its status stamp lands (one authored moment per record, exponential ease-out, stamp rotates and settles with a faint ink bleed); the first stamp is the only animation in the first viewport. Reduced motion: stamps are pre-landed.

Raises carried from the declined hand (named): cityscape → rust-red belongs to exactly one thing, rejected options; understory → the brightest surface is reserved for the focused control; darkroom → the stamp landing is one continuous motion, nothing else animates on entry; BBS → the record index lists every section and is always one step away; manga → the 96.5% figure is set as the one solid-ink ledger line; CD-ROM → buttons and index rows visibly press and the current record's row sits inset.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
