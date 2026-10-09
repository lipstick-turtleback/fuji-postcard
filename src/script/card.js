const card = document.getElementById('card');
const goldShine = document.getElementById('goldShine');
const wmShine = document.getElementById('wmShine');

/* =============================================================
     One lighting model drives everything.

     The card is a flat plane. The key light and the eye are fixed
     in the room. So the highlight on the laminate is found the way
     a mirror finds one: reflect the lamp in the plane of the card,
     sight that reflection from the eye, and take where the sight
     line crosses the card. Tilt the card and the highlight travels
     exactly as far as it physically has to — the rainbow pool, the
     glitter, the sheen band, the hard glint, the light behind the
     page and the hot-stamped wordmark all read the same numbers.
     ============================================================= */
const DEG = Math.PI / 180;
const unit = (v) => {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
};

const LAMP = [-0.3, -0.22, 0.85]; // point light, in card-widths, upper-left, in front
const EYE = [0, 0, 2.6]; // the viewer
const HALF = unit(LAMP.map((v, i) => v / Math.hypot(...LAMP) + (i === 2 ? 1 : 0)));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- rendering quality ----------
     Measured, not guessed (scripts/perf.mjs): one mix-blend-mode layer
     anywhere inside the card costs about 20 ms a frame, because blending
     has to read the backdrop and the card is a 1880×1270 subtree. It does
     not matter how many blended layers there are, how simple the gradients
     are, or whether the card is standing still — the presence of the blend
     is the whole cost. With the laminate gone the same page runs at twice
     the frame rate.

     So the laminate is the quality switch, and "off" is not just a hidden
     layer: it is the calm rendering. The sway and the drifting water stop
     with it, because a page that is going to be still should be still. */
const QUALITY_KEY = 'fuji.quality';
const storedQuality = (() => {
  try {
    return localStorage.getItem(QUALITY_KEY);
  } catch {
    return null; // private mode, or storage disabled
  }
})();
const weakDevice =
  (navigator.hardwareConcurrency || 8) <= 4 ||
  (navigator.deviceMemory ? navigator.deviceMemory <= 4 : false);
let foilOn = storedQuality !== null ? storedQuality === 'on' : !weakDevice;
let autoDropped = false;

const foilBtn = document.getElementById('foilBtn');
const foilLabel = document.getElementById('foilLabel');

function setQuality(on, reason) {
  foilOn = on;
  card.style.setProperty('--foil', on ? '1' : '0');
  document.documentElement.dataset.quality = on ? 'full' : 'calm';
  foilLabel.textContent = on
    ? 'Laminate on'
    : reason === 'auto'
      ? 'Laminate off · smooth'
      : 'Laminate off';
  foilBtn.setAttribute('aria-pressed', String(on));
  foilBtn.title = on
    ? 'Holographic laminate: the rainbow pool, the glitter and the sheen. The most expensive thing on the page.'
    : 'Calm rendering: no laminate, no sway, no drifting water. About twice the frame rate.';
  wake();
}
let touchOff = 0;
let running = false;
// Both wake() and frame() are hoisted declarations: the quality control is
// wired up before them in the file and calls wake() during setup, and a
// const arrow here would be in its temporal dead zone at that moment —
// which took the whole script down, tilt and flip and export included.
function wake() {
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

let rx = 0,
  ry = 0,
  tgtX = 0,
  tgtY = 0;
let hovering = false,
  hx = 0,
  hy = 0;
let turn = 0,
  turnFrom = 0,
  turnTo = 0,
  turnT0 = -1,
  flipped = false;
let cardW = 900,
  cardH = 600;

const measure = () => {
  const r = card.getBoundingClientRect();
  cardW = r.width;
  cardH = r.height;
};
measure();
// the card is sized by clamp() and the viewport, so it also changes when the
// layout around it does — a resize listener misses that
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(card);
else addEventListener('resize', measure);

const flip = () => {
  flipped = !flipped;
  turnFrom = turn;
  turnTo = flipped ? 180 : 0;
  turnT0 = performance.now();
  wake();
};
card.addEventListener('click', flip);
document.getElementById('flip').addEventListener('click', flip);
document.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) flip();
});

