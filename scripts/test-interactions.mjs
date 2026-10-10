#!/usr/bin/env node
/* Every promise the page makes, checked by making it.

   Rule 5 of the brief is that nothing may be broken to make something look
   better — flip, export, the soundtrack, the keyboard shortcuts and
   reduced-motion all have to keep working. Until now the only thing that
   verified that was a human clicking around, which is exactly the kind of
   verification that quietly stops happening.

   A page can look completely fine with all of it dead: a ReferenceError
   during startup once took out tilt, flip, export and every shortcut while
   the artwork rendered perfectly. So this drives the real controls —
   Input.dispatchKeyEvent for the shortcuts, a real click for Enhance — and
   reads back what the page did, plus any exception the page threw.

   Two things about the checks are worth knowing:

   The download is caught by wrapping HTMLAnchorElement.prototype.click,
   because "S saved a file" is otherwise invisible to the harness. And the
   soundtrack autostarts on the first gesture, so M is a toggle either way:
   what is asserted is that the state changes, not which way it lands.

   The second pass runs with --force-prefers-reduced-motion, where the card
   is required to stop asking for frames once it has come to rest. A page
   that promises stillness and burns a core rendering stillness is not
   keeping the promise.

     node scripts/test-interactions.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage } from './cdp.mjs';

const PAGE = new URL('../public/index.html', import.meta.url).href;
const results = [];
const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

const key = async (send, k) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: `Key${k.toUpperCase()}` });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: `Key${k.toUpperCase()}` });
};

const angle = async (evaluate) => {
  const t = await evaluate(`document.querySelector('.card').style.transform`);
  const m = /rotateY\((-?[\d.]+)deg\)/.exec(t);
  return m ? Number(m[1]) : NaN;
};

/* ---------- the page as everybody else sees it ---------- */
const page = await openPage({ port: 9385, userDataDir: '/tmp/fuji-interactions' });
if (!page) {
  console.log('test-interactions: no Chrome, or Chrome did not come up - skipped');
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

const audioBefore = await evaluate(`document.getElementById('play').getAttribute('aria-pressed')`);
await key(send, 'm');
await sleep(600);
const audioAfter = await evaluate(`document.getElementById('play').getAttribute('aria-pressed')`);
ok('M toggles the soundtrack', audioBefore !== audioAfter, `${audioBefore} -> ${audioAfter}`);

const volOk = await evaluate(`(() => {
  const v = document.getElementById('vol');
  v.value = 40;
  v.dispatchEvent(new Event('input', { bubbles: true }));
  return v.style.getPropertyValue('--fill');
})()`);
ok('the volume slider paints', volOk === '40%', volOk);

ok('no page exceptions', exceptions.length === 0, exceptions.join(' | '));
close();

/* ---------- the same page, asked to hold still ---------- */
const still = await openPage({
  port: 9386,
  userDataDir: '/tmp/fuji-interactions-rm',
  args: ['--force-prefers-reduced-motion'],
});
if (still) {
  await still.send('Page.enable');
  await still.send('Runtime.enable');
  // The page's own loop is the thing that is supposed to stop, and it is not
  // observable from outside — so instrument it: wrap requestAnimationFrame
  // before any script on the page runs and count what the page itself asks
  // for. wake() re-arms on every pointer event and the quality control calls
  // it during setup; frame() re-arms itself until the card settles. A settled
  // page under reduced motion should ask for almost nothing.
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
  still.close();
} else {
  ok('reduced-motion pass', false, 'Chrome did not come up');
}

const failed = results.filter((r) => !r.pass);
for (const r of results)
  console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
if (failed.length) {
  console.error(`test-interactions: ${failed.length} of ${results.length} checks failed`);
  process.exit(1);
}
console.log(`test-interactions: ${results.length} checks — no problems`);
