import { site } from "./site";
export const v = {
  ...site,
  headline: "I build the platforms a million people use, and I own them end to end.",
  sub: "Lead Software Engineer at IncrescoTech. For two years the sole engineer behind EF Academy's multilingual platform and its AWS integration layer.",
  stats: [
    { value: "1.25M+", label: "monthly users on the EF Academy platform" },
    { value: "23+", label: "languages served from one codebase" },
    { value: "96.5%", label: "integration cost cut, Tibco → AWS Glue" },
    { value: "9", label: "leaders and clients vouching on record" },
  ],
  caseStudy: {
    title: "Tibco Scribe → AWS Glue",
    org: "EF Academy · 2024",
    body: "A licensed integration pipeline cost $24,000 a year and had an end date. I rebuilt it on AWS Glue in clear steps, cut over before the contract ended with zero disruption, and the bill dropped to $840 a year.",
    tags: ["AWS Glue", "Lambda", "EventBridge", "Salesforce"],
  },
  quotes: [
    { text: "One of those rare engineers who combines technical excellence with genuine business acumen.", name: "Jason Wheeler", title: "VP of Technology, EF Academy" },
    { text: "The entire migration finished on time, before our Tibco contract ended, and with no disruption to our daily operations.", name: "John Squier", title: "Director of Educational Technology, EF Academy" },
    { text: "He consistently finds ways to bridge the gap between design and development smoothly.", name: "Julieta Capogna", title: "Senior Designer, EF Academy" },
  ],
  stack: ["TypeScript", "React", "Next.js", "Astro", "Node.js", "Tailwind CSS", "AWS Glue", "AWS Lambda", "Storyblok", "Salesforce", "MongoDB", "Redis", "Docker"],
  roles: [
    { role: "Lead Software Engineer", org: "IncrescoTech", when: "Oct 2022 – Present" },
    { role: "Software Engineer", org: "IncrescoTech", when: "May 2022 – Sep 2022" },
    { role: "Junior Software Engineer", org: "IncrescoTech", when: "Jun 2021 – May 2022" },
  ],
};
