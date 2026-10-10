#!/usr/bin/env node
/* The type printed on the card has to be readable, not just old.

   test-contrast.mjs checks the page's chrome — the colours in CSS custom
   properties against the wall behind them. It says nothing about the
   artwork, and the artwork is where the smallest, faintest type on this page
   lives: 8 and 9 px uppercase, letter-spaced, set into paper that is a
   gradient, foxed, grained and vignetted, under group opacities, sometimes in
   a gold gradient, sometimes a faded postmark. A hex in the source tells you
   nothing about any of that.

   So this reads the pixels. One screenshot per face; the background for a
   mark is the median of the ring of paper just outside it, in the same frame
   — two screenshots of this page are never identical, because the mist and
   the water are moving, so the paper cannot be read from a second exposure.
   The ink is the pixel inside the box that differs from that background most,
   which is the most generous reading a mark can be given: the average glyph
   pixel is lighter still.

   The floor is WCAG's large-print 3:1, not the 4.5:1 the chrome is held to.
   This is a hundred-year-old card and some of its marks are meant to be weak
   strikes; none of them is meant to be gone.

     node scripts/test-ink.mjs

   Needs Chrome; skips, like the layout test, when it is not installed. */
import { inflateSync } from 'node:zlib';
import { openPage, silentPage } from './cdp.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const FLOOR = 3;
const SCALE = 2;

/* A PNG decoder for exactly what Page.captureScreenshot sends back: 8-bit,
   non-interlaced, no interlace, no palette. Node has inflate; the rest is the
   five scanline filters. */
function decodePng(buf) {
  let p = 8;
  let w = 0;
  let h = 0;
  let ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (ct !== 6 && ct !== 2) throw new Error(`test-ink: colour type ${ct} is not expected`);
  const bpp = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.subarray(q, q + stride);
    q += stride;
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v;
      if (f === 0) v = line[x];
      else if (f === 1) v = line[x] + a;
      else if (f === 2) v = line[x] + b;
      else if (f === 3) v = line[x] + ((a + b) >> 1);
      else {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v = line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, bpp, out };
}

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) =>
  0.2126 * channel(r / 255) + 0.7152 * channel(g / 255) + 0.0722 * channel(b / 255);
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const page = await openPage({
  port: 9389,
  userDataDir: '/tmp/fuji-ink-test',
  // the card sways, and a swaying card is a moving ruler
  args: ['--force-prefers-reduced-motion'],
});
if (!page) {
  console.log('test-ink: no Chrome, or Chrome did not come up - skipped');
  process.exit(0);
}
const { send, evaluate, exceptions, close } = page;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1150,
  deviceScaleFactor: SCALE,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await new Promise((r) => setTimeout(r, 1500));

const marks = async () =>
  JSON.parse(
    await evaluate(`(() => {
      const out = [];
      for (const t of document.querySelectorAll('.face svg text')) {
        if (!t.textContent.trim()) continue;
        const cs = getComputedStyle(t);
        const b = t.getBoundingClientRect();
        out.push({
          face: t.closest('.face').className.replace('face ', ''),
          text: t.textContent.trim().replace(/\\s+/g, ' ').slice(0, 30),
          size: Math.round(parseFloat(cs.fontSize)),
          x: b.left, y: b.top, w: b.width, h: b.height,
        });
      }
      return JSON.stringify(out);
    })()`),
  );

const rows = [];
const measure = async (face) => {
  const shot = decodePng(
    Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
  );
  const at = (x, y) => {
    const o = (y * shot.w + x) * shot.bpp;
    return [shot.out[o], shot.out[o + 1], shot.out[o + 2]];
  };
  const list = await marks();
  for (const it of list) {
    if (it.face !== face) continue;
    const x0 = Math.round(it.x * SCALE);
    const y0 = Math.round(it.y * SCALE);
    const x1 = Math.min(shot.w, Math.round((it.x + it.w) * SCALE));
    const y1 = Math.min(shot.h, Math.round((it.y + it.h) * SCALE));
    if (x1 - x0 < 3 || y1 - y0 < 3) {
      rows.push({ ...it, bg: [0, 0, 0], ink: [0, 0, 0], r: 0, gone: 'has no pixels in the frame' });
      continue;
    }
    const ring = [];
    const pad = 6;
    for (let y = Math.max(0, y0 - pad); y < Math.min(shot.h, y1 + pad); y++)
      for (let x = Math.max(0, x0 - pad); x < Math.min(shot.w, x1 + pad); x++)
        if (x < x0 || x >= x1 || y < y0 || y >= y1) ring.push((y * shot.w + x) * shot.bpp);
    if (ring.length < 20) continue;
    const bg = [0, 1, 2].map(
      (i) => ring.map((o) => shot.out[o + i]).sort((a, b) => a - b)[ring.length >> 1],
    );
    let ink = bg;
    let far = -1;
    let inked = 0;
    let n = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const c = at(x, y);
        const d = Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]);
        n++;
        if (d > 12) inked++;
        if (d > far) {
          far = d;
          ink = c;
        }
      }
    /* A mark that paints nothing on the face that is showing is not faint,
       it is gone: moved off the card, hidden, or left inside a group whose
       transform lands it somewhere else. That happened while writing this
       test — the postmark's type was reported fine because it had been
       translated twice and was off the plate. The check is only honest for a
       mark standing on its own paper: a box full of other people's ink, like
       a postmark's type inside its own rings, can hide an absent mark, and
       that is the one thing this measurement cannot see. */
    if (inked / n < 0.02) {
      rows.push({ ...it, bg, ink, r: 0, gone: 'paints nothing where it should be' });
      continue;
    }
    rows.push({ ...it, bg, ink, r: ratio(ink, bg) });
  }
};

await measure('front');
await evaluate(`document.getElementById('flip').click()`);
await new Promise((r) => setTimeout(r, 1600));
await measure('back');

const problems = [];
rows.sort((a, b) => a.r - b.r);
for (const r of rows)
  if (r.gone) problems.push(`${r.face}: "${r.text}" (${r.size}px) ${r.gone}`);
  else if (r.r < FLOOR)
    problems.push(
      `${r.face}: "${r.text}" (${r.size}px) is ${r.r.toFixed(2)}:1 — ink ${r.ink.join(',')} on ${r.bg.join(',')} — needs ${FLOOR}:1`,
    );
if (exceptions.length)
  problems.push(`${exceptions.length} page exception(s): ${exceptions.join(' | ')}`);

close();

const worst = rows.slice(0, 3).map((r) => `${r.text} ${r.r.toFixed(2)}`);
if (problems.length) {
  console.error(`test-ink: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `test-ink: ${rows.length} marks measured, all at or above ${FLOOR}:1 — faintest ${worst.join(' · ')}`,
);
