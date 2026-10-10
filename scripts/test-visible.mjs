#!/usr/bin/env node
/* Every mark that is placed is a mark that is seen.

   A rule whose class no longer exists is the same mistake as a plant placed
   behind the mountain: the work is in the file, the browser draws it, and
   nothing in the picture changes. The stylesheet version is caught — test-css
   asks whether every selector matches something on the page. The data version
   was not, and the data is the part that grows: a number edited in a
   .data.mjs file can move a reed under the lake, inside the torii, or behind
   the slope of the mountain, and the page looks exactly as it should.

   So each placed mark is asked the only question that cannot be argued with.
   The page is rendered. The mark is hidden. The patch of pixels where the mark
   lives is rendered again. If the two patches are the same, the mark was doing
   nothing.

   The question is asked at the middle of every animation's own period, with all
   of them paused there. Asked at the instant the page opens it has the wrong
   answer: a ring that crosses the lake once every 97 seconds is at opacity zero
   when the page is drawn, and so is every petal that has not started to fall.
   Asked at the middle of the period, each mark is where it spends its time and
   the answer means something. Pausing first is what makes the two renders
   comparable — a mark that has moved between them differs by everything except
   itself.

   A mark that fails that measurement is asked again at fifty points across its
   own period, because some marks are not there for most of the time they take:
   the rings on the lake hold still for the greater part of 97 seconds and
   spread twice inside it, four or five seconds at a time. Sampling a period at
   tenths steps straight over an event that short, and calls the mark dead. A
   mark visible at any of the fifty is a mark that exists; one invisible at all
   of them, at the middle and at every second hundredth, is work nobody sees.

   This is slower than reading the data, and it is the only method that knows
   about clipping, paint order, opacity, and the difference between a dark reed
   against a dark shore and a dark reed against the snowcap. Two screenshots per
   mark over the mark's own box, at native scale; the tolerance is 4/255 on a
   pixel and 0.02% of the box, which is the distance between a mark that is
   there and a mark that is not.

     node scripts/test-visible.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';
import { comparePng, decodePng } from './png.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-visible');

const page = await openPage({
  port: 9392,
  userDataDir: '/tmp/fuji-visible',
  // No --force-prefers-reduced-motion: the marks that only exist in time are
  // exactly the ones this test would otherwise call dead. They are paused
  // instead, which freezes the picture without emptying it.
});
if (!page) skipped('test-visible');
await page.send('Page.enable');
await page.send('Runtime.enable');
await page.send('Emulation.setDeviceMetricsOverride', {
  width: 1441,
  height: 1150,
  deviceScaleFactor: 1,
  mobile: false,
});
await page.send('Page.navigate', { url: PAGE });
await sleep(1600);

/* Freeze the page at the middle of everything. */
const seek = await page.evaluate(`(() => {
  let n = 0;
  for (const a of document.getAnimations()) {
    // getTiming().duration, not getComputedTiming().activeDuration: every
    // animation on this page runs forever, and the active duration of an
    // infinite animation is Infinity, which is not a time to put anything at.
    const dur = a.effect && a.effect.getTiming().duration;
    if (!Number.isFinite(dur) || dur <= 0) continue;
    try {
      a.currentTime = dur * 0.5;
      a.pause();
      n++;
    } catch {
      /* an animation that refuses to be seeked is not a mark's fault */
    }
  }
  return n;
})()`);
await sleep(200);

const faces = JSON.parse(
  await page.evaluate(`(() => {
    const out = [];
    for (const face of document.querySelectorAll('.face')) {
      const svg = face.querySelector('svg');
      if (!svg) continue;
      out.push({
        sel: '.' + [...face.classList].join('.') + ' svg use',
        marks: [...svg.querySelectorAll('use')].map((el, i) => ({ i, h: el.getAttribute('href') })),
      });
    }
    return JSON.stringify(out);
  })()`),
);

const invisible = [];
const retries = [];
let measured = 0;

/* Hide the mark, shoot the same patch, put it back. null when the mark was
   there — the number is how much of the box it accounted for. */
const compare = async (i, clip) => {
  const shot = async () =>
    decodePng(
      Buffer.from(
        (await page.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } }))
          .data,
        'base64',
      ),
    );
  const withMark = await shot();
  await page.evaluate(`${at0(i)}.style.visibility = 'hidden'`);
  const without = await shot();
  await page.evaluate(`${at0(i)}.style.visibility = ''`);
  const d = comparePng(withMark, without, 4);
  return d.pctOver < 0.02 ? null : d.pctOver;
};
let at0 = () => 'document';
for (const face of faces) {
  const at = (i) => `document.querySelectorAll(${JSON.stringify(face.sel)})[${i}]`;
  at0 = at;
  for (const mk of face.marks) {
    // The box is read after the freeze, from the mark itself: a petal at the
    // middle of its fall is not where it was when the page opened.
    const clip = JSON.parse(
      await page.evaluate(`(() => {
        const b = ${at(mk.i)}.getBoundingClientRect();
        return JSON.stringify({
          x: Math.floor(b.x),
          y: Math.floor(b.y),
          width: Math.ceil(b.width),
          height: Math.ceil(b.height),
        });
      })()`),
    );
    // A mark with no area cannot be measured this way, and one that starts off
    // the rendered page is not on the page: test-plate already asks whether
    // anything placed has crossed the edge of the plate.
    if (clip.width < 2 || clip.height < 2 || clip.x < 0 || clip.y < 0) continue;
    measured++;
    const seen = await compare(mk.i, clip);
    if (seen !== null) continue;
    // Not there at the middle of the period. Ask again across it.
    let found = null;
    // Two percent of the period, which is finer than the shortest thing the
    // page does: a ring that spreads across the lake takes four or five seconds
    // out of ninety-seven, and a tenth of a period would step straight over it.
    for (let k = 1; k < 50; k++) {
      const f = k / 50;
      await page.evaluate(`(() => {
        for (const a of document.getAnimations()) {
          const d = a.effect && a.effect.getTiming().duration;
          if (!Number.isFinite(d) || d <= 0) continue;
          try {
            a.currentTime = d * ${f};
          } catch {
            /* not this animation's fault */
          }
        }
        return 1;
      })()`);
      const again = JSON.parse(
        await page.evaluate(`(() => {
          const b = ${at(mk.i)}.getBoundingClientRect();
          return JSON.stringify({
            x: Math.floor(b.x),
            y: Math.floor(b.y),
            width: Math.ceil(b.width),
            height: Math.ceil(b.height),
          });
        })()`),
      );
      if (await compare(mk.i, again)) {
        found = `${Math.round(f * 100)}% of its period`;
        break;
      }
    }
    if (found) retries.push(`${mk.h} is only there for part of its period (${found})`);
    else
      invisible.push(
        `${mk.h} at ${clip.x},${clip.y} (${clip.width}x${clip.height}) — hiding it changed nothing at the middle of its period or at any of fifty points across it`,
      );
  }
}

ok(
  'the page was frozen at the middle of every period',
  seek > 20,
  `${seek} animations seeked and paused`,
);
ok(
  'every placed mark changes the pixels it sits on',
  invisible.length === 0,
  `${measured} marks measured${retries.length ? `, ${retries.length} only part of the time` : ''}${
    invisible.length
      ? `, ${invisible.length} invisible: ${invisible.slice(0, 3).join('; ')}`
      : ', none invisible'
  }`,
);
ok('no page exceptions', page.exceptions.length === 0, `${page.exceptions.length} exception(s)`);

page.close();
finish();
