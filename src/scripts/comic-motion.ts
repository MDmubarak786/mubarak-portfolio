import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
// Phones get the page, not the show: native scrolling and no cover intro, so the first paint is the final frame.
const phone = matchMedia("(max-width: 767px)").matches;

if (!reduce) {
  if (fine) {
    const lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector<HTMLElement>(a.getAttribute("href")!); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.2 }); }));
  }

  // Cover: the title is the page's largest paint, so it is split into letters right away and only ever moved by
  // transforms (never faded from 0): the browser records it at first paint, and the slam-in plays on top of that.
  // With the greeting loader showing, the slam waits for the lift; without it, it plays at once.
  const title = phone ? null : document.querySelector<HTMLElement>("h1");
  const chars = title ? new SplitText(title, { type: "words,chars" }).chars : [];
  const cover = () => {
    if (phone) return;
    if (chars.length) gsap.from(chars, { y: 70, rotation: () => gsap.utils.random(-12, 12), duration: 0.7, ease: "back.out(2)", stagger: 0.03, clearProps: "transform" });
    gsap.from(".burst", { scale: 0, rotation: -180, duration: 0.9, ease: "elastic.out(1, 0.5)", delay: 0.4 });
    gsap.from("[data-cover] .btn, [data-cover] .caption", { y: 20, duration: 0.5, ease: "back.out(1.7)", stagger: 0.05, delay: 0.3, clearProps: "transform" });
  };
  if (document.documentElement.classList.contains("is-loading")) document.addEventListener("comic:ready", () => setTimeout(cover, 250), { once: true });
  else cover();

  // Panels are readable by default; each slams in once as it arrives.
  document.querySelectorAll<HTMLElement>(".panel:not([data-cover])").forEach((p) => ScrollTrigger.create({ trigger: p, start: "top 96%", once: true, onEnter: () => gsap.from(p, { y: 50, scale: 0.97, duration: 0.6, ease: "back.out(1.4)", clearProps: "transform" }) }));
  // Sound effects are readable by default; each pops once as it arrives.
  document.querySelectorAll<HTMLElement>(".sfx").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 96%", once: true, onEnter: () => gsap.from(el, { scale: 0, rotation: -30, duration: 0.8, ease: "elastic.out(1, 0.45)" }) }));
  ScrollTrigger.batch([...document.querySelectorAll<HTMLElement>(".caption")].filter((el) => !(phone && el.closest("[data-cover]"))), { start: "top 92%", once: true, onEnter: (els) => gsap.fromTo(els, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.45, ease: "power4.out", stagger: 0.05 }) });
  // Headings stay readable by default; the letters slam in once as each heading arrives (no pre-hidden state).
  document.querySelectorAll<HTMLElement>("main h2").forEach((h) => {
    ScrollTrigger.create({ trigger: h, start: "top 88%", once: true, onEnter: () => {
      // Revert the split when done: clearProps would also strip SplitText's inline-block wrappers and stack the letters.
      const split = new SplitText(h, { type: "words,chars" });
      gsap.from(split.chars, { y: "110%", rotation: 6, opacity: 0, duration: 0.6, ease: "back.out(1.8)", stagger: 0.015, onComplete: () => split.revert() });
    } });
  });
  // Speech bubbles wobble in.
  // Bubbles stay readable by default; each one only springs from its tail as it arrives.
  document.querySelectorAll<HTMLElement>(".bubble").forEach((b) => ScrollTrigger.create({ trigger: b, start: "top 96%", once: true, onEnter: () => gsap.from(b, { scale: 0.92, transformOrigin: "left bottom", duration: 0.55, ease: "back.out(1.6)" }) }));
  // Halftone background drifts slowly with scroll.
  gsap.to("body", { backgroundPositionY: 240, ease: "none", scrollTrigger: { scrub: true } });
}
