#!/usr/bin/env node
/* Nothing on the plate may be printed on top of the frame.

   The card carries two concentric gilded rules and a travelling glint that
   rides the outer one. They are what make the artwork a plate rather than a
   picture, and the plate inscription — 富嶽, MT. FUJI, 3,776 M and the place
   line under it — is the smallest, lowest-contrast type on the card, so it is
   the thing most likely to be set into them.

   It was. The place line sat at y=588, below both rules (579 and 586), so both
   rules and the bright glint dash were drawn straight through the letters. It
   survived every screenshot anyone looked at because at reading distance the
   collision is a few pixels, and the type is deliberately faint.

   So this measures it instead of looking at it: every <text> on a face against
   every gilded rule on that face, in the artwork's own user units. A rule is
   its geometry box widened by half its stroke, and a text box that overlaps
   that band is a rule crossing letters.

     node scripts/test-plate.mjs

   Needs Chrome; skips, like the layout test, when it is not installed. */
import { openPage } from './cdp.mjs';

const PORT = 9379;
const PAGE = new URL('../public/index.html', import.meta.url).href;

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
    const s = m.a;
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return {
        x1: (b.left - m.e) / s,
        y1: (b.top - m.f) / s,
        x2: (b.right - m.e) / s,
        y2: (b.bottom - m.f) / s,
      };
    };
    const strokeWidth = (el) => {
      for (let n = el; n && n !== svg; n = n.parentElement) {
        const w = n.getAttribute && n.getAttribute('stroke-width');
        if (w) return parseFloat(w);
      }
      return 1;
    };
    const rules = [...svg.querySelectorAll('[stroke="url(#goldFrame)"] > rect, #edgeGlint > path')];
    if (!rules.length) continue;
    // A rect rule is an outline, so it is four thin bands, not one big box:
    // a letter inside the frame is nowhere near its bottom edge, and treating
    // the rect as a filled box would call every letter on the card a
    // collision. A straight rail is already one band.
    const bands = [];
    for (const r of rules) {
      const b = box(r);
      const h = strokeWidth(r) / 2;
      const name = r.tagName + (r.getAttribute('class') ? '.' + r.getAttribute('class') : '');
      if (r.tagName.toLowerCase() === 'rect') {
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
    out.push({ face: svg.closest('.face').className, hits, closest });
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
    `${f.face}: ${f.hits.length ? `${f.hits.length} collision(s)` : `clear, closest ${f.closest.gap} units (${f.closest.what})`}`,
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
