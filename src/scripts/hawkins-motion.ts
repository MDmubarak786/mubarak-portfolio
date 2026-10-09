import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The alphabet wall spells the ask. With reduced motion the letters stay lit. */
const wall = document.querySelector<HTMLElement>("[data-wall]");
const word = "HIRE ME";
const letterEls = (ch: string) => wall ? [...wall.querySelectorAll<HTMLElement>(`[data-letter="${ch}"]`)] : [];
if (wall && reduce) for (const ch of word.replace(" ", "")) letterEls(ch).forEach((el) => el.classList.add("on"));

if (!reduce) {
  const lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector<HTMLElement>(a.getAttribute("href")!); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.2 }); }));

  // Title card: letters drift in from far and settle, then the tube flickers once.
  const title = document.querySelector<HTMLElement>("[data-title]");
  if (title) {
    const chars = new SplitText(title, { type: "words,chars" }).chars;
    const tl = gsap.timeline();
    tl.from(chars, { scale: 1.9, opacity: 0, x: (i, _el, arr) => (i - arr.length / 2) * 42, filter: "blur(10px)", duration: 1.7, ease: "power3.out", stagger: { each: 0.035, from: "edges" } })
      .to(title, { opacity: 0.25, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, "-=0.2")
      .to(title, { opacity: 1, duration: 0.1 });
  }
  gsap.from("[data-cover] .polaroid, [data-cover] .btn, [data-cover] .pron", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.06, delay: 1.4 });

  // Cards and files are readable by default; each one rises once as it arrives.
  document.querySelectorAll<HTMLElement>("main .card, main .paper, main .tape").forEach((p) => ScrollTrigger.create({ trigger: p, start: "top 94%", once: true, onEnter: () => gsap.from(p, { y: 36, opacity: 0, duration: 0.7, ease: "power3.out", clearProps: "transform,opacity" }) }));
  // Episode titles surface out of the dark.
  document.querySelectorAll<HTMLElement>("main .h2").forEach((h) => ScrollTrigger.create({ trigger: h, start: "top 88%", once: true, onEnter: () => gsap.from(h, { filter: "blur(8px)", opacity: 0, y: 12, duration: 0.9, ease: "power3.out", clearProps: "filter,opacity,transform" }) }));
  // Walkie lines crackle in.
  document.querySelectorAll<HTMLElement>(".walkie").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 96%", once: true, onEnter: () => gsap.from(el, { opacity: 0, x: -8, duration: 0.35, repeat: 2, yoyo: true, ease: "none" }) }));

  // The wall: spell HIRE ME letter by letter while it is on screen.
  if (wall) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true });
    const all = [...wall.querySelectorAll<HTMLElement>("li")];
    for (const ch of word) {
      if (ch === " ") { tl.to({}, { duration: 0.5 }); continue; }
      const els = letterEls(ch);
      tl.call(() => els.forEach((el) => el.classList.add("on"))).to({}, { duration: 0.55 }).call(() => els.forEach((el) => el.classList.remove("on"))).to({}, { duration: 0.18 });
    }
    tl.call(() => { for (const ch of word.replace(" ", "")) letterEls(ch).forEach((el) => el.classList.add("on")); }).to({}, { duration: 1.4 }).call(() => all.forEach((el) => el.classList.remove("on")));
    ScrollTrigger.create({ trigger: wall, start: "top 90%", end: "bottom top", onEnter: () => tl.play(), onEnterBack: () => tl.play(), onLeave: () => tl.pause(), onLeaveBack: () => tl.pause() });
  }

  // Spores drifting through the dark.
  const canvas = document.querySelector<HTMLCanvasElement>("[data-spores]");
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx) {
    let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    const N = innerWidth < 640 ? 34 : 70;
    const ps = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 0.00012, vy: -0.00006 - Math.random() * 0.00014, a: 0.15 + Math.random() * 0.45, t: Math.random() * 6.28 }));
    const resize = () => { w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); addEventListener("resize", resize);
    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
    let last = performance.now();
    const tick = (now: number) => {
      requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(50, now - last); last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.t += dt * 0.0015; p.x += p.vx * dt + Math.sin(p.t) * 0.00004; p.y += p.vy * dt;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02;
        const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r * 3);
        g.addColorStop(0, `rgba(243,239,230,${p.a})`); g.addColorStop(1, "rgba(243,239,230,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * 3, 0, 6.283); ctx.fill();
      }
    };
    requestAnimationFrame(tick);
  }
}
