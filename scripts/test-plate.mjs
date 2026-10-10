#!/usr/bin/env node
/* Nothing on the plate may be printed on top of a rule.

   The card carries two concentric gilded rules on the front and a plain
   double rule on the back, plus the travelling glint that rides the outer
   one. They are what make the artwork a plate rather than a picture, and the
   lettering — 富嶽, MT. FUJI, the place line, PAR AVION — is the smallest,
   lowest-contrast type on the card, so it is the thing most likely to be set
   into them.

   It was, twice. The front's place line sat at y=588, below both rules (579
   and 586), so both rules and the bright glint dash were drawn straight
   through the letters. The back's air-mail caption sat at y=571, between the
   rules at 569 and 574, with the inner one through the middle of the word.
   Both survived every screenshot anyone looked at because at reading distance
   a collision is a few pixels, and the type is deliberately faint.

   So this measures it instead of looking at it: every <text> on a face
   against every rule on that face, in the artwork's own user units. A rule is
   found by what it is — a stroked, unfilled outline, or a straight mark with
   no rise, running most of the way across the plate — not by a list of ids,
   because the front's frame is gilded and the back's is not and the first
   version of this test only knew the front's names. It measured the front and
   skipped the back without saying so: the back face is mirrored, its matrix
   has a negative a, and boxes mapped through it came out inside-out.

     node scripts/test-plate.mjs

   Needs Chrome; skips, like the layout test, when it is not installed. */
import { openPage, silentPage } from './cdp.mjs';

const PORT = 9379;
const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);

const page = await openPage({
  port: PORT,
  userDataDir: '/tmp/fuji-plate-test',
  // the card sways, and a swaying card is a moving ruler
  args: ['--force-prefers-reduced-motion'],
});
if (!page) {
  console.log('test-plate: no Chrome, or Chrome did not come up - skipped');
  process.exit(0);
}
const { send, evaluate, exceptions, close } = page;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1150,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await new Promise((r) => setTimeout(r, 1500));

const probe = `(() => {
  const faces = [...document.querySelectorAll('.face svg')];
  const out = [];
  for (const svg of faces) {
    const m = svg.getScreenCTM();
    if (!m) continue;
    const vb = svg.viewBox.baseVal;
    // The back face is mirrored: its matrix has a negative a, so a box mapped
    // through it comes out inside-out. Map with the signed terms and take the
    // corners, which is also what a rotated face needs.
    const box = (el) => {
      const b = el.getBoundingClientRect();
      const p = (x, y) => ({ x: (x - m.e) / m.a, y: (y - m.f) / m.d });
      const q = [p(b.left, b.top), p(b.right, b.top), p(b.left, b.bottom), p(b.right, b.bottom)];
      return {
        x1: Math.min(...q.map((v) => v.x)),
        x2: Math.max(...q.map((v) => v.x)),
        y1: Math.min(...q.map((v) => v.y)),
        y2: Math.max(...q.map((v) => v.y)),
      };
    };
    const strokeWidth = (el) => parseFloat(getComputedStyle(el).strokeWidth) || 1;
    /* A rule is any straight mark that runs most of the way across the plate:
       an axis-aligned outline, or a path with no rise and no run. That is a
       property of the drawing, not a list of ids — the front's frame is
       gilded and the back's is a plain double rule, and the lettering can be
       crossed by either. Diagonal rays, the waterline and the mountain
       itself are marks too, but they are not rules and are not this test. */
    const rules = [];
    for (const el of svg.querySelectorAll('rect, path, line')) {
      const cs = getComputedStyle(el);
      if (!cs.stroke || cs.stroke === 'none') continue;
      if (cs.fill && cs.fill !== 'none') continue;
      const b = box(el);
      const w = b.x2 - b.x1;
      const h = b.y2 - b.y1;
      const straight =
        (w < 0.01 && h >= vb.height * 0.4) || (h < 0.01 && w >= vb.width * 0.4);
      const outline =
        el.tagName.toLowerCase() === 'rect' && (w >= vb.width * 0.4 || h >= vb.height * 0.4);
      if (straight || outline) rules.push({ el, b });
    }
    if (!rules.length) continue;
    // A rect rule is an outline, so it is four thin bands, not one big box:
    // a letter inside the frame is nowhere near its bottom edge, and treating
    // the rect as a filled box would call every letter on the card a
    // collision. A straight rail is already one band.
    const bands = [];
    for (const { el, b } of rules) {
      const h = strokeWidth(el) / 2;
      const name =
        el.tagName +
        (el.getAttribute('class') ? '.' + el.getAttribute('class') : '') +
        ' ' +
        getComputedStyle(el).stroke.slice(0, 18);
      if (el.tagName.toLowerCase() === 'rect') {
        bands.push(
          { name: name + ' top', x1: b.x1 - h, y1: b.y1 - h, x2: b.x2 + h, y2: b.y1 + h },
          { name: name + ' bottom', x1: b.x1 - h, y1: b.y2 - h, x2: b.x2 + h, y2: b.y2 + h },
          { name: name + ' left', x1: b.x1 - h, y1: b.y1 - h, x2: b.x1 + h, y2: b.y2 + h },
          { name: name + ' right', x1: b.x2 - h, y1: b.y1 - h, x2: b.x2 + h, y2: b.y2 + h },
        );
      } else {
        bands.push({ name, x1: b.x1 - h, y1: b.y1 - h, x2: b.x2 + h, y2: b.y2 + h });
      }
    }
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim());
    const hits = [];
    let closest = { gap: Infinity, what: '' };
    const gapBetween = (a, b) => {
      const dx = Math.max(b.x1 - a.x2, a.x1 - b.x2, 0);
      const dy = Math.max(b.y1 - a.y2, a.y1 - b.y2, 0);
      return Math.hypot(dx, dy);
    };
    for (const t of texts) {
      const b = box(t);
      const label = t.textContent.trim().slice(0, 24);
      for (const band of bands) {
        const gap = gapBetween(b, band);
        if (gap === 0) hits.push(label + ' x ' + band.name);
        else if (gap < closest.gap) closest = { gap: +gap.toFixed(2), what: label + ' -> ' + band.name };
      }
    }
    out.push({ face: svg.closest('.face').className, rules: bands.length, hits, closest });
  }
  return JSON.stringify(out);
})()`;

const faces = JSON.parse(await evaluate(probe));
const problems = [];
const notes = [];
// A collision is a rule through letters. A gap under a unit is the same thing
// arriving by degrees, so the floor is reported too: 1.5 units is where the
// place line sits now, and it is close enough that someone will try to move it.
const FLOOR = 1;
for (const f of faces) {
  if (f.hits.length)
    problems.push(`${f.face}: a gilded rule crosses the letters — ${f.hits.join('; ')}`);
  else if (f.closest.gap < FLOOR)
    problems.push(
      `${f.face}: ${f.closest.what} is ${f.closest.gap} units from the rule, under the ${FLOOR}-unit floor`,
    );
  notes.push(
    `${f.face}: ${f.rules} rules, ${f.hits.length ? `${f.hits.length} collision(s)` : `clear, closest ${f.closest.gap} units (${f.closest.what})`}`,
  );
}
if (exceptions.length)
  problems.push(`${exceptions.length} page exception(s): ${exceptions.join(' | ')}`);

close();

if (problems.length) {
  console.error(`test-plate: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`test-plate: ${notes.join(' · ')} — no problems`);
