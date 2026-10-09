import { site } from "./site";
export const me = {
  ...site,
  since: "2021",
  oneLiner: "I build products where full-stack engineering meets AI, and I write about it for 22,000+ developers.",
  intro: "Senior Software Engineer at Galent, Chennai: AI-powered features with LLMs, RAG and agentic workflows, and legacy systems moved to a cloud-native stack. Before that, five years at Incresco, intern to SDE 2, shipping AI and full-stack platforms for Global University Systems.",
};
export const numbers = [
  { v: "1.25M+", k: "monthly users", d: "on the multilingual platform, 23+ languages" },
  { v: "95%", k: "accuracy", d: "AI document processing across 17+ document types" },
  { v: "96.5%", k: "cost cut", d: "TIBCO → AWS Glue, $24k → $840 a year" },
  { v: "22K+", k: "followers", d: "10M+ impressions writing about JavaScript, React and AI" },
];
/** The migration, told in beats. The spine of every story variant. */
export const migration = [
  { t: "The clock", s: "EF Academy’s Salesforce pipelines ran on Tibco Scribe: $24,000 a year, and the licence had an end date." },
  { t: "The options", s: "Renew and pay forever, or rebuild the integration layer on AWS Glue before the contract ran out. I laid both out with the trade-offs." },
  { t: "The plan", s: "Clear steps, progress shared every week, every pipeline re-specified and verified against live data." },
  { t: "The cutover", s: "Finished before the Tibco contract ended. No disruption to daily operations." },
  { t: "The bill", s: "$24,000 a year became $840. The VP of Technology counts it as $30,000 in licensing saved." },
];
export const work = [
  { id: "docai", title: "AI document processing", org: "Incresco · GUS", year: "2024–26", kind: "AI", out: "17+ document types at 95% accuracy, manual entry cut 70%", body: "GPT-4 Vision plus OCR APIs classify 17+ document types at 95% accuracy, 7× faster; AI qualification matching with confidence scoring for Anabin and ECCTIS compliance lifted accuracy 35%+ and cut compliance effort 60%+." },
  { id: "ext", title: "Chrome extensions (MV3)", org: "Incresco · GUS", year: "2025", kind: "Tooling", out: "Admins save 3–5 hours a day, 99.9% uptime", body: "Production Manifest V3 extensions that automate student application workflows." },
  { id: "webster", title: "Webster University admissions portal", org: "Incresco · GUS", year: "2024", kind: "Platform", out: "Multi-step applications, secure auth, campaigns", body: "NestJS, React and MongoDB; JWT auth with HTTP-only cookies and CSRF protection, SendGrid campaigns, Dockerised builds. Also a course pricing and discount platform (React, TypeScript, Flask) that cut admin lookup time 60%+." },
  { id: "glue", title: "Tibco → AWS Glue", org: "EF Academy", year: "2024", kind: "Integration", out: "96.5% cheaper, delivered before the deadline", body: "Replaced a licensed integration pipeline with AWS Glue jobs the team owns. Cut over with zero disruption." },
  { id: "platform", title: "EF Academy platform", org: "EF Academy", year: "2022–25", kind: "Platform", out: "1.25M+ monthly users, 23+ languages", body: "Sole engineer on the primary digital presence: Next.js, Storyblok, Salesforce, AWS. Built a translation workflow so content teams localise without engineering." },
  { id: "uploader", title: "Prospect Uploader", org: "EF Academy", year: "2023", kind: "Serverless", out: "10k+ leads per upload, validated in every language", body: "AWS Lambda and EventBridge pipeline with multilingual validation, email alerts and a Prospect Viewer for failures." },
  { id: "camped", title: "Incresco & Camped sites", org: "IncrescoTech", year: "2023", kind: "Marketing", out: "100% Lighthouse, campaigns in 23+ languages", body: "Redesign on Astro and Storyblok with page builders marketing can use themselves." },
  { id: "planet", title: "Planet SIM & Planet Business", org: "IncrescoTech", year: "2023", kind: "IoT", out: "Real-time water service tracking", body: "IoT dashboards with Firebase auth, REST APIs and SignalR for live utility status in apartment communities." },
  { id: "edvanza", title: "Edvanza", org: "IncrescoTech", year: "2021–22", kind: "Leadership", out: "Led 4 engineers, 1,300+ PRs, 37% of org reviews", body: "React and React Native in feature parity; mentored the team, ran 30+ interviews, reviewed over a third of the organisation’s pull requests." },
];
export const voices = [
  { q: "One of those rare engineers who combines technical excellence with genuine business acumen.", n: "Jason Wheeler", t: "VP of Technology, EF Academy" },
  { q: "The entire migration finished on time, before our Tibco contract ended, and with no disruption to our daily operations.", n: "John Squier", t: "Director of Educational Technology, EF Academy" },
  { q: "He consistently finds ways to bridge the gap between design and development smoothly.", n: "Julieta Capogna", t: "Senior Designer, EF Academy" },
  { q: "He makes complex things easy to understand and explains them clearly and calmly.", n: "Minon Weber", t: "Talent Engagement Specialist, EF" },
];
export const roles = [
  { r: "Senior Software Engineer", c: "Galent · Chennai, hybrid", w: "May 2026 – now" },
  { r: "Software Development Engineer 2", c: "Incresco · Bengaluru", w: "Oct 2022 – May 2026" },
  { r: "Software Development Engineer 1", c: "Incresco", w: "May – Sep 2022" },
  { r: "Software Development Engineer, intern", c: "Incresco", w: "Jun 2021 – May 2022" },
];
export const stack = ["React", "Next.js", "TypeScript", "Astro", "Tailwind CSS", "Node.js", "NestJS", "Flask", "FastAPI", "Express", "LLMs", "RAG", "LangChain", "OCR", "Agentic workflows", "AWS Lambda", "AWS Glue", "EventBridge", "S3", "Docker", "Terraform", "GitHub Actions", "MongoDB"];
export const languages = ["English", "Tamil", "Deutsch", "Español", "Français", "Italiano", "Português", "日本語", "한국어", "中文", "Türkçe", "Русский", "Tiếng Việt", "ไทย", "Bahasa", "Polski", "Nederlands", "Svenska", "Norsk", "Dansk", "Suomi", "العربية", "हिन्दी"];
