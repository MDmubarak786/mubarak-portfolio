// The motion bundle (GSAP + Lenis, ~55 KB) is imported only after `load`, so it never competes with the fonts and the
// portrait for bandwidth before the first paint. Nothing on the page is hidden until it runs: reveals and the cover slam
// animate from the already-painted state, and `comic-motion-impl` plays the slam at once if the loader has finished.
const start = () => { void import("./comic-motion-impl"); };
if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
