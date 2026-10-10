const card = document.getElementById('card');
const goldShine = document.getElementById('goldShine');
const edgeGlint = document.getElementById('edgeGlint');
const rails = [...edgeGlint.querySelectorAll('.rail')];
const railsV = [...edgeGlint.querySelectorAll('.rail-v')];
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

/* ---------- Enhance ----------
     One switch for everything that is an effect rather than a picture: the
     holographic laminate and its glow, the card's idle sway, the falling
     petals, the drifting water, the paper grain. Off by default.

     Measured, not guessed (scripts/perf.mjs): one mix-blend-mode layer
     anywhere inside the card costs about 20 ms a frame, because blending has
     to read the backdrop and the card is a 1880×1270 subtree. It does not
     matter how many blended layers there are, how simple the gradients are,
     or whether the card is standing still — the presence of the blend is the
     whole cost. With Enhance off the same page runs at twice the frame rate.

     What stays on regardless is the artwork itself: the sun and its bloom,
     the mist breathing over the water. Those are not special effects
     bolted onto the picture; they are the picture. */
const ENHANCE_KEY = 'fuji.enhance';
const storedEnhance = (() => {
  try {
    return localStorage.getItem(ENHANCE_KEY);
  } catch {
    return null; // private mode, or storage disabled
  }
})();
let enhanceOn = storedEnhance === 'on';
let autoDropped = false;
// Set the moment somebody switches Enhance back on after the page dropped it
// for smoothness. Two clicks is a decision, not an accident, and after that
// the page stops second-guessing them.
let userOverrode = false;

const enhanceBtn = document.getElementById('enhanceBtn');
const enhanceLabel = document.getElementById('enhanceLabel');

function setEnhance(on, reason) {
  enhanceOn = on;
  card.style.setProperty('--foil', on ? '1' : '0');
  document.documentElement.dataset.enhance = on ? 'on' : 'off';
  enhanceLabel.textContent = on
    ? 'Enhance on'
    : reason === 'auto'
      ? 'Enhance off · smooth'
      : 'Enhance off';
  enhanceBtn.setAttribute('aria-pressed', String(on));
  status.textContent = on
    ? 'Enhance on: laminate, glow and motion.'
    : reason === 'auto'
      ? 'Enhance turned itself off to keep the page smooth.'
      : 'Enhance off.';
  enhanceBtn.title = on
    ? 'On: holographic laminate and its glow, the card swaying, petals and water moving, paper grain. The most expensive thing on the page.'
    : 'Off: the print on its own — no laminate, no glow, no grain, no motion but the mist. About twice the frame rate.';
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
/* Where the ray is along the plate, 0..1. It used to be derived from the
   specular point - where the lamp's reflection crosses the card plane - and
   that only ever travels a narrow band, so the gold lettering caught a
   highlight across about a tenth of its width. The pointer's own position
   across the card covers the whole width, so that is what drives it now.
   Card rotation is added on top: tilting a gilded frame walks the light
   along it, and here it should do the same. */
let glint = 0.5,
  glintY = 0.5;
const glintTargetX = () => (hovering ? hx + 0.5 : 0.5) + ry / 240;
const glintTargetY = () => (hovering ? hy + 0.5 : 0.5) + rx / 160;
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

const status = document.getElementById('status');

const flip = () => {
  flipped = !flipped;
  status.textContent = flipped
    ? 'The card is showing its back: the message and the address.'
    : 'The card is showing the picture.';
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
  // While Enhance is on, feel the machine. If the frames are actually bad,
  // drop it and say why.
  if (enhanceOn && !userOverrode && !autoDropped) {
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
        if (median > 24) setEnhance(false, 'auto');
      }
    }
    probeLast = now;
  }

  // pointer steers the card; when the pointer is away it keeps a slow 3-5 degree sway
  if (hovering) {
    tgtX = -hy * 12;
    tgtY = hx * 16;
  } else if (!reduce && enhanceOn) {
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

  // One ray travelling the full width of the plate. The gradient band is 210
  // units wide, so it runs from fully off the left edge (translate -210) to
  // fully off the right (translate 900) and crosses every gilded thing on the
  // bottom edge on the way: the lettering, and the rule under it, which share
  // this one gradient and so light up at the same place.
  glint += (glintTargetX() - glint) * 0.08;
  glintY += (glintTargetY() - glintY) * 0.08;
  // One number, one ray. Everything gilded on the plate is lit by this single
  // position, so the highlight on the lettering, the one on the rule under it
  // and the ones on the frame all sit at the same x. Deriving them from
  // separate mappings is how they ended up travelling in opposite directions.
  const rayX = Math.max(0, Math.min(1, glint)) * 900;
  const rayY = Math.max(0, Math.min(1, glintY)) * 600;
  // the gradient band is 210 wide, so its centre is at translate + 105
  goldShine.setAttribute('gradientTransform', `translate(${(rayX - 105).toFixed(1)} 0)`);
  // The frame is gilded, and this is the same ray, not a second one. Each
  // side of the frame is its own straight path drawn in the +x or +y
  // direction, so offsetting a dash by -X puts the glint at exactly x=X -
  // the bottom glint sits under the lit part of the inscription and the top
  // one directly above it. Offsetting by -Y does the same down the sides.
  // each rail starts at 16 and its dash is 170 long, so the dash centre sits at
  // 16 + p + 85 - which equals rayX when the offset is 101 - rayX
  for (const r of rails) r.setAttribute('stroke-dashoffset', (101 - rayX).toFixed(1));
  for (const r of railsV) r.setAttribute('stroke-dashoffset', (101 - rayY).toFixed(1));
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
setEnhance(enhanceOn, storedEnhance === 'on' ? 'user' : 'default');
wake();

enhanceBtn.addEventListener('click', () => {
  if (!enhanceOn && autoDropped) userOverrode = true;
  setEnhance(!enhanceOn, 'user');
  try {
    localStorage.setItem(ENHANCE_KEY, enhanceOn ? 'on' : 'off');
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
      /@keyframes|\.petal|\.cloud|\.mist|\.ripple|\.wake|\.boat|\.boatman|\.duck|\.wader|\.floater|\.rays|\.glow|\.bird|\.p\d|\.water-|\.refl|\.sway-/.test(
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
