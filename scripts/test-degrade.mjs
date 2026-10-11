#!/usr/bin/env node
/* The ways this page is asked to work without something.

   Three of the things the page reaches for are not simply there in every
   browser, and each has a fallback written beside it: Web Audio, which some
   browsers do not have at all, where the sound block hides rather than leaving
   a Play button that does nothing; localStorage, which is present but throws
   the moment it is touched in private mode, with cookies blocked, or in a
   sandboxed frame, where the Enhance choice is read and written inside
   try/catch; and ResizeObserver, where a plain resize listener stands in.

   Every one of those fallbacks is a piece of code that never runs on the
   machine it was written on. That is the whole problem with them: they are the
   tier most likely to be wrong and the only tier nobody visits, so the feature
   is taken away here before the page's own script runs, and the page is asked
   whether it still does what it says. A Play button that does nothing, or a
   card that stops turning over because line 54 threw, is a mark that lies.

     node scripts/test-degrade.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-degrade');

const open = async (port, userDataDir, init) => {
  const s = await openPage({ port, userDataDir });
  if (!s) return null;
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  if (init) await s.send('Page.addScriptToEvaluateOnNewDocument', { source: init });
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: 1441,
    height: 1150,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await s.send('Page.navigate', { url: PAGE });
  await sleep(1800);
  return s;
};

const angle = async (s) => {
  const t = await s.evaluate(`document.querySelector('.card').style.transform`);
  const m = /rotateY\((-?[\d.]+)deg\)/.exec(t);
  return m ? Number(m[1]) : NaN;
};

/* 1. No Web Audio. */
{
  const s = await open(
    9396,
    '/tmp/fuji-deg-audio',
    `
    delete window.AudioContext;
    delete window.webkitAudioContext;`,
  );
  if (!s) skipped('test-degrade');
  const { evaluate, exceptions, consoleErrors, close } = s;

  const hidden = await evaluate(`document.getElementById('sound').getClientRects().length === 0`);
  ok(
    'without Web Audio the sound block is gone, not a button that does nothing',
    hidden,
    `#sound client rects: ${await evaluate(`document.getElementById('sound').getClientRects().length`)}`,
  );

  await evaluate(`window.__dl = []; const c = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download); return c.apply(this, arguments); };`);
  const before = await angle(s);
  await evaluate(`document.getElementById('flip').click()`);
  await sleep(1400);
  const after = await angle(s);
  await evaluate(`document.getElementById('enhanceBtn').click()`);
  await sleep(400);
  const enhance = await evaluate(`document.documentElement.dataset.enhance`);
  await evaluate(`document.getElementById('dl').click()`);
  await sleep(400);
  const dl = await evaluate(`window.__dl.join(',')`);
  ok(
    'and the rest of the page is untouched by the missing audio',
    Math.abs(((((after - before) % 360) + 360) % 360) - 180) < 8 &&
      enhance === 'on' &&
      // the card was turned over above, and the plate that comes out is the
      // face that is showing — that is the claim, not the filename
      dl === 'fuji-postcard-back.svg',
    `turn ${before} -> ${after} · enhance ${enhance} · saved ${dl}`,
  );
  ok(
    'no exception was thrown at a browser that has no AudioContext',
    exceptions.length === 0 && consoleErrors.length === 0,
    `${exceptions.join(' | ')} ${consoleErrors.slice(0, 2).join(' | ')}`,
  );
  close();
}

/* 2. Storage that throws on touch — private mode, cookies blocked, a sandboxed
   frame. Both the read and the write are inside try/catch; a fallback that is
   only half written throws the moment somebody clicks. */
{
  const s = await open(
    9397,
    '/tmp/fuji-deg-store',
    `
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('storage is blocked', 'SecurityError');
      },
    });`,
  );
  const { evaluate, exceptions, consoleErrors, close } = s;
  /* The picture is not the thing to ask about here. It is in the markup, so it
     is drawn whether or not a single line of script ran, and a check on it
     measures the layout twice — the lesson test-nojs already learned. What this
     tier can lose is the script: the guarded read is on line 54, well after the
     `.js` class is set on the first line, so even that class says nothing about
     how far the file got. The flip does. */
  await evaluate(`document.getElementById('flip').click()`);
  await sleep(1400);
  const turned = await angle(s);
  await evaluate(`document.getElementById('enhanceBtn').click()`);
  await sleep(400);
  await evaluate(`document.getElementById('enhanceBtn').click()`);
  await sleep(400);
  const enhance = await evaluate(`document.documentElement.dataset.enhance`);
  ok(
    'a page whose storage throws still turns over',
    Math.abs((((turned % 360) + 360) % 360) - 180) < 8,
    `card transform after the flip: ${turned}deg`,
  );
  ok(
    'and Enhance can be clicked twice without anything being thrown',
    enhance === 'off' && exceptions.length === 0 && consoleErrors.length === 0,
    `enhance ${enhance} · ${exceptions.length} exception(s)` +
      `${exceptions.length ? `: ${exceptions[0]}` : ''}` +
      `${consoleErrors.length ? ` · ${consoleErrors[0]}` : ''}`,
  );
  close();
}

/* The third fallback — a resize listener standing in for ResizeObserver — is
   not checked, and the reason is worth keeping. The card's measured width and
   height feed exactly one computation, the length of the sheen band across the
   plate, and that computation is a ratio: double the card and the band lands in
   the same place. The card's aspect ratio is fixed at 3:2 by the stylesheet, so
   there is no window size the page can be taken to where a stale measurement
   changes anything a check could see. A check that cannot fail is worse than no
   check, so this one is absent on purpose rather than present and hollow. */

finish();
