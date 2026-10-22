document.documentElement.classList.add("js-ready");

const hero = document.querySelector(".hero");
const specials = document.querySelector(".specials");
const shelf = document.querySelector(".shelf");
const items = shelf ? [...shelf.querySelectorAll(".item")] : [];

const thresholdScene = document.querySelector("[data-threshold-scene]");
const shotButtons = [...document.querySelectorAll("[data-threshold-shot]")];
const shotPanels = [...document.querySelectorAll("[data-shot-panel]")];
const toggleMotionBtn = document.querySelector("[data-threshold-toggle]");
const shotVideos = [...document.querySelectorAll("[data-threshold-video]")];

const motionQuery = matchMedia("(prefers-reduced-motion: no-preference)");
const fineDesktopQuery = matchMedia("(min-width: 900px) and (pointer: fine)");

let activeShot = "1";
let userMotionOverride = null; // null | "play" | "pause"
let userLockedShot = false;
let thresholdInView = false;

function isMotionEnabled() {
  if (userMotionOverride === "play") return true;
  if (userMotionOverride === "pause") return false;
  return motionQuery.matches;
}

function syncThresholdPlayback() {
  const motionEnabled = isMotionEnabled();
  const allowPlay = motionEnabled && thresholdInView;
  shotVideos.forEach((video) => {
    const id = video.getAttribute("data-threshold-video");
    if (allowPlay && id === activeShot) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
  if (toggleMotionBtn) {
    const isPaused = !motionEnabled;
    toggleMotionBtn.textContent = isPaused ? "Play motion" : "Pause motion";
    toggleMotionBtn.setAttribute("aria-pressed", isPaused ? "true" : "false");
  }
}

function setActiveShot(shotId, mixValue = shotId === "2" ? 1 : 0) {
  activeShot = String(shotId);
  if (thresholdScene) {
    thresholdScene.setAttribute("data-active-shot", activeShot);
    thresholdScene.style.setProperty("--threshold-mix", Number(mixValue).toFixed(3));
  }
  shotButtons.forEach((btn) => {
    const isMatch = btn.getAttribute("data-threshold-shot") === activeShot;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  });
  shotPanels.forEach((panel) => {
    const isMatch = panel.getAttribute("data-shot-panel") === activeShot;
    panel.setAttribute("aria-hidden", isMatch ? "false" : "true");
    panel.inert = !isMatch;
  });
  syncThresholdPlayback();
}

shotButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    userLockedShot = true;
    const targetShot = btn.getAttribute("data-threshold-shot") || "1";
    setActiveShot(targetShot, targetShot === "2" ? 1 : 0);
  });
});

if (toggleMotionBtn) {
  toggleMotionBtn.addEventListener("click", () => {
    userMotionOverride = isMotionEnabled() ? "pause" : "play";
    syncThresholdPlayback();
  });
}

motionQuery.addEventListener("change", () => {
  syncThresholdPlayback();
});

if (thresholdScene && "IntersectionObserver" in window) {
  const thresholdIO = new IntersectionObserver(
    ([entry]) => {
      thresholdInView = Boolean(entry && entry.isIntersecting);
      syncThresholdPlayback();
    },
    { threshold: 0.25 },
  );
  thresholdIO.observe(thresholdScene);
}

setActiveShot("1", 0);

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add("(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    const triggers = [];
    let lenis = null;
    let lenisRaf = null;
    const anchorCleanups = [];

    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      lenisRaf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(lenisRaf);
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        const onClick = (e) => {
          const target = document.querySelector(a.getAttribute("href"));
          if (!target || !lenis) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0 });
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        };
        a.addEventListener("click", onClick);
        anchorCleanups.push(() => a.removeEventListener("click", onClick));
      });
    }

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

    if (thresholdScene) {
      thresholdScene.classList.add("is-scroll-linked");
      const thresholdTrigger = ScrollTrigger.create({
        trigger: thresholdScene,
        start: "top 72%",
        end: "bottom 38%",
        scrub: 0.4,
        onUpdate: (self) => {
          if (userLockedShot) return;
          const mix = gsap.utils.clamp(0, 1, (self.progress - 0.25) / 0.5);
          const nextShot = mix >= 0.5 ? "2" : "1";
          setActiveShot(nextShot, mix);
        },
      });
      triggers.push(thresholdTrigger);
    }

    return () => {
      if (swingRaf) cancelAnimationFrame(swingRaf);
      triggers.forEach((t) => t.kill());
      anchorCleanups.forEach((fn) => fn());
      if (lenisRaf) gsap.ticker.remove(lenisRaf);
      if (lenis) lenis.destroy();
      if (hero) {
        hero.classList.remove("is-door-scene");
        hero.style.removeProperty("--door-open");
      }
      if (thresholdScene) {
        thresholdScene.classList.remove("is-scroll-linked");
        thresholdScene.style.setProperty("--threshold-mix", activeShot === "2" ? "1" : "0");
      }
      if (shelf) shelf.style.removeProperty("--tag-swing");
      items.forEach((item) => item.style.removeProperty("--item-y"));
    };
  });
}

if (shelf && "IntersectionObserver" in window && (!fineDesktopQuery.matches && motionQuery.matches)) {
  // Phones and coarse pointers with motion enabled get a single gentle swing as the window scrolls into view.
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
