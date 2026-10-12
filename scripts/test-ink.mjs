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
const ruleRows = [];

/* A printed rule may fade. It may not stop.

   The gilded frame is a gradient at .55 stroke-opacity, and where it crosses a
   pale cherry blossom the gilt alone is barely a line at all: the frame read as
   four segments meeting at corners rather than one line the picture passes
   behind. Nothing in the suite could see anything of the kind, because every
   other test asks about geometry — where a mark is, what it touches — and this
   is a question about ink.

   So the plate's printed rules are walked along their own length, once per
   unit, and at each step the pixel under the rule is compared with the pixels
   just off each side of it — the ground the rule is lying on, in the same
   frame. Twelve consecutive steps on which the rule is within RULE_GONE of
   both of its grounds is a rule that has stopped, not one that has faded.

   Which marks are "printed rules" is said by the artwork, not guessed here:
   they carry class="print-rule" where they are drawn. Guessing was tried
   first, and it cannot tell a printed rule from a line that lies across two
   grounds on purpose — the dark underside of the branch is quiet against the
   branch for half its length because that is what an underside is, and the
   lake's edge is hidden where the reeds stand in front of it, which is what an
   edge behind things is. Both were reported as broken. A pixel measurement can
   see that ink is missing; only the drawing knows whether that was intended.

   The measure is a colour distance, not a contrast ratio. The type test above
   uses WCAG because letterforms are legible through luminance; a line is seen
   through colour. The frame's gilded rule over the mountain's mauve slope is
   1.20:1 in luminance — by the ratio, gone — and it is plainly there, because
   gold and mauve are not the same colour. Reading only brightness would have
   reported a defect that does not exist. And there is no floor on how quiet a
   printed rule may be overall, for the same reason the walk is short: the
   marks in it are the ones the drawing itself calls print. */
const RULE_GONE = 20;
const RULE_RUN = 12;
const colourDistance = (a, b) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

const rules = async (face) =>
  JSON.parse(
    await evaluate(`(() => {
      const out = [];
      const sel = ${JSON.stringify(`.face.${face} svg .print-rule`)};
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        if (!cs.stroke || cs.stroke === 'none') continue;
        if (cs.fill !== 'none') continue;
        if (cs.strokeDasharray && cs.strokeDasharray !== 'none') continue;
        const w = parseFloat(cs.strokeWidth);
        if (!(w > 0) || w > 2.2) continue;
        if (typeof el.getTotalLength !== 'function') continue;
        const len = el.getTotalLength();
        if (!isFinite(len) || len < 60) continue;
        const ctm = el.getScreenCTM();
        if (!ctm) continue;
        // Sample points are walked in the element's own space, because that is
        // where getPointAtLength lives, and handed up a second time in the
        // plate's: the tanzaku is rotated and the postmark is translated, and a
        // report that says a rule stopped at [-28,-8] is pointing at a place
        // that does not exist on the card.
        const root = el.ownerSVGElement.getScreenCTM();
        // DOMMatrix.multiply is column-vector: a.multiply(b) applies b first.
        // The order here is "go to the screen, then come back to the plate",
        // and getting it the other way round produced coordinates that were
        // neither space — the postmark's ring reported a dropout 85 units from
        // where the postmark is.
        const mp = root.inverse().multiply(ctm);
        // one sample per unit along the rule: a blossom is fifteen units wide,
        // and a walk that steps nine units at a time lands two samples inside
        // it and calls the gap a blip
        const step = Math.min(1, len / 4000);
        const pts = [];
        for (let s = 0; s <= len; s += step) {
          const p = el.getPointAtLength(s);
          const q = el.getPointAtLength(Math.min(len, s + step));
          const pp = p.matrixTransform(mp);
          pts.push([p.x, p.y, q.x, q.y, pp.x, pp.y]);
        }
        out.push({
          face: ${JSON.stringify(face)},
          name:
            el.tagName.toLowerCase() +
            ' ' +
            ((el.getAttribute('d') || '').slice(0, 12) ||
              (el.getAttribute('x') + ',' + el.getAttribute('y') + ' ' + el.getAttribute('width') + 'x' + el.getAttribute('height'))),
          w,
          len,
          pts,
          m: [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f],
        });
      }
      return JSON.stringify(out);
    })()`),
  );