card.addEventListener('pointermove', (e) => {
  const r = card.getBoundingClientRect();
  hovering = true;
  hx = (e.clientX - r.left) / r.width - 0.5;
  hy = (e.clientY - r.top) / r.height - 0.5;
  wake();
  // a finger does not "leave": without this the card stays where it was
  // touched and never returns to its idle sway
  if (e.pointerType !== 'mouse') {
    clearTimeout(touchOff);
    touchOff = setTimeout(() => {
      hovering = false;
      wake();
    }, 1200);
  }
});
card.addEventListener('pointerleave', () => {
  hovering = false;
  wake();
});

// world -> card frame.  R = rotateY(ry) . rotateX(rx), so R^T = Rx(-b) . Ry(-a)
function toLocal(v, ca, sa, cb, sb) {
  const x = ca * v[0] - sa * v[2];
  const y = v[1],
    z = sa * v[0] + ca * v[2];
  return [x, cb * y + sb * z, -sb * y + cb * z];
}

/* Sampling the machine beats guessing about it. Two things about the
   sample are worth stating, because both were gotchas on the way here.

   The window: on a slow machine frames arrive at ~38 ms, so counting
   frames means waiting longer the worse the machine is — exactly
   backwards. The window is wall-clock, and short, because every
   millisecond of it is stutter somebody is sitting through. */
const PROBE_WARMUP = 300; // first paint, webfonts, the first gradient compile
const PROBE_WINDOW = 900;
let probeStart = 0;
const probeGaps = [];
let probeLast = 0;

function frame(now) {
  // If nobody has chosen, feel the machine and drop to the calm rendering
  // if the frames are actually bad.
  if (foilOn && storedQuality === null && !autoDropped) {
    if (!probeStart) probeStart = now;
    else if (probeLast) {
      const age = now - probeStart;
      if (age > PROBE_WARMUP) probeGaps.push(now - probeLast);
      // too few frames to judge by means rAF is being throttled, not that
      // the machine is slow — so keep probing rather than decide on noise
      if (age >= PROBE_WARMUP + PROBE_WINDOW && probeGaps.length >= 8) {
        autoDropped = true;
        // The median, not the mean and not the share of late frames. The
        // distribution is bimodal: a frame lands on a vsync boundary or it
        // misses it, so the median says which of those a typical frame does.
        // Measured on this page: full laminate sits at a 33 ms median, and
        // every rendering worth keeping sits at 16.7 ms. A "20% of frames
        // are late" rule fired on a 45 fps page that is perfectly usable;
        // the median does not.
        probeGaps.sort((a, b) => a - b);
        const median = probeGaps[probeGaps.length >> 1];
        // what the page decided and why, for anyone who wants to know why
        // the laminate is off on their machine
        document.documentElement.dataset.probe = `${probeGaps.length}f median ${median.toFixed(1)}ms`;
        if (median > 24) setQuality(false, 'auto');
      }
    }
    probeLast = now;
  }

  // pointer steers the card; when the pointer is away it keeps a slow 3-5 degree sway
  if (hovering) {
    tgtX = -hy * 12;
    tgtY = hx * 16;
  } else if (!reduce && foilOn) {
    const t = now / 1000;
    tgtX = Math.sin(t * 0.29) * 3.2 + Math.sin(t * 0.13 + 1.2) * 1.6;
    tgtY = Math.sin(t * 0.21 + 0.5) * 4.2 + Math.sin(t * 0.09) * 1.8;
  } else {
    tgtX = 0;
    tgtY = 0;
  }

  rx += (tgtX - rx) * 0.055;
  ry += (tgtY - ry) * 0.055;

  if (turnT0 >= 0) {
    const k = Math.min(1, (now - turnT0) / 900);
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    turn = turnFrom + (turnTo - turnFrom) * e;
    if (k >= 1) turnT0 = -1;
  }

  const a = ry * DEG,
    b = rx * DEG;
  const ca = Math.cos(a),
    sa = Math.sin(a),
    cb = Math.cos(b),
    sb = Math.sin(b);

  // surface normal in world space
  const nx = cb * sa,
    ny = -sb,
    nz = cb * ca;
  const spec = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]) ** 14;

  // mirror the lamp in the card plane, then sight it from the eye
  const L = toLocal(LAMP, ca, sa, cb, sb);
  const E = toLocal(EYE, ca, sa, cb, sb);
  const t = -E[2] / (-L[2] - E[2]);
  const gx = E[0] + t * (L[0] - E[0]); // card spans -0.5 .. 0.5 wide
  const gy = E[1] + t * (L[1] - E[1]); // and -0.3333 .. 0.3333 tall
  const sx = 50 + gx * 100;
  const sy = 50 + gy * 150;

  // the sheen band lies across the direction of travel
  const dx = gx,
    dy = gy * 1.5;
  const A = Math.atan2(dx, -dy);
  const ax = Math.sin(A),
    ay = -Math.cos(A);
  const len = Math.abs(cardW * ax) + Math.abs(cardH * ay);
  const band = 50 + ((((sx - 50) / 100) * cardW * ax + ((sy - 50) / 100) * cardH * ay) / len) * 100;

  card.style.setProperty('--sx', `${sx.toFixed(2)}%`);
  card.style.setProperty('--sy', `${sy.toFixed(2)}%`);
  card.style.setProperty('--band', `${band.toFixed(2)}%`);
  card.style.setProperty('--sheen', `${(A / DEG + 360).toFixed(2)}deg`);
  card.style.setProperty('--spec', spec.toFixed(4));

  document.body.style.setProperty('--poolx', `${(14 + sx * 0.72).toFixed(2)}%`);
  document.body.style.setProperty('--pooly', `${(10 + sy * 0.6).toFixed(2)}%`);

  // the cast shadow falls away from the lamp, so it drifts as the card turns
  card.style.setProperty('--shx', (-gx * 26).toFixed(2));
  card.style.setProperty('--shy', (18 - gy * 14).toFixed(2));

  card.style.transform = `rotateY(${(turn + ry).toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg)`;

  // the hot-stamped wordmark catches the same highlight
  goldShine.setAttribute(
    'gradientTransform',
    `translate(${((sx / 100) * 900 - 187).toFixed(1)} 0)`,
  );
  wmShine.setAttribute('opacity', Math.min(0.92, spec * 1.5).toFixed(3));

  // with reduced motion there is no sway to keep alive: once the card has
  // come to rest and nothing is turning it, stop asking for frames
  const settled =
    reduce && !hovering && turnT0 < 0 && Math.abs(rx - tgtX) < 0.01 && Math.abs(ry - tgtY) < 0.01;
  if (settled) running = false;
  else requestAnimationFrame(frame);
}

