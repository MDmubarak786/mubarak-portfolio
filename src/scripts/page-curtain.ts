/** A curtain wipes in before leaving the page and wipes out on arrival. Colour comes from --curtain on <html>.
 *  Plain CSS transitions: this runs on every page, so it must not pull GSAP into its own request. */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = "transform .6s cubic-bezier(.77,0,.18,1)";
const el = document.createElement("div");
el.setAttribute("aria-hidden", "true");
el.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--curtain,#0b0b0c);transform:scaleY(0);transform-origin:top;transition:${ease}`;
document.body.appendChild(el);

let leaving = false;
/** Raise the curtain off the page: animated from fully closed, or instantly. No requestAnimationFrame: a tab the
 *  browser considers hidden never runs one, which would leave the page covered. A forced style flush commits the
 *  closed state instead, and a hidden tab simply gets the open state. */
const lift = (animate: boolean) => {
  leaving = false;
  el.style.pointerEvents = "none";
  el.style.transformOrigin = "top";
  el.style.transition = "none";
  if (!animate || document.hidden) { el.style.transform = "scaleY(0)"; return; }
  el.style.transform = "scaleY(1)";
  void el.getBoundingClientRect();
  el.style.transition = ease;
  el.style.transform = "scaleY(0)";
};

if (!reduce && sessionStorage.getItem("curtain") === "1") { sessionStorage.removeItem("curtain"); lift(true); }

// Back and Forward can restore this page from the browser's memory exactly as it was left: with the curtain down.
// Nothing re-runs on a restore except `pageshow`, so lift it there.
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  sessionStorage.removeItem("curtain");
  lift(!reduce);
});

document.addEventListener("click", (e) => {
  if (reduce || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  // Files (the résumé PDF, RSS, sitemap, llms.txt, images) open as they are, without the curtain.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return;
  e.preventDefault();
  leaving = true;
  sessionStorage.setItem("curtain", "1");
  el.style.pointerEvents = "auto";
  el.style.transformOrigin = "bottom";
  el.style.transition = ease;
  let gone = false;
  const go = () => { if (gone) return; gone = true; location.href = url.href; };
  el.addEventListener("transitionend", go, { once: true });
  setTimeout(go, 750); // never wait on the animation: a hidden tab or an interrupted transition may not report back
  el.style.transform = "scaleY(1)";
});
