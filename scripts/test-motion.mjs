#!/usr/bin/env node
/* The page asked to hold still.

   `prefers-reduced-motion` is a promise, and a page that promises stillness
   while burning a core rendering stillness is not keeping it. The page's own
   loop is the thing that is supposed to stop, and it is not observable from
   outside — so instrument it: wrap requestAnimationFrame before any script on
   the page runs and count what the page itself asks for.

   wake() re-arms on every pointer event and the quality control calls it
   during setup; frame() re-arms itself until the card settles. A settled page
   under reduced motion should ask for almost nothing.

     node scripts/test-motion.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-motion');

const still = await openPage({
  port: 9386,
  userDataDir: '/tmp/fuji-motion',
  args: ['--force-prefers-reduced-motion'],
});
if (!still) skipped('test-motion');
await still.send('Page.enable');
await still.send('Runtime.enable');
await still.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => { window.__raf++; return raf(f); };`,
});
await still.send('Page.navigate', { url: PAGE });
await sleep(3000); // the card comes to rest well inside this
const asked = await still.evaluate(`window.__raf`);
await sleep(1000);
const askedLater = await still.evaluate(`window.__raf`);
const a = await still.evaluate(`document.querySelector('.card').style.transform`);
await sleep(900);
const b = await still.evaluate(`document.querySelector('.card').style.transform`);
ok('reduced motion holds the card still', a === b, `${a} | ${b}`);
ok(
  'and the page stops asking for frames',
  askedLater - asked < 5,
  `${askedLater - asked} rAF calls in the last second, ${asked} before it`,
);
ok(
  'no page exceptions under reduced motion',
  still.exceptions.length === 0,
  still.exceptions.join(' | '),
);
ok(
  'no browser errors under reduced motion',
  still.consoleErrors.length === 0,
  still.consoleErrors.slice(0, 3).join(' | '),
);

/* The classes the lake is made of. Each has a cause written beside it in
   06-motion.css; the tests below ask that the cause is not switched off along
   with the laminate, and that each mark is where the picture puts it. */
const WANT = [
  'mist-a',
  'mist-b',
  'ripple',
  'wake',
  'water-b',
  'refl',
  'boat',
  'boatman',
  'duck',
  'wader',
  'floater',
  'bird',
  'slow',
  'fish',
];

/* Where every one of them is with motion switched off. The same question gets
   asked of the living page below and the two answers are compared, because the
   bug this catches is invisible in either one alone: a CSS transform replaces
   a transform attribute instead of composing with it, and a mark positioned by
   the attribute and animated by the stylesheet is positioned at the origin of
   the picture and animated there. A mark that stays put may move a few pixels
   between the two pages. A mark that has been yanked to the origin moves by
   hundreds.

   Three classes are exempt because travelling is what they are for: the birds
   drift along their heading, and the petals fall. */
const EXEMPT = new Set(['bird', 'slow']);
const settled = JSON.parse(
  await still.evaluate(`
  (() => {
    const out = {};
    for (const c of ${JSON.stringify(WANT)}) {
      out[c] = [...document.querySelectorAll('.card svg .' + c)].map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
      });
    }
    return JSON.stringify(out);
  })()
`),
);

/* The promise, stated as a fact rather than as a list. The stylesheet used to
   name every animated class here, which meant the promise expired the moment a
   class was added somewhere else. Now the claim is that nothing inside a face
   animates at all, and that is what gets measured. */
const movingInAFace = `
  [...document.querySelectorAll('.face svg *')]
    .filter((el) => getComputedStyle(el).animationName !== 'none')
    .map((el) => (el.getAttribute('class') || el.tagName) + ' ' + getComputedStyle(el).animationName).join(', ')
`;
const stillMoving = await still.evaluate(movingInAFace);
ok('and nothing in the picture animates', stillMoving === '', stillMoving.slice(0, 120));

/* And the promise has to survive the thing a person is most likely to do
   next: reach for the laminate. Enhance's own rules are more specific than the
   reduced-motion rule — `html[data-enhance="on"] .bird` is two classes and an
   attribute against one class and two elements — and a media query carries no
   weight of its own, it only decides whether a rule applies. Until this was
   measured, switching Enhance on under reduced motion set four marks moving:
   the three birds gliding and the hull rocking.

   The state is set, never assumed: this profile keeps localStorage between
   runs, so the button may already be holding the laminate on. */
const setStillEnhance = async (on) => {
  const read = await still.evaluate(
    `(() => {
      const want = ${on ? 'true' : 'false'};
      if ((document.documentElement.dataset.enhance === 'on') !== want)
        document.getElementById('enhanceBtn').click();
      return document.documentElement.dataset.enhance;
    })()`,
  );
  await sleep(500);
  return (read === 'on') === on;
};
ok('the laminate can be switched on under reduced motion', await setStillEnhance(true));
const stillMovingOn = await still.evaluate(movingInAFace);
ok(
  'and still nothing animates, with Enhance on',
  stillMovingOn === '',
  stillMovingOn.slice(0, 120),
);
await setStillEnhance(false);
still.close();

