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
still.close();
finish();