const walkRules = async (face, at) => {
  for (const r of await rules(face)) {
    const [a, b, c, d, e, f] = r.m;
    const px = (x, y) => [(a * x + c * y + e) * SCALE, (b * x + d * y + f) * SCALE];
    const off = (r.w / 2 + 2.5) * SCALE;
    const seen = [];
    for (const [x, y, x2, y2, bx, by] of r.pts) {
      // a rule that runs off the plate is a bleed, and the wall outside the
      // card is not its ground. The test is on the plate's coordinates, not the
      // element's: the postmark's killer lines live at x -28 to 28 in a group
      // that sits at x 792, and a clip written in local numbers throws away a
      // mark that is squarely on the card.
      if (bx < 10 || bx > 890 || by < 10 || by > 590) continue;
      const [sx, sy] = px(x, y);
      const [tx, ty] = px(x2, y2);
      const L = Math.hypot(tx - sx, ty - sy) || 1;
      const nx = (-(ty - sy) / L) * off;
      const ny = ((tx - sx) / L) * off;
      const here = at(Math.round(sx), Math.round(sy));
      const g1 = at(Math.round(sx + nx), Math.round(sy + ny));
      const g2 = at(Math.round(sx - nx), Math.round(sy - ny));
      /* A line is seen when it differs from what lies beside it — on either
         side. Where a rule crosses the edge of another mark the two sides are
         not the same ground at all, one bright and one dark, and averaging
         them invents a ground the line was never drawn on: the frame's right
         rule over the far shore's bright edge measured 1.00:1 against such an
         average while being plainly visible against both of them. */
      const cr = Math.max(colourDistance(here, g1), colourDistance(here, g2));
      // reported in plate coordinates, so a failure names a place on the card
      seen.push({ cr, x: bx, y: by, here, g1, g2 });
    }
    if (!seen.length) continue;
    /* The median is not a threshold here — it is what the report quotes, and
       it is the number that tells a rule which has gone in one place from a
       rule that has been drawn quietly all the way round. */
    const sorted = seen.map((o) => o.cr).sort((p, q) => p - q);
    const median = sorted[sorted.length >> 1];
    let run = 0;
    let worstRun = 0;
    let worstAt = null;
    for (const o of seen) {
      if (o.cr < RULE_GONE) {
        run++;
        if (run > worstRun) {
          worstRun = run;
          worstAt = [Math.round(o.x), Math.round(o.y)];
        }
      } else run = 0;
    }
    ruleRows.push({
      face,
      name: r.name,
      len: Math.round(r.len),
      median,
      weakest: sorted[0],
      worstRun,
      worstAt,
    });
  }
};

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
  await walkRules(face, at);
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
for (const r of ruleRows)
  if (r.worstRun >= RULE_RUN)
    problems.push(
      `${r.face}: the rule "${r.name}" (${r.len} u long) stops for ${r.worstRun} units around [${r.worstAt.join(', ')}] — ${r.weakest.toFixed(0)} of colour from its own ground where it stops, against ${r.median.toFixed(0)} over the rest of it, and a printed rule needs ${RULE_GONE}`,
    );
if (exceptions.length)
  problems.push(`${exceptions.length} page exception(s): ${exceptions.join(' | ')}`);

close();

const worst = rows.slice(0, 3).map((r) => `${r.text} ${r.r.toFixed(2)}`);
const longestRun = ruleRows.reduce((m, r) => Math.max(m, r.worstRun), 0);
if (problems.length) {
  console.error(`test-ink: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `test-ink: ${rows.length} marks measured, all at or above ${FLOOR}:1 — faintest ${worst.join(' · ')} · ${ruleRows.length} printed rules walked end to end, all continuous — longest quiet stretch ${longestRun} u`,
);
