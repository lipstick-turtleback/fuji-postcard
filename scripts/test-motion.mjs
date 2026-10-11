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
  'petal',
  'petal-sway',
  'fish',
  'branch',
  'bloom',
  'reflection',
  'ring',
  'band',
];

/* Where every one of them is with motion switched off. The same question gets
   asked of the living page below and the two answers are compared, because the
   bug this catches is invisible in either one alone: a CSS transform replaces
   a transform attribute instead of composing with it, and a mark positioned by
   the attribute and animated by the stylesheet is positioned at the origin of
   the picture and animated there. A mark that stays put may move a few pixels
   between the two pages. A mark that has been yanked to the origin moves by
   hundreds.

   Classes are exempt when travelling is what they are for: the birds drift
   along their heading, and a petal falls — and the group that slides and turns
   inside a falling petal goes exactly where the fall takes it. */
const EXEMPT = new Set(['bird', 'petal', 'petal-sway']);
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

/* And the drift has to be a distance, not a fact about the stylesheet. The
   birds moved 2 units over 67 seconds, which is 0.03 units a second: every
   check so far said the birds were animated, and on the card they stayed exactly
   where they had been put. This asks how far each one actually goes, and it is
   read off the element rather than the animation because the page has been open
   for two seconds of a 67-second swing — the excursion is what the mark promises
   between its extremes, which is what `alternate` guarantees it will make. */
const birdDrift = JSON.parse(
  await living.evaluate(`(() => {
    const els = [...document.querySelectorAll('.card svg .bird')];
    const own = new Set();
    const reach = [];
    for (const e of els) {
      const s = getComputedStyle(e);
      const dx = parseFloat(s.getPropertyValue('--dx'));
      const dy = parseFloat(s.getPropertyValue('--dy'));
      own.add([s.animationDuration, s.animationDelay, dx, dy].join('|'));
      reach.push(Math.hypot(dx, dy));
    }
    return JSON.stringify({ n: els.length, own: own.size, reach });
  })()`),
);
ok(
  'and each bird drifts its own distance, far enough to be missed and found',
  birdDrift.n === 3 && birdDrift.own === 3 && birdDrift.reach.every((r) => r >= 4),
  `${birdDrift.own} different drifts · ${birdDrift.reach.map((r) => r.toFixed(1)).join(' ')} units between the extremes`,
);

/* The water holds four mirrors — the mountain, the gate, and the two smears the
   ducks leave — and a mirror that only changes its opacity is a mirror of a
   frozen lake. Each is asked how far its own far edge actually travels: the
   sideways slide plus the stretch about the waterline, which is what the
   keyframe promises between its two extremes. The distance is measured rather
   than the percentage because the mountain's mirror is 117 units deep and the
   gate's is 14, so the same percentage of stretch is a very different amount of
   picture, and it is the amount that has to be enough. */
const mirrors = JSON.parse(
  await living.evaluate(`(() => {
    const els = [...document.querySelectorAll('.card svg .reflection')];
    const own = new Set();
    const reach = [];
    for (const e of els) {
      const s = getComputedStyle(e);
      const wob = parseFloat(s.getPropertyValue('--wob'));
      const stretch = parseFloat(s.getPropertyValue('--stretch'));
      own.add([s.animationDuration, s.animationDelay, wob, stretch].join('|'));
      reach.push(2 * wob + 2 * stretch * e.getBBox().height);
    }
    return JSON.stringify({ n: els.length, own: own.size, reach });
  })()`),
);
ok(
  'and the lake moves its reflections, not just their brightness',
  mirrors.n === 4 && mirrors.own === 4 && mirrors.reach.every((r) => r >= 0.8),
  `${mirrors.n} mirrors · ${mirrors.own} different motions · ${mirrors.reach.map((r) => r.toFixed(2)).join(' ')} units at the far edge`,
);

/* The branch and its flowers move in still air too, at a fifth of the amplitude
   and an eighth of the speed: the air that lets a petal go also holds the branch
   up, and a branch that only moves when somebody switches the laminate on is a
   branch with a switch on it rather than a branch in the wind.

   This check used to say the opposite — that they held still — and it was
   written when the branch did hold still, one commit before it began to move in
   the gust tier. A check that contradicts the picture is not a guard, it is a
   photograph of an old decision; it changed because the picture did. */
