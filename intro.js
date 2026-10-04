// ─────────────────────────────────────────────────────────────
// THE GROVE OPENS — scroll-scrubbed entrance to the enchanted grove
// (adapted from the MetroHero scroll-locked video hero, rewritten as
// plain JavaScript because the site has no build step).
// The page cannot move while this is active — body is pinned with
// position:fixed. Wheel, touch and arrow-key input only push the
// camera forward through the archway of trees, or back out again:
// branches part, fireflies drift past, and the light ahead grows.
// When the path is fully open, "Enter the grove" appears; its click
// calls onEnter, which starts the logo film (a click is what lets
// the browser play the film with sound).
// ─────────────────────────────────────────────────────────────

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function mountGroveIntro(root, { onEnter, scrubDistance = 2600 } = {}) {
  const forest = root.querySelector(".grove-intro-forest");
  const glow = root.querySelector(".grove-intro-glow");
  const fireflies = root.querySelector(".grove-intro-fireflies");
  const branchesLeft = root.querySelector(".grove-intro-branches-left");
  const branchesRight = root.querySelector(".grove-intro-branches-right");
  const title = root.querySelector(".grove-intro-title");
  const tagline = root.querySelector(".grove-intro-tagline");
  const hint = root.querySelector(".grove-intro-hint");
  const progressBar = root.querySelector(".grove-intro-progress span");
  const enterButton = root.querySelector("#grove-intro-enter");

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let rafId = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let hasStartedScrolling = false;
  let entered = false;
  let enterFocused = false;
  let locked = false;
  let lockedScrollY = 0;
  let touchStartY = 0;

  // Fireflies scattered through the scene; each drifts on its own loop.
  for (let i = 0; i < 18; i += 1) {
    const fly = document.createElement("span");
    fly.style.left = `${8 + Math.random() * 84}%`;
    fly.style.top = `${12 + Math.random() * 72}%`;
    fly.style.animationDelay = `${-Math.random() * 6}s`;
    fly.style.animationDuration = `${4 + Math.random() * 4}s`;
    fly.style.setProperty("--fly-size", `${3 + Math.random() * 4}px`);
    fireflies.append(fly);
  }

  // Overflow:hidden alone isn't reliable across browsers, so pin the body the way modal libraries do.
  function engageLock() {
    if (locked) return;
    locked = true;
    lockedScrollY = window.scrollY;
    const b = document.body.style;
    b.position = "fixed";
    b.top = `-${lockedScrollY}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    b.height = "100%";
    b.overscrollBehavior = "none";
  }

  function releaseLock() {
    if (!locked) return;
    locked = false;
    const b = document.body.style;
    b.position = "";
    b.top = "";
    b.left = "";
    b.right = "";
    b.width = "";
    b.height = "";
    b.overscrollBehavior = "";
    window.scrollTo(0, lockedScrollY);
  }

  engageLock();

  function addDelta(deltaY) {
    if (entered) return;
    targetProgress = clamp(targetProgress + deltaY / scrubDistance, 0, 1);
    if (targetProgress > 0.001) hasStartedScrolling = true;
  }

  const onWheel = (e) => {
    // Firefox can report wheel movement in lines rather than pixels.
    addDelta(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
    e.preventDefault();
  };
  const onTouchStart = (e) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  };
  const onTouchMove = (e) => {
    const y = e.touches[0]?.clientY ?? touchStartY;
    addDelta((touchStartY - y) * 1.6);
    touchStartY = y;
    e.preventDefault();
  };
  const onKeyDown = (e) => {
    const step = scrubDistance * 0.08;
    if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && e.target !== enterButton)) { addDelta(step); e.preventDefault(); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { addDelta(-step); e.preventDefault(); }
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("keydown", onKeyDown);

  function render(p) {
    // Walk forward into the archway: the forest grows toward its center and brightens.
    forest.style.transform = `scale(${1 + p * 1.7})`;
    forest.style.filter = `brightness(${0.72 + p * 0.38}) saturate(${1 + p * 0.25})`;
    // Branches in the foreground part to either side as you pass them.
    branchesLeft.style.transform = `translateX(${-p * 70}%) scale(${1 + p * 0.6})`;
    branchesRight.style.transform = `translateX(${p * 70}%) scale(${1 + p * 0.6})`;
    // Fireflies are closer than the trees, so they rush past faster.
    fireflies.style.transform = `scale(${1 + p * 2.6})`;
    fireflies.style.opacity = String(0.55 + p * 0.45);
    glow.style.opacity = String(p * p);

    const t = 1 - clamp(p / 0.35, 0, 1);
    title.style.opacity = String(t);
    title.style.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`;
    title.style.filter = `blur(${(1 - t) * 10}px)`;

    hint.style.opacity = hasStartedScrolling ? "0" : "1";

    const r = clamp((p - 0.82) / 0.16, 0, 1);
    tagline.style.opacity = String(r);
    tagline.style.transform = `translateY(${(1 - r) * 20}px) scale(${0.97 + r * 0.03})`;
    tagline.style.filter = `blur(${(1 - r) * 8}px)`;
    tagline.classList.toggle("is-open", r > 0.9);
    if (r > 0.9 && !enterFocused) {
      enterFocused = true;
      enterButton.focus({ preventScroll: true });
    }

    progressBar.style.transform = `scaleX(${p})`;
  }

  function frame() {
    currentProgress += (targetProgress - currentProgress) * 0.12;
    render(currentProgress);
    rafId = requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    targetProgress = currentProgress = 1;
    hasStartedScrolling = true;
    render(1);
  } else {
    rafId = requestAnimationFrame(frame);
  }

  enterButton.addEventListener("click", () => {
    if (entered) return;
    entered = true;
    cancelAnimationFrame(rafId);
    root.classList.add("is-entered");
    window.setTimeout(() => root.remove(), 900);
    onEnter?.();
  });

  return {
    destroy() {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
      releaseLock();
      root.remove();
    }
  };
}

window.mountGroveIntro = mountGroveIntro;
