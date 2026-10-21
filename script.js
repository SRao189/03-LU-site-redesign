const hero = document.querySelector(".hero");
const specials = document.querySelector(".specials");
const shelf = document.querySelector(".shelf");
const items = shelf ? [...shelf.querySelectorAll(".item")] : [];

const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;
const fineDesktop = matchMedia("(min-width: 900px) and (pointer: fine)").matches;

if (window.gsap && window.ScrollTrigger && motionOK && fineDesktop) {
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }),
    );
  }

  gsap.matchMedia().add("(min-width: 900px) and (pointer: fine)", () => {
    const triggers = [];

    if (hero) {
      hero.classList.add("is-door-scene");
      const doorTrigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "+=70%",
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          hero.style.setProperty("--door-open", self.progress.toFixed(3));
        },
      });
      hero.style.setProperty("--door-open", doorTrigger.progress >= 1 ? "1" : "0");
      triggers.push(doorTrigger);
    }

    let swingRaf = 0;
    let angle = 0;
    let angleVel = 0;
    let targetImpulse = 0;

    function tickSwing() {
      angleVel += (targetImpulse - angle) * 0.16;
      angleVel *= 0.8;
      angle += angleVel;
      targetImpulse *= 0.72;
      if (shelf) {
        shelf.style.setProperty("--tag-swing", `${angle.toFixed(2)}deg`);
      }
      if (Math.abs(angle) > 0.05 || Math.abs(angleVel) > 0.05 || Math.abs(targetImpulse) > 0.05) {
        swingRaf = requestAnimationFrame(tickSwing);
      } else {
        swingRaf = 0;
        if (shelf) shelf.style.setProperty("--tag-swing", "0deg");
      }
    }

    if (specials && shelf && items.length) {
      const depths = [-20, 14, -26];
      const windowTrigger = ScrollTrigger.create({
        trigger: specials,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const centered = (self.progress - 0.5) * 2;
          items.forEach((item, i) => {
            const shift = centered * (depths[i % depths.length] || 0);
            item.style.setProperty("--item-y", `${shift.toFixed(1)}px`);
          });
          const v = gsap.utils.clamp(-1800, 1800, self.getVelocity());
          targetImpulse = gsap.utils.clamp(-14, 14, -v * 0.009);
          if (!swingRaf) {
            swingRaf = requestAnimationFrame(tickSwing);
          }
        },
      });
      triggers.push(windowTrigger);
    }

    return () => {
      if (swingRaf) cancelAnimationFrame(swingRaf);
      triggers.forEach((t) => t.kill());
      if (hero) {
        hero.classList.remove("is-door-scene");
        hero.style.removeProperty("--door-open");
      }
      if (shelf) shelf.style.removeProperty("--tag-swing");
      items.forEach((item) => item.style.removeProperty("--item-y"));
    };
  });
} else if (shelf && "IntersectionObserver" in window) {
  // Phones and coarse pointers get a single gentle swing as the window scrolls into view.
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      shelf.classList.add("is-swinging");
      io.disconnect();
    },
    { threshold: 0.4 },
  );
  io.observe(shelf);
}
