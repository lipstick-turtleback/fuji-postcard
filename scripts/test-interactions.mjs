#!/usr/bin/env node
/* The page as everybody else sees it: pointer, shortcuts, downloads, Enhance.

   Rule 5 of the brief is that nothing may be broken to make something look
   better — flip, export, the keyboard shortcuts and the console all have to
   keep working. Until now the only thing that verified that was a human
   clicking around, which is exactly the kind of verification that quietly
   stops happening.

   A page can look completely fine with all of it dead: a ReferenceError
   during startup once took out tilt, flip, export and every shortcut while
   the artwork rendered perfectly. So this drives the real controls —
   Input.dispatchKeyEvent for the shortcuts, a real click for Enhance — and
   reads back what the page did, plus any exception the page threw.

   The download is caught by wrapping HTMLAnchorElement.prototype.click,
   because "S saved a file" is otherwise invisible to the harness.

     node scripts/test-interactions.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there.
   The other two questions — a page asked to hold still, and a page nobody
   has touched — are test-motion.mjs and test-sound.mjs. */
import { setTimeout as sleep } from 'node:timers/promises';
import { key, openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-interactions');

const angle = async (evaluate) => {
  const t = await evaluate(`document.querySelector('.card').style.transform`);
  const m = /rotateY\((-?[\d.]+)deg\)/.exec(t);
  return m ? Number(m[1]) : NaN;
};

const page = await openPage({ port: 9385, userDataDir: '/tmp/fuji-interactions' });
if (!page) skipped('test-interactions');
const { send, evaluate, exceptions, consoleErrors, close } = page;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1150,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await sleep(1800);

// catch downloads before anything can trigger one
await evaluate(`window.__dl = [];
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    window.__dl.push(this.download);
    return click.apply(this, arguments);
  };`);

const rails = await evaluate(`[
  document.querySelectorAll('#edgeGlint .rail').length,
  document.querySelectorAll('#edgeGlint .rail-v').length,
]`);
ok('the frame has its four rails', rails[0] === 2 && rails[1] === 2, JSON.stringify(rails));

const rayBefore = await evaluate(
  `document.querySelector('#edgeGlint .rail').getAttribute('stroke-dashoffset')`,
);
const tiltBefore = await angle(evaluate);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1120, y: 480 });
await sleep(700);
const rayAfter = await evaluate(
  `document.querySelector('#edgeGlint .rail').getAttribute('stroke-dashoffset')`,
);
const tiltAfter = await angle(evaluate);
ok(
  'the pointer walks the glint ray along the frame',
  rayBefore !== rayAfter,
  `${rayBefore} -> ${rayAfter}`,
);
ok(
  'the pointer tilts the card',
  Math.abs(tiltAfter - tiltBefore) > 1,
  `${tiltBefore} -> ${tiltAfter}`,
);

await key(send, 'f');
await sleep(1300);
const back = await angle(evaluate);
ok('F turns the card over', Math.abs((((back % 360) + 360) % 360) - 180) < 8, `rotateY ${back}`);
const said = await evaluate(`document.getElementById('status').textContent`);
ok('and says so', /back/.test(said), said);

await key(send, 's');
await sleep(400);
let dl = await evaluate(`window.__dl`);
ok('S saves the face that is showing', dl.join() === 'fuji-postcard-back.svg', JSON.stringify(dl));

await key(send, 'f');
await sleep(1300);
const front = await angle(evaluate);
ok(
  'F turns it back',
  Math.abs(((front % 360) + 360) % 360) < 8 || Math.abs((((front % 360) + 360) % 360) - 360) < 8,
  `rotateY ${front}`,
);
await key(send, 's');
await sleep(400);
dl = await evaluate(`window.__dl`);
ok(
  'and S saves that one',
  dl.join() === 'fuji-postcard-back.svg,fuji-postcard-front.svg',
  JSON.stringify(dl),
);

const pressed = () =>
  evaluate(`document.getElementById('enhanceBtn').getAttribute('aria-pressed')`);
const wasOn = await pressed();
await evaluate(`document.getElementById('enhanceBtn').click()`);
await sleep(300);
const nowOn = await pressed();
ok('Enhance toggles', wasOn !== nowOn, `${wasOn} -> ${nowOn}`);
const dataOn = await evaluate(`document.documentElement.dataset.enhance`);
ok('and the page knows which way', dataOn === (nowOn === 'true' ? 'on' : 'off'), dataOn);
await evaluate(`document.getElementById('enhanceBtn').click()`);
await sleep(300);

const volOk = await evaluate(`(() => {
  const v = document.getElementById('vol');
  v.value = 40;
  v.dispatchEvent(new Event('input', { bubbles: true }));
  return v.style.getPropertyValue('--fill');
})()`);
ok('the volume slider paints', volOk === '40%', volOk);

ok('no page exceptions', exceptions.length === 0, exceptions.join(' | '));
ok(
  'the browser raised no errors parsing the page',
  consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(' | '),
);
close();
finish();
