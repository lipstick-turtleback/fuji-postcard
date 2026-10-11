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

   The size is reported in the artwork's own units as well as in css px, for
   the same reason test-plate measures in them: the picture is 900 × 600 of
   them, and a css px changes when the window does.

     node scripts/look.mjs                        the whole front, at 2×
     node scripts/look.mjs '#heron'               one mark, at 4×
     node scripts/look.mjs '.reed' 8              at 8×
     node scripts/look.mjs --back                 the other face
     node scripts/look.mjs '#heron' 4 heron.png   where to write it

   Needs Chrome; says so and exits 2 when it is not there. */
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';

const argv = process.argv.slice(2);
const back = argv.includes('--back');
const rest = argv.filter((a) => !a.startsWith('--'));
const selector = rest[0] || (back ? '.face.back' : '.face.front');
const scale = Number(rest[1] || (selector === '.face.front' || selector === '.face.back' ? 2 : 4));
const out = rest[2] || '/tmp/fuji-look.png';

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

const box = await evaluate(`(() => {
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
// mark itself: a third of its own size, and never less than 24 px
const m = Math.max(24, Math.min(b.w, b.h) * 0.34);
const clip = {
  x: b.x - m,
  y: b.y - m,
  width: b.w + m * 2,
  height: b.h + m * 2,
  scale,
};
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  clip,
});
writeFileSync(out, Buffer.from(shot.data, 'base64'));

const u = b.units ? ` = ${Math.round(b.w * b.units)} × ${Math.round(b.h * b.units)} u` : '';
console.log(
  `look: ${selector}${back ? ' (back)' : ''} — ${Math.round(b.w)} × ${Math.round(b.h)} css px${u}, ` +
    `photographed at ${scale}× → ${out}`,
);
if (exceptions.length || consoleErrors.length)
  console.log(`look: ${exceptions.length} exception(s), ${consoleErrors.length} browser error(s)`);
close();
