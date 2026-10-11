#!/usr/bin/env node
/* The page operated without a pointer.

   Every control on this page has been driven by a real key for the shortcuts —
   F, S, M — and by a mouse click for the buttons. Nobody had asked the question
   a person with no mouse asks: can I reach the controls at all, can I tell
   which one I am on, and does the thing under my fingers do what the mouse
   would have done.

   Those are three different failures and two of them are invisible. A control
   that cannot be reached is invisible in the first degree; a control that can
   be reached but shows no focus ring is worse, because the page looks fine and
   the person is typing into a void; a control that takes focus and then ignores
   Enter is the one a keyboard user meets last and trusts least.

   So the page is driven with Tab, Enter, Space and the arrow keys — real
   Input.dispatchKeyEvent events, which is also what puts the browser in
   keyboard modality and lets :focus-visible mean what it says — and the answers
   are read back from the page: which element has focus, what its focus ring is
   drawn with, what the card's angle is, what the slider's value is.

     node scripts/test-keys.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { key, openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-keys');

const page = await openPage({ port: 9394, userDataDir: '/tmp/fuji-keys' });
if (!page) skipped('test-keys');
const { send, evaluate, exceptions } = page;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1441,
  height: 1150,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await sleep(1800);

/* The pointer goes over the card first, and not because the keyboard test
   needs a pointer. Headless Chrome stops handing frames to a page that has
   nothing to paint: the card's idle sway is what keeps the compositor
   producing them, and it only starts when the pointer has moved. Without this
   the frame loop is dead before the first Tab and every animation below reads
   as frozen. It is a property of the harness, and the page in a real browser
   is never in that state. */
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1120, y: 480 });
await sleep(700);

const focused = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const ring =
    cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1 ? cs.outlineColor : cs.boxShadow;
  return {
    id: el.id || el.tagName.toLowerCase(),
    ring,
    visible: ring !== 'none' && ring !== '' && parseFloat(cs.opacity) > 0.1,
  };
})()`;

const seen = [];
for (let i = 0; i < 7; i++) {
  await key(send, 'tab');
  await sleep(120);
  const f = await evaluate(focused);
  if (f) seen.push(f);
}

const order = seen.map((f) => f.id).join(' ');
const WANT = ['flip', 'dl', 'enhanceBtn', 'play', 'vol'];
ok(
  'every control is reachable by Tab, in the order it is on the page',
  WANT.every((id) => seen.some((f) => f.id === id)) &&
    WANT.every(
      (id, i) =>
        seen.findIndex((f) => f.id === id) <
        (i + 1 < WANT.length ? seen.findIndex((f) => f.id === WANT[i + 1]) : Infinity),
    ),
  order,
);
ok(
  'nothing that is not a control takes focus',
  seen.every((f) => WANT.includes(f.id)),
  order,
);
ok(
  'and every one of them shows where the focus is',
  seen.filter((f) => WANT.includes(f.id)).every((f) => f.visible),
  seen.map((f) => `${f.id}:${f.ring.slice(0, 22)}`).join(' '),
);

const angle = async () => {
  const t = await evaluate(`document.querySelector('.card').style.transform`);
  const m = /rotateY\((-?[\d.]+)deg\)/.exec(t);
  return m ? Number(m[1]) : NaN;
};

// Enter on the flip button.
await evaluate(`document.getElementById('flip').focus()`);
const before = await angle();
await key(send, 'enter');
await sleep(1300);
const afterEnter = await angle();
// The card is already tilted a few degrees by the pointer, so the thing that
// matters is the turn, not the absolute angle.
const turned = (a, b) => Math.abs(((((b - a) % 360) + 360) % 360) - 180) < 8;
ok(
  'Enter does what a click would do',
  turned(before, afterEnter),
  `rotateY ${before} -> ${afterEnter}`,
);

// Space, on the same button, turns it back.
await key(send, 'space');
await sleep(1300);
const afterSpace = await angle();
ok('and Space does too', turned(afterEnter, afterSpace), `rotateY ${afterEnter} -> ${afterSpace}`);

// The slider, with the arrow keys.
await evaluate(`document.getElementById('vol').focus()`);
const v0 = await evaluate(`document.getElementById('vol').value`);
for (let i = 0; i < 5; i++) await key(send, 'arrowright');
await sleep(300);
const v1 = await evaluate(`document.getElementById('vol').value`);
const painted = await evaluate(
  `getComputedStyle(document.getElementById('vol')).getPropertyValue('--v').trim()`,
);
ok(
  'the slider answers the arrow keys',
  Number(v1) > Number(v0),
  `${v0} -> ${v1}${painted ? `, painted ${painted}` : ''}`,
);

// The shortcuts are not taken away by having focus in the console.
await key(send, 'f');
await sleep(1300);
const withFocus = await angle();
ok(
  'the shortcuts still work with focus inside the controls',
  Math.abs((((withFocus % 360) + 360) % 360) - 180) < 8,
  `rotateY ${withFocus} with the slider focused`,
);

ok('no page exceptions', exceptions.length === 0, exceptions.join(' | '));

page.close();
finish();
