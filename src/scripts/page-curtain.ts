import gsap from "gsap";
/** A curtain wipes in before leaving the page and wipes out on arrival. Colour comes from --curtain on <html>. */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const el = document.createElement("div");
el.setAttribute("aria-hidden", "true");
el.style.cssText = "position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--curtain,#0b0b0c);transform:scaleY(0);transform-origin:top";
document.body.appendChild(el);

if (!reduce && sessionStorage.getItem("curtain") === "1") {
  sessionStorage.removeItem("curtain");
  gsap.set(el, { scaleY: 1, transformOrigin: "top" });
  gsap.to(el, { scaleY: 0, duration: 0.7, ease: "power4.inOut", delay: 0.05 });
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
  gsap.fromTo(el, { scaleY: 0, transformOrigin: "bottom" }, { scaleY: 1, duration: 0.55, ease: "power4.inOut", onComplete: () => { location.href = url.href; } });
});
