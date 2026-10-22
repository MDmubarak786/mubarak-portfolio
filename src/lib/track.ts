/** One event for everything a reader does on the comic: `mk_action` on the data layer with an area, an action and a
 *  label. Tag Manager forwards it to GA4 (tag "GA4 - mk_action"); GA4 derives contact_click, resume_open, case_opened
 *  and witness_read from it as key events. Pushes queue in the array until the tag loads on first interaction, and
 *  nothing here carries personal data: a submitted birthday counts as "submit", never the date. */
export type Area = "cover" | "header" | "cases" | "witnesses" | "origin" | "powers" | "getaway" | "offpanel" | "guest" | "resume" | "sound" | "contact" | "strip";
export const track = (area: Area | string, action: string, label = "") => {
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    (w.dataLayer ||= []).push({ event: "mk_action", area, action, label: String(label).slice(0, 100) });
  } catch {}
};
/** Which reader-facing destination a link points at, for contact_click. */
export const linkKind = (href: string) => {
  if (href.startsWith("mailto:")) return "email";
  if (href.startsWith("tel:")) return "call";
  if (/wa\.me|whatsapp/.test(href)) return "whatsapp";
  if (/linkedin\.com/.test(href)) return "linkedin";
  if (/github\.com/.test(href)) return "github";
  if (/x\.com|twitter\.com/.test(href)) return "x";
  if (/instagram\.com/.test(href)) return "instagram";
  if (/youtube\.com|youtu\.be/.test(href)) return "youtube";
  return "";
};