/* ---------- the other half: the picture moves when nobody asks it to ---------- */
/* Enhance is off, which is the default, and the lake is still a lake. Each of
   these has a cause written beside it in 06-motion.css; the test is that the
   cause is not switched off along with the laminate. */
const living = await openPage({ port: 9388, userDataDir: '/tmp/fuji-living' });
if (!living) skipped('test-motion');
await living.send('Page.enable');
await living.send('Runtime.enable');
await living.send('Page.navigate', { url: PAGE });
await sleep(2500);

/* The state is set, not assumed. The profile this test uses keeps its
   localStorage between runs, so a click in an earlier run is a stored
   preference in this one, and a test that reads whatever the page happens to
   come up with fails for reasons that have nothing to do with the page. */
const setEnhance = async (on) => {
  const now = await living.evaluate(`document.documentElement.dataset.enhance`);
  if ((now === 'on') !== on) {
    await living.evaluate(`document.getElementById('enhanceBtn').click()`);
    await sleep(500);
  }
  return (
    (await living.evaluate(`document.documentElement.dataset.enhance`)) === (on ? 'on' : 'off')
  );
};
ok('Enhance is off', await setEnhance(false));
const running = await living.evaluate(`
  (() => {
    const out = {};
    for (const c of ${JSON.stringify(WANT)}) {
      const els = [...document.querySelectorAll('.card svg .' + c)];
      out[c] = els.length + ':' + els.filter((e) => getComputedStyle(e).animationName !== 'none').length;
    }
    return JSON.stringify(out);
  })()
`);
const counts = JSON.parse(running);
const dead = Object.entries(counts).filter(([, v]) => {
  const [n, live] = v.split(':').map(Number);
  return n === 0 || live !== n;
});
ok(
  'the lake keeps moving with Enhance off',
  dead.length === 0,
  Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ') || 'nothing found',
);
ok(
  'a far bird drifts rather than crosses when nothing is switched on',
  (await living.evaluate(
    `getComputedStyle(document.querySelector('.card svg .bird')).animationName`,
  )) === 'drift-far',
  await living.evaluate(
    `getComputedStyle(document.querySelector('.card svg .bird')).animationName`,
  ),
);

/* A CSS transform does not compose with a transform attribute — it replaces it
   outright. So a mark that is positioned by the attribute and animated by the
   stylesheet is positioned at the origin of the picture and animated there.
   That is what the ducks, the heron and the fish were doing: bobbing in the
   top-left corner of the card, hidden under the shore, for as long as they had
   been bobbing at all. Every screenshot taken to check them was taken with
   motion switched off — reduced motion is the only way to get two renders that
   agree — and the geometry tests run the same way. The bug lived in the half of
   the page nobody photographs. */
const overridden = await living.evaluate(`
  (() => {
    const bad = [];
    for (const e of document.querySelectorAll('.face svg *')) {
      if (!e.getAttribute('transform')) continue;
      const name = getComputedStyle(e).animationName;
      if (name === 'none') continue;
      bad.push((e.getAttribute('class') || e.tagName) + ' ' + name);
    }
    return bad.join(' | ');
  })()
`);
ok('nothing animates a transform over a placement', overridden === '', overridden.slice(0, 160));

/* The same question, asked of the picture rather than of the stylesheet. The
   check above catches one cause of a mark being in the wrong place; this one
   catches the fact of it, whatever the cause. */
