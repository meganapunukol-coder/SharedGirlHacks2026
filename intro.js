// ─────────────────────────────────────────────────────────────
// THE GROVE OPENS — locked scroll-scrub video entrance
// (adapted from the MetroHero scroll-locked video hero, rewritten as
// plain JavaScript because the site has no build step).
// The page cannot move while this is active — body is pinned with
// position:fixed. Wheel, touch and arrow-key input only move the
// forest walkthrough video forward and backward, while
// "Start Your Adventure" stays fixed in the center. When the walk
// reaches the end, "Enter the grove" appears; its click calls onEnter,
// which starts the logo film (a click is what lets the browser play
// the film with sound).
// ─────────────────────────────────────────────────────────────

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function mountGroveIntro(root, { onEnter, scrubDistance = 3200 } = {}) {
  const video = root.querySelector(".grove-intro-walk");
  const hint = root.querySelector(".grove-intro-hint");
  const center = root.querySelector(".grove-intro-center");
  const progressBar = root.querySelector(".grove-intro-progress span");
  const enterButton = root.querySelector("#grove-intro-enter");

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let duration = 0;
  let rafId = 0;
  let targetProgress = 0;
  let hasStartedScrolling = false;
  let isSeeking = false;
  let entered = false;
  let enterFocused = false;
  let locked = false;
  let lockedScrollY = 0;
  let touchStartY = 0;

  const onLoadedData = () => {
    duration = video.duration || 0;
    root.classList.add("is-ready");
    if (reduceMotion) video.currentTime = duration * 0.92;
  };
  video.addEventListener("loadeddata", onLoadedData);

  // iOS Safari often won't buffer any video data until playback starts, so force a silent
  // play-then-pause to kick off real loading.
  video.play()?.then(() => { if (targetProgress === 0) video.pause(); }).catch(() => {});

  const onSeeked = () => { isSeeking = false; };
  video.addEventListener("seeked", onSeeked);

  // Seeking an MP4 frame by frame snaps between keyframes and looks shaky, so walking forward
  // actually plays the video, speeding up or slowing down to catch up with the scroll, and
  // pauses once it arrives. Only walking backward seeks, since browsers cannot play in reverse.
  let lastRate = 1;
  function followScroll() {
    if (duration <= 0 || isSeeking) return;
    // Stop just short of the end: calling play() on an ended video would restart it from 0.
    const targetTime = Math.min(targetProgress * duration, duration - 0.06);
    const gap = targetTime - video.currentTime;
    if (gap > 0.04) {
      const rate = clamp(Math.round(gap * 2 * 4) / 4, 0.5, 3);
      if (rate !== lastRate) { video.playbackRate = rate; lastRate = rate; }
      if (video.paused) video.play().catch(() => {});
    } else if (gap < -0.25) {
      video.pause();
      isSeeking = true;
      video.currentTime = Math.max(0, targetTime);
    } else if (!video.paused) {
      video.pause();
    }
  }

  // The walkthrough has dark bars baked into the edges of its frames, which object-fit: cover
  // cannot remove. Measure them on the first frame, then zoom the video just enough to push
  // the bars off-screen.
  let content = null; // the picture inside the bars, as fractions of the frame: { left, right, top, bottom }
  function measureBars() {
    try {
      const w = 320, h = 180;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const lum = (x, y) => { const i = (y * w + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
      // The bars are a flat dark gray (not black), so a bar is a line of pixels that barely
      // varies, while lines through the forest vary a lot. Measured on this video, bar lines
      // have a spread of 0–4 and picture lines 5 or more.
      const isFlat = (values) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) < 4.5;
      };
      // The bottom edge is instead a smear: the last line of the picture repeated downward, so
      // each line there is a near copy of the next line inward.
      const nearlySame = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length < 1.5;
      const column = (x) => Array.from({ length: h }, (_, y) => lum(x, y));
      const row = (y) => Array.from({ length: w }, (_, x) => lum(x, y));
      const columnIsBar = (x, inward) => isFlat(column(x)) || nearlySame(column(x), column(inward));
      const rowIsBar = (y, inward) => isFlat(row(y)) || nearlySame(row(y), row(inward));
      let left = 0, right = w - 1, top = 0, bottom = h - 1;
      while (left < w / 2 && columnIsBar(left, left + 1)) left += 1;
      while (right > w / 2 && columnIsBar(right, right - 1)) right -= 1;
      while (top < h / 2 && rowIsBar(top, top + 1)) top += 1;
      while (bottom > h / 2 && rowIsBar(bottom, bottom - 1)) bottom -= 1;
      // Trim one more line on each side that had a bar, to hide the soft edge where it meets the picture.
      if (left > 0) left += 1;
      if (right < w - 1) right -= 1;
      if (top > 0) top += 1;
      if (bottom < h - 1) bottom -= 1;
      // Ignore implausible results, such as a frame that is dark all over.
      if ((right - left + 1) / w > 0.4 && (bottom - top + 1) / h > 0.4) {
        content = { left: left / w, right: (right + 1) / w, top: top / h, bottom: (bottom + 1) / h };
        fitToScreen();
      }
    } catch {
      // The canvas can be blocked (e.g. when the site is opened from file://); keep plain cover.
    }
  }

  function fitToScreen() {
    if (!content || !video.videoWidth) return;
    const W = root.clientWidth, H = root.clientHeight;
    // Size and position of the whole frame as object-fit: cover draws it.
    const cover = Math.max(W / video.videoWidth, H / video.videoHeight);
    const vw = video.videoWidth * cover, vh = video.videoHeight * cover;
    const ox = (W - vw) / 2, oy = (H - vh) / 2;
    // The picture inside the bars, in screen pixels.
    const cx = ox + content.left * vw, cy = oy + content.top * vh;
    const cw = (content.right - content.left) * vw, ch = (content.bottom - content.top) * vh;
    const zoom = Math.max(1, W / cw, H / ch);
    if (zoom === 1) { video.style.transform = ""; return; }
    // Zoom around the picture's center and move that center to the middle of the screen.
    const shiftX = W / 2 - (cx + cw / 2), shiftY = H / 2 - (cy + ch / 2);
    video.style.transformOrigin = `${cx + cw / 2}px ${cy + ch / 2}px`;
    video.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(${zoom * 1.01})`;
  }

  if (video.readyState >= 2) measureBars();
  else video.addEventListener("loadeddata", measureBars, { once: true });
  window.addEventListener("resize", fitToScreen);

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
    const step = scrubDistance * 0.06;
    if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && e.target !== enterButton)) { addDelta(step); e.preventDefault(); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { addDelta(-step); e.preventDefault(); }
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("keydown", onKeyDown);

  function render() {
    followScroll();
    const p = duration > 0 ? clamp(video.currentTime / duration, 0, 1) : 0;
    hint.style.opacity = hasStartedScrolling ? "0" : "1";
    progressBar.style.transform = `scaleX(${p})`;
    const open = targetProgress > 0.97 && p > 0.94;
    center.classList.toggle("is-open", open);
    if (open && !enterFocused) {
      enterFocused = true;
      enterButton.focus({ preventScroll: true });
    }
  }

  function frame() {
    render();
    rafId = requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    // Skip the walk: show the end of the path and the button straight away.
    targetProgress = 1;
    hasStartedScrolling = true;
    hint.style.opacity = "0";
    progressBar.style.transform = "scaleX(1)";
    center.classList.add("is-open");
  } else {
    rafId = requestAnimationFrame(frame);
  }

  enterButton.addEventListener("click", () => {
    if (entered) return;
    entered = true;
    cancelAnimationFrame(rafId);
    video.pause();
    root.classList.add("is-entered");
    window.setTimeout(() => root.remove(), 900);
    onEnter?.();
  });

  return {
    destroy() {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", fitToScreen);
      cancelAnimationFrame(rafId);
      releaseLock();
      root.remove();
    }
  };
}

window.mountGroveIntro = mountGroveIntro;
