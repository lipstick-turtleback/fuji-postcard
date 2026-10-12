#!/usr/bin/env node
/* Photograph one thing on the page, big.

   Every check here answers a question in numbers, which is right for the
   questions that have numbers. It is the wrong tool for "is the heron's neck
   the right shape": that is a question about a picture, and it can only be
   answered by looking at one. The rule this project keeps is not "never look",
   it is "never look at one screenshot at page scale and hope" — at 940 css px
   the whole card is wide, the heron in it is 40 of them, and the difference
   between a good neck and a wrong one is a unit or two.

   So: the page, held still — `--force-prefers-reduced-motion`, because two
   renders that agree pixel for pixel are the only renders worth comparing —
   and one element photographed at a chosen zoom. The crop is the element's own
   box plus a margin, because a mark's neighbours are what give it its meaning:
   a reed alone is a stroke, a reed against the shore line is a place.

   A region can be asked for directly, in those units, with `--box=x,y,w,h`.
   That is what makes a before-and-after honest: a crop taken from an element's
   own box moves when the element is redrawn — the snow cap grew ten units
   taller the day its snowline was, and the two crops could not be compared —
   while a crop taken from a region of the plate is the same rectangle every
   time, whatever the drawing under it does to itself.

     node scripts/look.mjs                        the whole front, at 2×
     node scripts/look.mjs '#heron'               one mark, at 4×
     node scripts/look.mjs '.reed' 8              at 8×
     node scripts/look.mjs --back                 the other face
     node scripts/look.mjs '#heron' 4 heron.png   where to write it
     node scripts/look.mjs --box=330,120,240,150 5 a region, at 5×

   Needs Chrome; says so and exits 2 when it is not there. */
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';

const argv = process.argv.slice(2);
const back = argv.includes('--back');
const boxFlag = argv.find((a) => a.startsWith('--box='));
const rest = argv.filter((a) => !a.startsWith('--'));
let selector;
let scale;
let out;
if (boxFlag) {
  scale = Number(rest[0] || 4);
  out = rest[1] || '/tmp/fuji-look.png';
} else {
  selector = rest[0] || (back ? '.face.back' : '.face.front');
  scale = Number(rest[1] || (selector === '.face.front' || selector === '.face.back' ? 2 : 4));
  out = rest[2] || '/tmp/fuji-look.png';
}

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const page = await openPage({
  port: 9398,
  userDataDir: '/tmp/fuji-look',
  args: ['--force-prefers-reduced-motion'],
});
if (!page) {
  console.error('look: no Chrome — set $CHROME, or skip');
  process.exit(2);
}
const { send, evaluate, exceptions, consoleErrors, close } = page;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1500,
  height: 1300,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await sleep(1800);
if (back) {
  await evaluate(`document.getElementById('flip').click()`);
  await sleep(1600);
}

const box = boxFlag
  ? await evaluate(`(() => {
     const [x, y, w, h] = ${JSON.stringify(boxFlag.slice(6).split(',').map(Number))};
     const face = document.querySelector(${JSON.stringify(back ? '.face.back' : '.face.front')});
     const svg = face.querySelector('svg');
     const fr = svg.getBoundingClientRect();
     const vb = svg.viewBox.baseVal;
     const k = fr.width / vb.width;
     return JSON.stringify({
       x: fr.x + scrollX + x * k,
       y: fr.y + scrollY + y * k,
       w: w * k,
       h: h * k,
       units: vb.width / fr.width,
       face: face.className,
     });
   })()`)
  : await evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  const face = el.closest('.face');
  const svg = face && face.querySelector('svg');
  const fr = svg && svg.getBoundingClientRect();
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  return JSON.stringify({
    x: r.x + scrollX,
    y: r.y + scrollY,
    w: r.width,
    h: r.height,
    doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    units: fr && vb && fr.width ? vb.width / fr.width : null,
    face: face ? face.className : '',
  });
})()`);
if (!box) {
  console.error(`look: nothing on the page matches ${selector}`);
  close();
  process.exit(2);
}
const b = JSON.parse(box);

// a mark's neighbours are part of it, so the crop is never tighter than the
// mark itself: a third of its own size, and never less than 24 px. A region
// asked for by number is already the crop, and gets no margin: the whole point
// of naming one is that the next crop of it lands on the same rectangle.
const m = boxFlag ? 0 : Math.max(24, Math.min(b.w, b.h) * 0.34);
let x = b.x - m;
let y = b.y - m;
let w = b.w + m * 2;
let h = b.h + m * 2;
// The margin exists because a mark's neighbours are part of it. It is not
// permission to photograph a wall that is not on the page. The room's layers
// are position:fixed, so a clip that reaches past the document shows the body's
// flat background under them, and the picture comes back with a seam across the
// room that no person ever sees — which is exactly the kind of thing this tool
// exists to make somebody go and look at.
let clamped = '';
// An element with no box of its own — a <use> pointing at a symbol, a mark
// inside <defs> — has a rect at 0,0 and nothing to pull back. Leave it alone.
if (!boxFlag && b.w > 0 && b.h > 0 && Array.isArray(b.doc)) {
  const [dw, dh] = b.doc;
  const before = [x, y, w, h];
  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x + w > dw) w = dw - x;
  if (y + h > dh) h = dh - y;
  if (String(before) !== String([x, y, w, h])) clamped = ' (clamped to the page)';
}
const clip = { x, y, width: w, height: h, scale };
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  clip,
});
writeFileSync(out, Buffer.from(shot.data, 'base64'));

const u = b.units ? ` = ${Math.round(b.w * b.units)} × ${Math.round(b.h * b.units)} u` : '';
const subject = boxFlag ? `region ${boxFlag.slice(6)}` : `${selector}${back ? ' (back)' : ''}`;
console.log(
  `look: ${subject} — ${Math.round(b.w)} × ${Math.round(b.h)} css px${u}, ` +
    `photographed at ${scale}× → ${out}` +
    (clamped
      ? ` (the crop was pulled back to the page: ${Math.round(w)} × ${Math.round(h)} css px)`
      : ''),
);
if (exceptions.length || consoleErrors.length)
  console.log(`look: ${exceptions.length} exception(s), ${consoleErrors.length} browser error(s)`);
close();
