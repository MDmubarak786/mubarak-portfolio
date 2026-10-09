import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;

if (!reduce) {
  const lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector<HTMLElement>(a.getAttribute("href")!); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.2 }); }));

  // Cover: title letters slam in, sticker spins, buttons pop.
  const title = document.querySelector<HTMLElement>("h1");
  if (title) {
    const chars = new SplitText(title, { type: "words,chars" }).chars;
    gsap.from(chars, { y: 80, rotation: () => gsap.utils.random(-14, 14), opacity: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.03, delay: 0.1 });
  }
  gsap.from(".burst", { scale: 0, rotation: -180, duration: 0.9, ease: "elastic.out(1, 0.5)", delay: 0.6 });
  gsap.from("header + main > section:first-child .btn, header + main > section:first-child .caption", { y: 20, opacity: 0, duration: 0.5, ease: "back.out(1.7)", stagger: 0.06, delay: 0.5 });

  // Panels slam in as they arrive, in batches.
  ScrollTrigger.batch(".panel:not(header + main > section:first-child)", {
    start: "top 88%", once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 60, rotation: -3, scale: 0.94, opacity: 0 }, { y: 0, rotation: (i, el) => Number(getComputedStyle(el).getPropertyValue("--tilt") || 0), scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.08, clearProps: "rotation,scale" }),
  });
  // Sound effects pop, captions stamp, chapter titles bounce in by letter.
  ScrollTrigger.batch(".sfx", { start: "top 90%", once: true, onEnter: (els) => gsap.fromTo(els, { scale: 0, rotation: -30 }, { scale: 1, rotation: -8, duration: 0.8, ease: "elastic.out(1, 0.45)", stagger: 0.1 }) });
  ScrollTrigger.batch(".caption", { start: "top 92%", once: true, onEnter: (els) => gsap.fromTo(els, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.45, ease: "power4.out", stagger: 0.05 }) });
  document.querySelectorAll<HTMLElement>("main h2").forEach((h) => {
    const chars = new SplitText(h, { type: "words,chars" }).chars;
    gsap.from(chars, { y: "110%", rotation: 6, opacity: 0, duration: 0.6, ease: "back.out(1.8)", stagger: 0.015, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });
  // Speech bubbles wobble in.
  // Bubbles stay readable by default; each one only springs from its tail as it arrives.
  document.querySelectorAll<HTMLElement>(".bubble").forEach((b) => ScrollTrigger.create({ trigger: b, start: "top 96%", once: true, onEnter: () => gsap.from(b, { scale: 0.92, transformOrigin: "left bottom", duration: 0.55, ease: "back.out(1.6)" }) }));
  // Halftone background drifts slowly with scroll.
  gsap.to("body", { backgroundPositionY: 240, ease: "none", scrollTrigger: { scrub: true } });
}
// Hover tilt on panels, desktop only.
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>(".panel").forEach((p) => {
    const rx = gsap.quickTo(p, "rotationX", { duration: 0.5, ease: "power3" }), ry = gsap.quickTo(p, "rotationY", { duration: 0.5, ease: "power3" });
    gsap.set(p, { transformPerspective: 900 });
    p.addEventListener("pointermove", (e) => { const r = p.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 6); rx(-((e.clientY - r.top) / r.height - 0.5) * 6); });
    p.addEventListener("pointerleave", () => { rx(0); ry(0); });
  });
}