// Applied here rather than where it is declared: it calls wake(), and wake()
// reads `running`, which is not initialised until further down the file.
setQuality(foilOn, storedQuality === 'off' ? 'user' : storedQuality === null ? 'auto' : 'user');
wake();

foilBtn.addEventListener('click', () => {
  setQuality(!foilOn, 'user');
  try {
    localStorage.setItem(QUALITY_KEY, foilOn ? 'on' : 'off');
  } catch {
    /* the choice just will not be remembered */
  }
});

// Export the face you are looking at as a standalone .svg. The back is a
// piece of artwork too, and saving the front while the back is showing is
// saving something that is not on the screen.
const savePlate = () => {
  const face = flipped ? 'back' : 'front';
  const src = card.querySelector(`.face.${face} svg`);
  const clone = src.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1800');
  clone.setAttribute('height', '1200');
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText);
      } catch {
        return [];
      }
    })
    .filter((t) =>
      /@keyframes|\.petal|\.cloud|\.mist|\.ripple|\.boat|\.rays|\.glow|\.bird|\.p\d|\.water-|\.refl|\.sway-/.test(
        t,
      ),
    );
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = css.join('\n');
  clone.insertBefore(style, clone.firstChild);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fuji-postcard-${face}.svg`;
  document.body.append(a);
  a.click();
  a.remove();
  // revoking in the same tick can beat the download in some browsers
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
};
document.getElementById('dl').addEventListener('click', savePlate);
// the README promised this key; the button now says so too. Cmd/Ctrl+S is
// left alone on purpose — that is the browser saving the page, and it is
// the one shortcut here a visitor is already reaching for with a habit.
document.addEventListener('keydown', (e) => {
  if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    savePlate();
  }
});
