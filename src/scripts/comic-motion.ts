import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const WIPE_IN = "inset(-14px -14px -14px 0px)";
const WIPE_OUT = "inset(-14px 100% -14px 0px)";

if (!reduce) {
  const lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector<HTMLElement>(a.getAttribute("href")!); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.2 }); }));

  // ---- Ink progress line and page counter --------------------------------
  const ink = document.querySelector<HTMLElement>("[data-ink-progress]");
  if (ink) gsap.to(ink, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  const counter = document.querySelector<HTMLElement>("[data-page-counter]");
  const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));
  pages.forEach((sec, i) => ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: (self) => { if (self.isActive && counter) { counter.textContent = `${sec.dataset.page} · ${i + 1} of ${pages.length}`; gsap.fromTo(counter, { scale: 1.15 }, { scale: 1, duration: 0.3, ease: "power3.out" }); } } }));

  // ---- Cover: letters slam in once, then the cover parts in parallax ------
  const title = document.querySelector<HTMLElement>("h1");
  if (title) gsap.from(new SplitText(title, { type: "chars" }).chars, { y: 80, rotation: () => gsap.utils.random(-14, 14), opacity: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.03, delay: 0.1 });
  gsap.from(".burst", { scale: 0, rotation: -180, duration: 0.9, ease: "elastic.out(1, 0.5)", delay: 0.6 });
  const cover = document.querySelector<HTMLElement>("[data-cover]");
  if (cover) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: cover, start: "top top", end: "bottom top", scrub: true } });
    tl.to(cover.querySelector("h1"), { y: -60, ease: "none" }, 0).to(cover.querySelector(".burst"), { rotation: 40, y: -30, ease: "none" }, 0).to(cover.querySelector("img"), { y: 40, ease: "none" }, 0);
  }

  // ---- The focal moment: Chapter 1 reads as a strip ------------------------
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    const section = document.getElementById("migration")!;
    const strip = section.querySelector<HTMLElement>("[data-strip]")!;
    const fill = section.querySelector<HTMLElement>("[data-strip-progress]");
    const distance = () => strip.scrollWidth - section.clientWidth;
    const tween = gsap.to(strip, {
      x: () => -distance(), ease: "none",
      scrollTrigger: { trigger: section, pin: true, scrub: 0.5, start: "top 72px", end: () => "+=" + distance(), invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (self) => { if (fill) fill.style.transform = `scaleX(${self.progress})`; } },
    });
    strip.querySelectorAll<HTMLElement>(".strip-panel").forEach((panel) => {
      gsap.fromTo(panel, { clipPath: WIPE_OUT }, { clipPath: WIPE_IN, ease: "none", scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 95%", end: "left 48%", scrub: true } });
      const sfx = panel.querySelector(".sfx");
      if (sfx) { gsap.set(sfx, { scale: 0, rotation: -30 }); ScrollTrigger.create({ trigger: panel, containerAnimation: tween, start: "left 60%", once: true, onEnter: () => gsap.to(sfx, { scale: 1, rotation: -8, duration: 0.8, ease: "elastic.out(1, 0.45)" }) }); }
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  });
  mm.add("(max-width: 767px)", () => {
    document.querySelectorAll<HTMLElement>(".strip-panel .sfx").forEach((sfx) => { gsap.set(sfx, { scale: 0, rotation: -30 }); ScrollTrigger.create({ trigger: sfx, start: "top 85%", once: true, onEnter: () => gsap.to(sfx, { scale: 1, rotation: -8, duration: 0.8, ease: "elastic.out(1, 0.45)" }) }); });
  });

  // ---- Every other panel is inked in by the scroll itself ------------------
  document.querySelectorAll<HTMLElement>(".panel:not(.strip-panel):not([data-cover])").forEach((p) => {
    gsap.fromTo(p, { clipPath: WIPE_OUT }, { clipPath: WIPE_IN, ease: "none", scrollTrigger: { trigger: p, start: "top 96%", end: "top 58%", scrub: true } });
  });
  // Sound effects outside the strip, captions, bubbles, chapter titles.
  document.querySelectorAll<HTMLElement>(".sfx").forEach((el) => { if (el.closest(".strip-panel")) return; gsap.set(el, { scale: 0, rotation: -30 }); ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => gsap.to(el, { scale: 1, rotation: -8, duration: 0.8, ease: "elastic.out(1, 0.45)" }) }); });
  ScrollTrigger.batch(".caption", { start: "top 94%", once: true, onEnter: (els) => gsap.fromTo(els, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.45, ease: "power4.out", stagger: 0.05 }) });
  document.querySelectorAll<HTMLElement>(".bubble").forEach((b) => gsap.fromTo(b, { scale: 0.9, opacity: 0, transformOrigin: "left bottom" }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: b, start: "top 95%", end: "top 70%", scrub: true } }));
  document.querySelectorAll<HTMLElement>("main h2").forEach((h) => {
    const chars = new SplitText(h, { type: "chars" }).chars;
    gsap.from(chars, { y: "110%", rotation: 6, opacity: 0, duration: 0.6, ease: "back.out(1.8)", stagger: 0.015, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });
  gsap.to("body", { backgroundPositionY: 240, ease: "none", scrollTrigger: { scrub: true } });
}
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>(".panel:not(.strip-panel)").forEach((p) => {
    const rx = gsap.quickTo(p, "rotationX", { duration: 0.5, ease: "power3" }), ry = gsap.quickTo(p, "rotationY", { duration: 0.5, ease: "power3" });
    gsap.set(p, { transformPerspective: 900 });
    p.addEventListener("pointermove", (e) => { const r = p.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 6); rx(-((e.clientY - r.top) / r.height - 0.5) * 6); });
    p.addEventListener("pointerleave", () => { rx(0); ry(0); });
  });
}
