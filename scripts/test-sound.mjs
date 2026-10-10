#!/usr/bin/env node
/* The soundtrack, on a page nobody has touched yet.

   This pass runs with autoplay allowed, which is the condition under which
   the page used to start the music by itself — a permissive policy, a test
   harness, a preview reload. The first thing it asserts is that the page no
   longer does that: nothing but the button and M can start the piece.

   Order still matters for the rest of it. The other bug was that a gesture on
   the play button was not treated as a gesture: the listeners that let the
   page start the music were only removed by a gesture somewhere else. The
   sequence that broke was the ordinary one — press Play, press Play again to
   stop it, then pick the card up — and the piece came back from bar 1 by
   itself. Any keypress earlier in the session hid it, which is why this gets
   its own browser and its own page.

   Nothing here trusts the button. Every claim is made about audio nodes the
   page created, because aria-pressed is an indicator and a scheduler writing
   another bar is a fact.

     node scripts/test-sound.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { key, openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-sound');

const sound = await openPage({
  port: 9387,
  userDataDir: '/tmp/fuji-sound',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
if (!sound) skipped('test-sound');
await sound.send('Page.enable');
await sound.send('Runtime.enable');
await sound.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__src = 0;
    for (const m of ['createOscillator', 'createBufferSource']) {
      const f = AudioContext.prototype[m];
      AudioContext.prototype[m] = function (...a) { window.__src++; return f.apply(this, a); };
    }
    // The drone is the only voice that rises out of silence, and the only
    // one that is ruined by being scheduled late: told to start rising at a
    // time already gone, it arrives two thirds swelled, which sounds like
    // the piece beginning. Count drones, and count anything told to start
    // behind the clock.
    window.__drones = 0;
    window.__past = [];
    const cg = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const g = cg.call(this);
      const ctx = this;
      let opened = null;
      const sv = g.gain.setValueAtTime.bind(g.gain);
      g.gain.setValueAtTime = (v, t) => {
        if (t < ctx.currentTime - 0.05) window.__past.push(+t.toFixed(2));
        opened = t;
        return sv(v, t);
      };
      const er = g.gain.exponentialRampToValueAtTime.bind(g.gain);
      g.gain.exponentialRampToValueAtTime = (v, t) => {
        // the drone is the only voice here that takes more than a second to
        // arrive; a pluck is up in eight milliseconds
        if (opened !== null) {
          if (t - opened > 1) window.__drones++;
          opened = null;
        }
        return er(v, t);
      };
      return g;
    };`,
});
await sound.send('Page.navigate', { url: PAGE });
await sleep(1800);
const play = () => sound.evaluate(`document.getElementById('play').getAttribute('aria-pressed')`);
const src = () => sound.evaluate(`window.__src`);
ok(
  'the page does not start the music itself',
  (await play()) === 'false' && (await src()) === 0,
  `aria-pressed ${await play()}, audio nodes ${await src()}`,
);
await sound.evaluate(`document.getElementById('play').click()`);
await sleep(900);
const on = await src();
ok('Play starts it', (await play()) === 'true' && on > 0, `audio nodes ${on}`);
await sound.evaluate(`document.getElementById('play').click()`);
await sleep(900);
ok('Play stops it', (await play()) === 'false', `audio nodes ${await src()}`);
const off = await src();
await sound.send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: 700,
  y: 500,
  button: 'left',
  clickCount: 1,
});
await sound.send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: 700,
  y: 500,
  button: 'left',
  clickCount: 1,
});
await sleep(1200);
await key(sound.send, 'f');
await sleep(1400);
const idle = await src();
ok(
  'handling the card does not start the music again',
  (await play()) === 'false' && idle === off,
  `audio nodes ${off} -> ${idle}`,
);
await key(sound.send, 'm');
await sleep(1000);
const withM = await src();
ok('M starts it', (await play()) === 'true' && withM > off, `audio nodes ${off} -> ${withM}`);
await key(sound.send, 'm');
await sleep(900);
ok('and M stops it', (await play()) === 'false');

/* Starve the page for five seconds with the music running — the same thing a
   background tab, a long collection or a wake from sleep does — and check
   what the scheduler does with the bars it missed. The notes guard themselves;
   the drone has to be anchored to the clock or it arrives mid-swell, out of
   nowhere. */
await key(sound.send, 'm');
await sleep(14000);
await sound.evaluate(`const t = Date.now(); while (Date.now() - t < 5000) {}`);
await sleep(7000);
const drones = await sound.evaluate(`window.__drones`);
const behind = await sound.evaluate(`window.__past.length`);
ok('a drone did fire in that window', drones > 0, `${drones} drone(s) started`);
ok(
  'nothing is told to start behind the clock, even when the page loses time',
  behind === 0,
  `${behind} event(s) scheduled in the past`,
);
ok(
  'no page exceptions in the soundtrack pass',
  sound.exceptions.length === 0,
  sound.exceptions.join(' | '),
);
ok(
  'no browser errors in the soundtrack pass',
  sound.consoleErrors.length === 0,
  sound.consoleErrors.slice(0, 3).join(' | '),
);
sound.close();
finish();
