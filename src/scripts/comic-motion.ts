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

  // Panels are readable by default; each slams in once as it arrives.
  document.querySelectorAll<HTMLElement>(".panel:not([data-cover])").forEach((p) => ScrollTrigger.create({ trigger: p, start: "top 96%", once: true, onEnter: () => gsap.from(p, { y: 50, scale: 0.97, duration: 0.6, ease: "back.out(1.4)", clearProps: "transform" }) }));
  // Sound effects are readable by default; each pops once as it arrives.
  document.querySelectorAll<HTMLElement>(".sfx").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 96%", once: true, onEnter: () => gsap.from(el, { scale: 0, rotation: -30, duration: 0.8, ease: "elastic.out(1, 0.45)" }) }));
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
