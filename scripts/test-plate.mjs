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
    /* Nothing that was placed may be cut off by the edge of the plate.
       The picture runs to the edge and the border is printed on top of it, so
       a mark that crosses the border is standing in the blank margin, and one
       that crosses the edge is a plant sliced in half by the card. The edge is
       the largest stroked, unfilled outline on the face — on both faces it is
       a rect at 4..896 × 4..596 — and the rule is structural rather than a
       list of ids, because the front's frame is gilded and the back's is not.
       The cherry branch is the one thing that leaves the picture on purpose,
       and it leaves as a path, not as a placement. */
    const edge = rules
      .map((r) => r.b)
      .filter((b) => b.x1 > 0 && b.x2 < vb.width && b.y1 > 0 && b.y2 < vb.height)
      .sort((p, q) => q.x2 - q.x1 - (p.x2 - p.x1))[0];
    const strays = [];
    if (edge)
      for (const el of svg.querySelectorAll('use')) {
        const b = box(el);
        if (b.x2 - b.x1 < 0.01 && b.y2 - b.y1 < 0.01) continue; // a mark that is not drawn
        if (b.x1 < edge.x1 - 0.5 || b.x2 > edge.x2 + 0.5 || b.y1 < edge.y1 - 0.5 || b.y2 > edge.y2 + 0.5)
          strays.push(
            el.getAttribute('href') +
              ' [' +
              b.x1.toFixed(0) +
              ',' +
              b.x2.toFixed(0) +
              ']x[' +
              b.y1.toFixed(0) +
              ',' +
              b.y2.toFixed(0) +
              ']',
          );
      }

    /* Nothing the cast places may be painted on top of a letter.

       Paint order is the whole of it: a petal that drifts behind the title box
       is part of the picture, and the same petal drawn after the box is a
       smudge across a glyph. Only the use elements are asked, because only the
       cast is placed from data and can be moved onto a letter by somebody
       editing a number. The drawn layers — the foxing, the grain, the vignette,
       the cancellation rings — overlap the lettering on purpose, which is what
       sixty years and a post office look like, and they are not this rule. */
    const onTop = [];
    for (const t of texts) {
      const tb = box(t);
      for (const el of svg.querySelectorAll('use')) {
        if (el.children.length) continue;
        if (!(t.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        const b = box(el);
        if (b.x2 - b.x1 < 0.5 || b.y2 - b.y1 < 0.5) continue;
        const ox = Math.min(tb.x2, b.x2) - Math.max(tb.x1, b.x1);
        const oy = Math.min(tb.y2, b.y2) - Math.max(tb.y1, b.y1);
        if (ox > 1 && oy > 1)
          onTop.push(
            (t.textContent.trim().slice(0, 14) || '(text)') +
              ' under ' +
              (el.getAttribute('href') || el.tagName) +
              ' (' +
              ox.toFixed(0) +
              'x' +
              oy.toFixed(0) +
              ' u)',
          );
      }
    }

    // The widest lettering on the face, in user units. It is reported so the
    // two passes cannot look like the same measurement twice: the gap that is
    // closest to a rule is usually a vertical one, and a different font moves
    // the width long before it moves the baseline.
    const widest = Math.max(
      ...texts.map((t) => {
        const b = box(t);
        return b.x2 - b.x1;
      }),
      0,
    );
    out.push({
      face: svg.closest('.face').className,
      rules: bands.length,
      hits,
      closest,
      widest: +widest.toFixed(1),
      strays,
      onTop,
    });
  }
  return JSON.stringify(out);
})()`;

/* Two passes, because the page's typography is set in fonts that exist on one
   platform. Iowan Old Style, Hiragino Mincho ProN, Yu Mincho, Songti SC: every
   one of them is a macOS font, and the lettering's width — which is what puts
   it near a rule or not — is a property of the font, not of the page. On Linux
   and Android none of them are there, and the fallback is whatever generic
   serif the system has, which is usually wider.

   The second pass forces the worst case rather than hoping for a machine to
   demonstrate it: every text element is told to use the generic serif, which
   beats the font-family attributes the way any CSS does. If the lettering
   clears the rules with the widest plausible fallback, it clears with the
   fonts the page was drawn in. */
const passes = [
  { label: '', css: '' },
  {
    label: ' with the generic serif',
    css: 'svg text, svg textSpan, [font-family] { font-family: serif !important }',
  },
];
const results = [];
for (const pass of passes) {
  if (pass.css)
    await evaluate(`(() => {
      const st = document.createElement('style');
      st.id = 'fallback-pass';
      st.textContent = ${JSON.stringify(pass.css)};
      document.head.appendChild(st);
      return 1;
    })()`);
  await new Promise((r) => setTimeout(r, 400));
  for (const f of JSON.parse(await evaluate(probe))) results.push({ ...f, pass: pass.label });
}

const faces = results;
const problems = [];
const notes = [];
// A collision is a rule through letters. A gap under a unit is the same thing
// arriving by degrees, so the floor is reported too: 1.5 units is where the
// place line sits now, and it is close enough that someone will try to move it.
const FLOOR = 1;
for (const f of faces) {
  if (f.hits.length)
    problems.push(`${f.face}${f.pass}: a gilded rule crosses the letters — ${f.hits.join('; ')}`);
  else if (f.closest.gap < FLOOR)
    problems.push(
      `${f.face}${f.pass}: ${f.closest.what} is ${f.closest.gap} units from the rule, under the ${FLOOR}-unit floor`,
    );
  if (f.onTop.length)
    problems.push(
      `${f.face}: something is painted on top of the lettering — ${f.onTop.join('; ')}`,
    );
  if (f.strays.length)
    problems.push(
      `${f.face}: a placed mark is cut off by the edge of the plate — ${f.strays.join('; ')}`,
    );
  notes.push(
    `${f.face}${f.pass}: ${f.rules} rules, widest mark ${f.widest} u, ${f.hits.length ? `${f.hits.length} collision(s)` : `clear, closest ${f.closest.gap} units (${f.closest.what})`}`,
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
