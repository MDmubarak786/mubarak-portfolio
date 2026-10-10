export const site = {
  followers: "22K+",
  impressions: "10M+",
  name: "Mubarak Shajahan",
  legalName: "Mohammed Mubarak",
  shortName: "Mubarak",
  tamilName: "முகமது முபாரக்",
  role: "Senior Software Engineer",
  roleAlt: "Full-Stack + AI",
  headline: "Senior Software Engineer @ Galent · Full-Stack + AI · React, Next.js, Node.js, Python, LLMs, RAG",
  employer: "Galent",
  previousEmployer: "Incresco",
  location: "Chennai, Tamil Nadu, India",
  pronouns: "he/him",
  email: "mohammedmubarakmk@gmail.com", // confirmed by LinkedIn and the resume
  phoneDisplay: "+91 79041 00495",
  phoneE164: "+917904100495",
  whatsapp: "https://wa.me/917904100495",
  linkedin: "https://linkedin.com/in/mohammed-mubarak",
  github: "https://github.com/MDmubarak786",
  x: "https://x.com/MMubarakoo7",
  instagram: "https://instagram.com/scooby_doo.mk",
  youtube: "https://youtube.com/@mohammedmubarak1478",
  audio: "/audio/mohammed-mubarak.mp3",
  resume: "/resume/Mubarak-Shajahan-Resume.pdf",
  resumeName: "Mubarak-Shajahan-Resume.pdf",
  education: { school: "Sri Krishna College of Technology, Coimbatore", degree: "B.Tech in Information Technology", years: "2018 – 2022", cgpa: "8.01 / 10" },
  award: { year: "2021", title: "Outstanding contribution and strong ownership", by: "IncrescoTech" },
  careerStart: "2021-06-21", // first day at Incresco; experience is computed from this date
  get yearsExperience() { return experience().short; },
  url: "https://mk-comics.vercel.app",
} as const;

export const greetings = ["வணக்கம்", "Hello", "Hola", "Bonjour", "नमस्ते", "こんにちは"];

export const stats = [
  { value: 1.25, suffix: "M+", decimals: 2, label: "monthly users on the EF Academy platform" },
  { value: 23, suffix: "+", decimals: 0, label: "languages served from one codebase" },
  { value: 96.5, suffix: "%", decimals: 1, label: "integration cost cut, Tibco → AWS Glue" },
  { value: 9, suffix: "", decimals: 0, label: "leaders and clients vouching on record" },
];

export function mailto(subject: string) {
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
}

/** Whole years and months since the career start, for a given day (defaults to now). */
export function experience(now = new Date()) {
  const start = new Date(site.careerStart + "T00:00:00Z");
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  let months = now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  const long = `${years} year${years === 1 ? "" : "s"}${months ? ` ${months} month${months === 1 ? "" : "s"}` : ""}`;
  const short = `${years}.${Math.floor((months / 12) * 10)}+`;
  return { years, months, long, short };
}
