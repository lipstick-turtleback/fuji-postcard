#!/usr/bin/env node
/* What comes out of a printer.

   The page has never been asked to be paper. Everything else in this project
   checks the screen and the exported .svg; a person who presses Cmd-P gets a
   third artefact that no test had ever looked at, and what they got was the
   gallery wall, the studio's name, the title, the plinth label, five buttons
   and a slider printed around a small picture, running over two sheets.

   So the print layer exists, and this checks it the way the other checks work:
   by asking the page in print media what is actually visible, and by asking
   Chrome to produce the paper and reading the bytes back. The sheet is the
   card's own shape — 148 by 100 mm, the 3:2 the artwork was drawn in — the
   screen furniture is gone, the card lies flat instead of keeping the pointer's
   tilt, and the face that prints is the face you were looking at, which the page
   states in `data-print-face` on `beforeprint` because a stylesheet cannot read
   a transform the frame loop writes inline every frame.

     node scripts/test-print.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-print');

const page = await openPage({ port: 9395, userDataDir: '/tmp/fuji-print-test' });
if (!page) skipped('test-print');
const { send, evaluate, exceptions, consoleErrors, close } = page;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1122,
  height: 794,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await sleep(1800);
// the pointer first: headless Chrome stops handing frames to a page with
// nothing to paint, and the tilt the print layer has to overrule only exists
// once the frame loop is running
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900, y: 400 });
await sleep(600);
const tilted = await evaluate(`document.querySelector('.card').style.transform`);

await send('Emulation.setEmulatedMedia', { media: 'print' });
await sleep(500);

const gone = await evaluate(`(() => {
  const hidden = (sel) => {
    const el = document.querySelector(sel);
    return !el || el.getClientRects().length === 0;
  };
  return ['.bg', '.topbar', '.masthead', '.plinth', '.footer', '.console', '.foil']
    .filter((s) => !hidden(s))
    .join(' ');
})()`);
ok('the screen furniture is not on the paper', gone === '', gone || 'all of it hidden');

const card = JSON.parse(
  await evaluate(
    `JSON.stringify((() => { const r = document.querySelector('.card').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, t: getComputedStyle(document.querySelector('.card')).transform }; })())`,
  ),
);
ok(
  'the card lies flat on the sheet, tilt and all',
  card.t === 'none' && /rotate|matrix3d/.test(tilted),
  `inline ${tilted} · computed ${card.t}`,
);
ok(
  'and it keeps the picture’s shape',
  Math.abs(card.w / card.h - 1.5) < 0.02 && card.w > 400,
  `${card.w.toFixed(0)} × ${card.h.toFixed(0)} px, ratio ${(card.w / card.h).toFixed(3)}`,
);

const pdf = await send('Page.printToPDF', {
  preferCSSPageSize: true,
  printBackground: true,
  transferMode: 'ReturnAsBase64',
});
const bytes = Buffer.from(pdf.data, 'base64');
// the objects are not in the header: a PDF's page tree sits wherever the writer
// put it, so the whole file is searched rather than the first few kilobytes
const pdfText = bytes.toString('latin1');
const pages = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length;
const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(pdfText);
// a PostScript point is 1/72 of an inch
const mm = box ? [Number(box[1]) * 0.352778, Number(box[2]) * 0.352778] : [0, 0];
ok(
  'the sheet is a postcard, and there is one of it',
  pages === 1 && Math.abs(mm[0] - 148) < 1 && Math.abs(mm[1] - 100) < 1,
  `${pages} page(s), MediaBox ${mm[0].toFixed(1)} × ${mm[1].toFixed(1)} mm`,
);

// turn the card over and ask again: the paper should follow the picture
await evaluate(`document.getElementById('flip').click()`);
await sleep(1500);
const pdf2 = await send('Page.printToPDF', {
  preferCSSPageSize: true,
  printBackground: true,
  transferMode: 'ReturnAsBase64',
});
const face = await evaluate(`document.documentElement.dataset.printFace || 'unset'`);
const shown = await evaluate(`(() => {
  const vis = (s) => document.querySelector(s).getClientRects().length > 0;
  return \`front \${vis('.face.front')} back \${vis('.face.back')}\`;
})()`);
ok(
  'the face you were looking at is the face that prints',
  face === 'back' && shown === 'front false back true' && pdf2.data.length > 1000,
  `data-print-face ${face} · ${shown} · ${pdf2.data.length} bytes`,
);

ok('no page exceptions in the print pass', exceptions.length === 0, exceptions.join(' | '));
ok(
  'no browser errors in the print pass',
  consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(' | '),
);

close();
finish();
