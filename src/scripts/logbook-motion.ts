import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduce) {
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector<HTMLElement>(a.getAttribute("href")!); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.3 }); }));

  // Handwriting: headings write themselves in, letter by letter.
  document.querySelectorAll<HTMLElement>("h1.hand, h2.hand, h3.hand, p.hand, dt.hand").forEach((h) => {
    const chars = new SplitText(h, { type: "chars" }).chars;
    gsap.from(chars, { opacity: 0, y: 6, duration: 0.25, ease: "power1.out", stagger: 0.018, scrollTrigger: { trigger: h, start: "top 90%", once: true } });
  });
  // Sheets settle onto the desk.
  ScrollTrigger.batch(".book", { start: "top 90%", once: true, onEnter: (els) => gsap.fromTo(els, { y: 50, opacity: 0, rotation: 0.4 }, { y: 0, opacity: 1, rotation: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }) });
  // Stamps slam down.
  ScrollTrigger.batch(".stamp", { start: "top 92%", once: true, onEnter: (els) => els.forEach((el, i) => {
    const base = (el as HTMLElement).className.includes("ok") ? -6 : -6;
    gsap.timeline({ delay: i * 0.12 }).fromTo(el, { scale: 2.4, opacity: 0, rotation: base - 12 }, { scale: 1, opacity: 0.85, rotation: base, duration: 0.45, ease: "power4.in" }).to(el, { x: -2, duration: 0.05, yoyo: true, repeat: 3 });
  }) });
  // Photos swing on their tape.
  ScrollTrigger.batch(".photo", { start: "top 90%", once: true, onEnter: (els) => gsap.fromTo(els, { rotation: -12, transformOrigin: "50% 0%", opacity: 0 }, { rotation: -3, opacity: 1, duration: 1.4, ease: "elastic.out(1, 0.35)", stagger: 0.1 }) });
  // Kit list ticks and calendar cells.
  ScrollTrigger.batch(".tick", { start: "top 92%", once: true, onEnter: (els) => gsap.from(els, { x: -12, opacity: 0, duration: 0.4, ease: "power2.out", stagger: 0.04 }) });
  const cal = document.querySelector("svg[role=img]");
  if (cal) gsap.from(cal.querySelectorAll("rect"), { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)", stagger: { each: 0.0025, from: "start" }, scrollTrigger: { trigger: cal, start: "top 90%", once: true } });
  // Log entries write in line by line.
  document.querySelectorAll<HTMLElement>("#log ol > li").forEach((li, i) => gsap.from(li, { x: -20, opacity: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: li, start: "top 90%", once: true } }));
  // Canvas cover texture drifts with scroll.
  gsap.to("body", { backgroundPositionY: 300, ease: "none", scrollTrigger: { scrub: true } });
}