const branchCalm = await living.evaluate(
  `[...document.querySelectorAll('.card svg .branch, .card svg .bloom')]
     .filter((e) => getComputedStyle(e).animationName !== 'none').length`,
);
ok(
  'the branch and its flowers move in still air too',
  branchCalm === 16,
  `${branchCalm} of 16 moving`,
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

/* The complaint that put this here: some petals fall and some do not, and the
   two halves of that sentence need two different questions. The check above
   asks whether a petal has an animation at all. This one asks the harder half
   — that the ten are not all doing the same motion. Each petal is sampled at
   its centre three seconds apart, and the ten headings that come out have to
   be ten different headings, none of them zero. One keyframe shared by ten
   petals, which is what the sheet used to be — `translate(-150px, 430px)
   rotate(340deg)` for every petal on the card — gives ten petals the same
   heading at the same phase, and that is one clump multiplied, not a shower. */
const shower = JSON.parse(
  await living.evaluate(
    `(async () => {
      const els = [...document.querySelectorAll('.card svg .petal')];
      const at = () =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2];
        });
      const a = at();
      await new Promise((r) => setTimeout(r, 3000));
      const b = at();
      const v = a.map((p, i) => [
        Math.round((b[i][0] - p[0]) * 10) / 10,
        Math.round((b[i][1] - p[1]) * 10) / 10,
      ]);
      /* And the trajectories themselves. Ten different headings over three
         seconds can come out of one shared path with ten different phases, so
         the headings alone do not prove the petals are each their own. The
         numbers that draw the path are on the elements, so they get read here:
         how far each petal falls, where the wind sets it, how wide its slide
         is. What has to be ten-to-one is the triple, not each number — two
         petals standing at the same height above a flat lake fall the same
         distance, and that is not a second petal drawn badly, that is what a
         lake is. */
      const own = els.map((e) => {
        const s = getComputedStyle(e);
        const w = getComputedStyle(e.querySelector('.petal-sway'));
        return [
          s.getPropertyValue('--fall').trim(),
          s.getPropertyValue('--setx').trim(),
          w.getPropertyValue('--sway').trim(),
        ].join('/');
      });
      return JSON.stringify({
        n: els.length,
        still: v.filter(([dx, dy]) => Math.hypot(dx, dy) < 1).length,
        headings: new Set(v.map((d) => d.join(','))).size,
        paths: new Set(own).size,
        v,
      });
    })()`,
    { awaitPromise: true },
  ),
);
ok(
  'every petal is falling, and no two of them fall the same way',
  shower.n === 10 &&
    shower.still === 0 &&
    shower.headings === shower.n &&
    shower.paths === shower.n,
  `${shower.n} petals · ${shower.still} not moving · ${shower.headings} different headings · ${shower.paths} different paths · ${shower.v
    .map((d) => d.join('+'))
    .join(' ')}`,
);

/* The same question, asked of the four petals that have already reached the
   water. They are in the allow-list and they have four different periods, and
   none of that is enough: the bob was 0.4 by 0.5 of a unit, which is half a
   pixel at the size this card is drawn, and it was the same half a pixel for
   all four. A mark can pass every check that asks whether it is animated and
   still be animated by an amount nobody can see.

   So this measures the bob itself, out of the element's own computed transform
   — not its bounding box, which would carry the long slow drift across the lake
   as well — and it measures an excursion, not a displacement between two
   moments. A displacement depends on when you look: the slowest petal takes
   nearly twelve seconds to reach the top of its swell, and sampled from the
   wrong pair of seconds it has moved nothing at all, which is true and useless.
   Over a window longer than that half-period, the whole rise and fall is
   visible whatever the phase, and the number is the petal's own: 1.7 to 2.9
   units now, 0.64 before. */
const swell = JSON.parse(
  await living.evaluate(
    `(async () => {
      const els = [...document.querySelectorAll('.card svg .floater')];
      const at = () =>
        els.map((e) => {
          const m = new DOMMatrix(getComputedStyle(e).transform);
          return [m.e, m.f];
        });
      const lo = at();
      const hi = lo.map((p) => [p[0], p[1]]);
      for (let k = 0; k < 6; k++) {
        await new Promise((r) => setTimeout(r, 4000));
        const now = at();
        for (let i = 0; i < els.length; i++) {
          lo[i][0] = Math.min(lo[i][0], now[i][0]);
          lo[i][1] = Math.min(lo[i][1], now[i][1]);
          hi[i][0] = Math.max(hi[i][0], now[i][0]);
          hi[i][1] = Math.max(hi[i][1], now[i][1]);
        }
      }
      const v = lo.map((p, i) =>
        Math.round(Math.hypot(hi[i][0] - p[0], hi[i][1] - p[1]) * 100) / 100,
      );
      return JSON.stringify({ n: els.length, v, small: v.filter((d) => d < 1).length });
    })()`,
    { awaitPromise: true },
  ),
);
ok(
  'the petals on the water are floating, not bolted down',
  swell.n === 4 && swell.small === 0,
  `${swell.n} petals · ${swell.small} with a swell under 1 u in 24 seconds · ${swell.v.join(' ')} u`,
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
/* The two tiers, measured on the same elements: a petal carries both periods
   as custom properties and the stylesheet chooses. If the wiring is wrong the
   petal falls at one speed in both modes, which is the failure this catches.
   It used to ask this of the three `slow` petals only, and three of ten was
   the defect, not the sample. */
const fallDurations = `.card svg .petal`;
const readFalls = async () =>
  JSON.parse(
    await living.evaluate(
      `JSON.stringify([...document.querySelectorAll('${fallDurations}')].map((e) => parseFloat(getComputedStyle(e).animationDuration)))`,
    ),
  );
/* The same wiring, one level up: the branch and its fifteen flowers each carry
   both amplitudes and both periods, and the stylesheet picks between them by
   animation name. Sixteen numbers in each tier. */
const readBranch = async () =>
  JSON.parse(
    await living.evaluate(
      `JSON.stringify([...document.querySelectorAll('.card svg .branch, .card svg .bloom')].map((e) => parseFloat(getComputedStyle(e).animationDuration)))`,
    ),
  );
const fallsFirst = await readFalls();
const branchFirst = await readBranch();
ok('the laminate can be switched on', await setEnhance(true));
const fallsSecond = await readFalls();
const branchSecond = await readBranch();
ok(
  'and every petal falls faster with it on',
  fallsFirst.length === 10 &&
    fallsSecond.length === 10 &&
    fallsFirst.every((d, i) => fallsSecond[i] < d) &&
    new Set(fallsFirst).size === 10 &&
    new Set(fallsSecond).size === 10,
  `${fallsFirst.join(' ')} off → ${fallsSecond.join(' ')} on`,
);
ok(
  'and the branch sways less with the laminate off',
  branchFirst.length === 16 &&
    branchSecond.length === 16 &&
    branchFirst.every((d, i) => branchSecond[i] < d) &&
    new Set(branchFirst).size === 16 &&
    new Set(branchSecond).size === 16,
  `${branchFirst.join(' ')} off → ${branchSecond.join(' ')} on`,
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
/* And the branch has to actually move when the wind is up, every flower its own
   way. The swing itself is a third of a unit at the near end, which is a quarter
   of a pixel at the size this card is drawn, so it is not measured by
   displacement the way the falling petals are; what is measured is that all
   fifteen flowers are animating, that no two of them carry the same amplitude,
   tilt, period and phase, and that the branch they hang from is animating too.
   The rhythm probe that follows then keeps them out of step with the fish, the
   drifting petals, the birds, the clouds and the mist — which is exactly what it
   did when the first set of periods put 19.4 s under the fish's 97 s, five times
   exactly. */
const branchOn = JSON.parse(
  await living.evaluate(
    `(() => {
      const els = [...document.querySelectorAll('.card svg .bloom')];
      /* The tier picks which amplitude and which period a flower uses, so the
         period and the phase are read off the computed animation — that is the
         one the page is actually running — and the two amplitudes are read from
         the element, because the tier that is not in play is still a number the
         flower owns. */
      const own = els.map((e) => {
        const s = getComputedStyle(e);
        return [
          s.animationName,
          s.animationDuration,
          s.animationDelay,
          s.getPropertyValue('--sway').trim(),
          s.getPropertyValue('--sway-on').trim(),
        ].join('|');
      });
      return JSON.stringify({
        n: els.length,
        moving: els.filter((e) => getComputedStyle(e).animationName !== 'none').length,
        own: new Set(own).size,
        branch: getComputedStyle(document.querySelector('.card svg .branch')).animationName !== 'none',
      });
    })()`,
  ),
);
ok(
  'the branch rocks and every flower on it swings its own way',
  branchOn.n === 15 && branchOn.moving === 15 && branchOn.own === 15 && branchOn.branch,
  `${branchOn.moving}/${branchOn.n} flowers swinging · ${branchOn.own} different swings · branch ${
    branchOn.branch ? 'rocking' : 'still'
  }`,
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
