// Interactive forest sparkles: the sparkles lifted out of the background painting are redrawn
// here at their original spots, so they can twinkle, drift and scatter away from the pointer.
(() => {
  const canvas = document.getElementById("sparkle-canvas");
  const data = window.GROVE_SPARKLES;
  if (!canvas || !Array.isArray(data) || !canvas.getContext) return;

  const IMAGE_ASPECT = 1408 / 768;           // forest-background.jpg aspect ratio
  const BACKDROP_SCALE = 1.04;               // matches the CSS transform on the backdrop
  const PARALLAX = 14;                       // max backdrop shift in px
  const REPEL_RADIUS = 150;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const ctx = canvas.getContext("2d");
  const sprites = new Map();
  let width = 0, height = 0, dpr = 1, frame = 0;
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  const particles = data.map((s) => ({
    nx: s.x, ny: s.y, nr: s.r, color: s.c, alpha: s.a, star: !!s.s,
    hx: 0, hy: 0, r: 0, dx: 0, dy: 0, vx: 0, vy: 0,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.6 + Math.random() * 1.6,
    drift: 1.5 + Math.random() * 3.5,
    driftSpeed: 0.15 + Math.random() * 0.35
  }));

  function lighten(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(v + (255 - v) * amount);
    return `rgb(${mix(n >> 16)} ${mix((n >> 8) & 255)} ${mix(n & 255)})`;
  }

  function sprite(color, radius, star) {
    // `radius` is the sparkle's full extent in the painting (glow included).
    const size = Math.max(1, Math.round(radius * 2) / 2);
    const key = `${color}|${size}|${star}`;
    if (sprites.has(key)) return sprites.get(key);
    const glow = size * (star ? 1.6 : 1.9) + 3;
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(glow * 2 * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const halo = g.createRadialGradient(glow, glow, 0, glow, glow, glow);
    halo.addColorStop(0, color + "bb");
    halo.addColorStop(0.3, color + "44");
    halo.addColorStop(1, color + "00");
    g.fillStyle = halo;
    g.fillRect(0, 0, glow * 2, glow * 2);
    g.fillStyle = star ? "#fff4d2" : lighten(color, 0.6);
    if (star) {
      const arm = size, waist = size * 0.14;
      g.beginPath();
      g.moveTo(glow, glow - arm);
      g.quadraticCurveTo(glow + waist, glow - waist, glow + arm, glow);
      g.quadraticCurveTo(glow + waist, glow + waist, glow, glow + arm);
      g.quadraticCurveTo(glow - waist, glow + waist, glow - arm, glow);
      g.quadraticCurveTo(glow - waist, glow - waist, glow, glow - arm);
      g.fill();
    } else {
      g.beginPath();
      g.arc(glow, glow, Math.min(2.4, Math.max(0.7, size * 0.3)), 0, Math.PI * 2);
      g.fill();
    }
    const entry = { canvas: c, half: glow };
    sprites.set(key, entry);
    return entry;
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    sprites.clear();
    // Same maths as `background-size: cover; background-position: center`.
    const drawW = Math.max(width, height * IMAGE_ASPECT);
    const drawH = drawW / IMAGE_ASPECT;
    const ox = (width - drawW) / 2, oy = (height - drawH) / 2;
    for (const p of particles) {
      p.hx = ox + p.nx * drawW;
      p.hy = oy + p.ny * drawH;
      p.r = Math.max(0.9, p.nr * drawW);
    }
  }

  function toLocal(x, y) {
    // Undo the backdrop's scale/translate so pointer coordinates match the painting.
    return {
      x: (x - width / 2 - parallax.x) / BACKDROP_SCALE + width / 2,
      y: (y - height / 2 - parallax.y) / BACKDROP_SCALE + height / 2
    };
  }

  function draw(time) {
    const t = time / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    const local = toLocal(pointer.x, pointer.y);
    const animate = !reduceMotion.matches;

    for (const p of particles) {
      if (animate) {
        const ax = p.hx + p.dx, ay = p.hy + p.dy;
        const ex = ax - local.x, ey = ay - local.y;
        const dist = Math.hypot(ex, ey);
        if (pointer.active && dist < REPEL_RADIUS && dist > 0.01) {
          const falloff = (1 - dist / REPEL_RADIUS) ** 2;
          p.vx += (ex / dist) * falloff * 2.4 + pointer.vx * falloff * 0.06;
          p.vy += (ey / dist) * falloff * 2.4 + pointer.vy * falloff * 0.06;
        }
        // Spring back home, with a lazy float around the home position.
        const floatX = Math.sin(t * p.driftSpeed + p.phase) * p.drift;
        const floatY = Math.cos(t * p.driftSpeed * 0.8 + p.phase) * p.drift * 0.8;
        p.vx += (floatX - p.dx) * 0.018;
        p.vy += (floatY - p.dy) * 0.018;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.dx += p.vx;
        p.dy += p.vy;
      }
      const twinkle = animate ? 0.7 + 0.3 * Math.sin(t * p.twinkle + p.phase) : 1;
      const s = sprite(p.color, p.r, p.star);
      ctx.globalAlpha = Math.min(1, p.alpha * twinkle);
      ctx.drawImage(s.canvas, p.hx + p.dx - s.half, p.hy + p.dy - s.half, s.half * 2, s.half * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function tick(time) {
    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    root.style.setProperty("--parallax-x", `${parallax.x.toFixed(2)}px`);
    root.style.setProperty("--parallax-y", `${parallax.y.toFixed(2)}px`);
    pointer.vx *= 0.85;
    pointer.vy *= 0.85;
    draw(time);
    frame = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(frame);
    if (reduceMotion.matches) {
      parallax.x = parallax.y = 0;
      root.style.setProperty("--parallax-x", "0px");
      root.style.setProperty("--parallax-y", "0px");
      draw(0);
    } else {
      frame = requestAnimationFrame(tick);
    }
  }

  window.addEventListener("pointermove", (event) => {
    if (pointer.active) {
      pointer.vx = event.clientX - pointer.x;
      pointer.vy = event.clientY - pointer.y;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    parallax.tx = -((event.clientX / width) - 0.5) * PARALLAX * 2;
    parallax.ty = -((event.clientY / height) - 0.5) * PARALLAX * 2;
  }, { passive: true });
  const release = () => { pointer.active = false; pointer.x = pointer.y = -9999; };
  document.addEventListener("mouseout", (event) => { if (!event.relatedTarget) release(); });
  window.addEventListener("pointerup", (event) => { if (event.pointerType !== "mouse") release(); });
  window.addEventListener("blur", release);
  window.addEventListener("resize", () => { layout(); start(); });
  reduceMotion.addEventListener?.("change", start);

  layout();
  start();
})();
