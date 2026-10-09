import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;

// --- Smooth scroll ---------------------------------------------------------
if (!reduce) {
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href")!;
      const target = id === "#top" ? 0 : document.querySelector<HTMLElement>(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -24, duration: 1.4 });
    });
  });
}

// --- Reveals ---------------------------------------------------------------
const start = () => {
  if (reduce) return;
  document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    const split = new SplitText(el, { type: "lines", linesClass: "line" });
    const inner = new SplitText(split.lines, { type: "lines" });
    gsap.set(split.lines, { overflow: "hidden" });
    gsap.from(inner.lines, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
  });
  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, { y: 32, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count), dec = Number(el.dataset.decimals ?? 0);
    const obj = { n: 0 };
    gsap.to(obj, { n: end, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onUpdate: () => { el.textContent = obj.n.toFixed(dec); } });
  });
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const amt = Number(el.dataset.parallax ?? 0.1) * 100;
    gsap.to(el, { yPercent: amt, ease: "none", scrollTrigger: { trigger: el.closest("section") ?? el, start: "top top", end: "bottom top", scrub: true } });
  });
  // Sticky CTA after the hero.
  const cta = document.querySelector<HTMLElement>("[data-sticky-cta]");
  if (cta) {
    const footer = document.getElementById("contact");
    let pastHero = false, inFooter = false;
    const apply = () => { if (pastHero && !inFooter) cta.setAttribute("data-show", ""); else cta.removeAttribute("data-show"); };
    ScrollTrigger.create({ start: "80% top", onToggle: (self) => { pastHero = self.isActive; apply(); } });
    if (footer) ScrollTrigger.create({ trigger: footer, start: "top 85%", onToggle: (self) => { inFooter = self.isActive; apply(); } });
  }
};
if (document.documentElement.classList.contains("is-loading")) {
  const obs = new MutationObserver(() => { if (document.documentElement.classList.contains("is-ready")) { obs.disconnect(); start(); } });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
} else start();

// --- Magnetic buttons ------------------------------------------------------
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * 0.35); yTo((e.clientY - (r.top + r.height / 2)) * 0.35); });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

// --- Work preview that follows the cursor ---------------------------------
if (fine && !reduce) {
  const preview = document.querySelector<HTMLElement>("[data-preview]");
  if (preview) {
    const metric = preview.querySelector("[data-preview-metric]")!, title = preview.querySelector("[data-preview-title]")!, kind = preview.querySelector("[data-preview-kind]")!;
    const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" }), yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });
    document.querySelectorAll<HTMLDetailsElement>("[data-work]").forEach((d) => {
      const summary = d.querySelector("summary")!;
      summary.addEventListener("pointerenter", () => {
        if (d.open) return;
        metric.textContent = d.dataset.metric ?? ""; title.textContent = d.dataset.title ?? ""; kind.textContent = d.dataset.kind ?? "";
        preview.style.setProperty("--hue", getComputedStyle(d.closest(".work-row")!).getPropertyValue("--hue"));
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out", overwrite: true });
      });
      summary.addEventListener("pointerleave", () => gsap.to(preview, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power3.out", overwrite: true }));
      summary.addEventListener("click", () => gsap.to(preview, { opacity: 0, duration: 0.2 }));
    });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX - 176); yTo(e.clientY - 132); }, { passive: true });
  }
}
