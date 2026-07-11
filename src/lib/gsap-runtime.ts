import gsap from "gsap";

// animal-island-ui bundles GSAP 3.2.6 and only installs it when no global core exists.
if (typeof window !== "undefined") {
  (window as Window & { gsap?: typeof gsap }).gsap = gsap;
}
