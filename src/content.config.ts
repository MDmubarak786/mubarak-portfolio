import { defineCollection, reference } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

/** A witness: someone who has vouched for Mubarak on record. Text is verbatim. */
const witnesses = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/witnesses" }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    organisation: z.string().optional(),
    quote: z.string().min(20),
    /** A short line from the quote to surface in a reviewed-by block. */
    pull: z.string().optional(),
    order: z.number(),
  }),
});

/** A decision record about his own work. */
const records = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/records" }),
  schema: z.object({
    id: z.string().regex(/^ADR-\d{3}$/),
    title: z.string(),
    /** Short title for the index rail. */
    index: z.string(),
    status: z.enum(["accepted", "superseded", "proposed"]),
    date: z.string().regex(/^\d{4}(-\d{2})?$/),
    organisation: z.string(),
    role: z.string(),
    summary: z.string(),
    context: z.string(),
    options: z.array(z.object({
      name: z.string(),
      chosen: z.boolean().default(false),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })).min(2),
    decision: z.string(),
    consequences: z.array(z.object({
      label: z.string(),
      value: z.string(),
      emphasis: z.boolean().default(false),
    })).min(1),
    reviewedBy: z.array(reference("witnesses")).default([]),
    tags: z.array(z.string()).default([]),
    /** false until Mubarak confirms the options considered. */
    confirmed: z.boolean().default(false),
    order: z.number(),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/experience" }),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    type: z.string(),
    start: z.string(),
    end: z.string().nullable(),
    groups: z.array(z.object({ name: z.string(), bullets: z.array(z.string()) })),
    skills: z.array(z.string()),
    order: z.number(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    period: z.string(),
    link: z.url().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    /** true when the live site hid details and Mubarak has not supplied them yet. */
    pending: z.boolean().default(false),
    order: z.number(),
  }),
});

const stack = defineCollection({
  loader: file("./src/data/stack.json"),
  schema: z.object({
    id: z.string(),
    group: z.enum(["Languages", "Frontend", "Backend", "Databases", "Cloud & DevOps", "AI & automation", "Monitoring", "Integrations", "Tools"]),
    order: z.number(),
  }),
});

/** Blog posts. Markdown with frontmatter; the body is the article. */
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().max(90),
    description: z.string().min(80).max(170),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Series/pillar: model-watch, building, case-files */
    pillar: z.enum(["model-watch", "building", "case-files"]),
    /** Related case file id, e.g. "adr-007-ai-document-processing" */
    related: z.string().optional(),
    sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { witnesses, records, experience, projects, stack, posts };