const where = JSON.parse(
  await living.evaluate(`
  (() => {
    const out = {};
    for (const c of ${JSON.stringify(WANT)}) {
      out[c] = [...document.querySelectorAll('.card svg .' + c)].map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
      });
    }
    return JSON.stringify(out);
  })()
`),
);
const drifted = [];
for (const c of Object.keys(settled)) {
  if (EXEMPT.has(c)) continue;
  const a = settled[c];
  const b = where[c];
  if (a.length !== b.length) {
    drifted.push(`${c}: ${a.length} marks at rest, ${b.length} running`);
    continue;
  }
  for (let i = 0; i < a.length; i++) {
    const d = Math.round(Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
    if (d > 8) drifted.push(`${c}[${i}] ${a[i]} -> ${b[i]}, ${d} px`);
  }
}
ok(
  'every mark stays where the picture puts it',
  drifted.length === 0,
  drifted.slice(0, 3).join(' | '),
);

/* Rule 2 over time. Nothing in the scene may repeat at even intervals, and the
   smallest way to break that is two marks a hand's width apart keeping step.
   Two things this found, both of which had been true for a long time: the wake
   and one ripple were both on 23 s, and the six crests of the glitter band —
   given their periods by `nth-child(2n)` and `nth-child(3n)` — were three
   pairs of twins.

   Adjacency is what the eye compares, so adjacency is what the rule is about:
   within 200 CSS pixels (about 190 units of the artwork), two animated marks
   must not share a period and neither may be a whole multiple of the other.
   Two exclusions, both of them claims about the picture. A mark wider or
   taller than 200 px is a surface — a mist band, the glitter path, the ray
   field — and a surface is not a neighbour of anything. And a mark that is
   travelling is not a neighbour either: a bird crossing the sky is next to a
   duck for four seconds and then is not, so its period is a duration of
   passage, not a step the eye can compare. That is measured, not guessed —
   anything that moves more than 4 px in three seconds is a traveller. The
   number is measured, not guessed: every mark that stays put moves 0 px in
   that window at this scale, and a petal in transit moves 5-6.

   It runs in both tiers. It used to run with Enhance off only, on the grounds
   that the reeds sway in stands and the check would confuse a stand with a
   pair of neighbours — but a stand is one element, one group, one animation,
   so the check was already comparing stands to one another rather than blades.
   Running it once the laminate is on found fourteen pairs keeping step: three
   stands of reeds on 13 s and 17 s beside each other, a bird crossing the lake
   on exactly twice the period of the ripple below it, a hull rocking at half a
   reed's period. Those were the numbers the second tier was built from, and
   nothing had ever compared them. */
const rhythmProbe = `(async () => {
      const collect = () =>
        [...document.querySelectorAll('.card svg *')]
          .map((el) => {
            const s = getComputedStyle(el);
            if (s.animationName === 'none') return null;
            const r = el.getBoundingClientRect();
            if (!r.width && !r.height) return null;
            return {
              dur: parseFloat(s.animationDuration),
              x: r.x + r.width / 2,
              y: r.y + r.height / 2,
              w: r.width,
              h: r.height,
              cls: el.getAttribute('class') || el.tagName,
            };
          })
          .filter(Boolean);
      const first = collect();
      await new Promise((r) => setTimeout(r, 3000));
      const second = collect();
      const els = first.filter((e, i) => {
        if (e.w > 200 || e.h > 200) return false;
        if (!second[i]) return true;
        return Math.hypot(second[i].x - e.x, second[i].y - e.y) < 4;
      });
      const bad = [];
      for (let i = 0; i < els.length; i++)
        for (let j = i + 1; j < els.length; j++) {
          const a = els[i], b = els[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) > 200) continue;
          const [hi, lo] = a.dur > b.dur ? [a.dur, b.dur] : [b.dur, a.dur];
          const equal = Math.abs(a.dur - b.dur) < 0.01;
          const multiple = Math.abs(hi / lo - Math.round(hi / lo)) < 0.01 && Math.round(hi / lo) > 1;
          if (equal || multiple)
            bad.push(
              \`\${a.cls} (\${a.dur}s, \${Math.round(a.x)},\${Math.round(a.y)}) and \${b.cls} (\${b.dur}s, \${Math.round(b.x)},\${Math.round(b.y)}) \${equal ? 'share' : 'are a multiple of'} a period\`,
            );
        }
      return JSON.stringify({ n: els.length, bad });
    })()`;
const rhythm = JSON.parse(await living.evaluate(rhythmProbe, { awaitPromise: true }));
ok(
  'no two nearby marks keep step',
  rhythm.bad.length === 0,
  `${rhythm.n} marks compared · ${rhythm.bad.slice(0, 3).join(' | ')}`,
);
ok(
  'no page exceptions with the gentle set running',
  living.exceptions.length === 0,
  living.exceptions.join(' | '),
);
/* The two tiers, measured on the same element: a petal carries both periods
   as custom properties and the stylesheet chooses. If the wiring is wrong the
   petal falls at one speed in both modes, which is the failure this catches. */
const slowFirst = JSON.parse(
  await living.evaluate(
    `JSON.stringify([...document.querySelectorAll('.card svg .petal.slow')].map((e) => getComputedStyle(e).animationDuration))`,
  ),
);
ok('the laminate can be switched on', await setEnhance(true));
const slowSecond = JSON.parse(
  await living.evaluate(
    `JSON.stringify([...document.querySelectorAll('.card svg .petal.slow')].map((e) => getComputedStyle(e).animationDuration))`,
  ),
);
ok(
  'and the same petals fall faster with it on',
  slowFirst.join() !== slowSecond.join() && slowFirst.length === 3,
  `${slowFirst.join(' ')} off → ${slowSecond.join(' ')} on`,
);
ok(
  'and then the birds cross',
  (await living.evaluate(
    `getComputedStyle(document.querySelector('.card svg .bird')).animationName`,
  )) === 'glide',
  await living.evaluate(
    `getComputedStyle(document.querySelector('.card svg .bird')).animationName`,
  ),
);
/* The same comparison with the laminate on, where the second tier's periods
   are the ones in play: the birds glide, the hull rocks harder, the reeds
   sway, the petals fall. */
const rhythmOn = JSON.parse(await living.evaluate(rhythmProbe, { awaitPromise: true }));
ok(
  'and none of them keep step with the laminate on either',
  rhythmOn.bad.length === 0,
  `${rhythmOn.n} marks compared · ${rhythmOn.bad.slice(0, 3).join(' | ')}`,
);
living.close();
finish();
