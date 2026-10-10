/** A curtain wipes in before leaving the page and wipes out on arrival. Colour comes from --curtain on <html>.
 *  Plain CSS transitions: this runs on every page, so it must not pull GSAP into its own request. */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = "transform .6s cubic-bezier(.77,0,.18,1)";
const el = document.createElement("div");
el.setAttribute("aria-hidden", "true");
el.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--curtain,#0b0b0c);transform:scaleY(0);transform-origin:top;transition:${ease}`;
document.body.appendChild(el);

if (!reduce && sessionStorage.getItem("curtain") === "1") {
  sessionStorage.removeItem("curtain");
  el.style.transition = "none";
  el.style.transform = "scaleY(1)";
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ease; el.style.transform = "scaleY(0)"; }));
}
document.addEventListener("click", (e) => {
  if (reduce) return;
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (!a || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  e.preventDefault();
  sessionStorage.setItem("curtain", "1");
  el.style.pointerEvents = "auto";
  el.style.transformOrigin = "bottom";
  el.addEventListener("transitionend", () => { location.href = url.href; }, { once: true });
  el.style.transform = "scaleY(1)";
});
