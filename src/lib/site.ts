export const site = {
  name: "Mohammed Mubarak",
  shortName: "Mubarak",
  tamilName: "முகமது முபாரக்",
  role: "Lead Software Engineer",
  roleAlt: "Front-End Team Lead",
  employer: "IncrescoTech",
  location: "Bangalore, India",
  pronouns: "he/him",
  email: "mohammedmubarakmkg@gmail.com",
  phoneDisplay: "+91 79041 00495",
  phoneE164: "+917904100495",
  whatsapp: "https://wa.me/917904100495",
  linkedin: "https://linkedin.com/in/mohammed-mubarak",
  github: "https://github.com/MDmubarak786",
  x: "https://x.com/MMubarakoo7",
  instagram: "https://instagram.com/scooby_doo.mk",
  youtube: "https://youtube.com/@mohammedmubarak1478",
  audio: "/audio/mohammed-mubarak.mp3",
  game: "/police-thief",
  url: "https://mk-full-stack-developer.vercel.app",
} as const;

export const sections = [
  { id: "witnesses", label: "Witnesses" },
  { id: "experience", label: "Experience" },
  { id: "stack", label: "Stack" },
  { id: "earlier-work", label: "Earlier work" },
  { id: "contact", label: "Contact" },
] as const;

export function mailto(subject: string) {
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
}
