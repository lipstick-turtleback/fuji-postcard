#!/usr/bin/env node
/* The controls have to be on screen, not somewhere below it.

   The page is a card on a wall, and the wall scrolls. That is fine for a
   caption and a colophon. It is not fine for the buttons: measured on a
   1180x900 laptop window the console sat 101 px below the fold and on a
   1440x700 one 144 px below, so every control was off screen while the
   card was in view. Nothing in the page said so - it just looked like a
   page that needed scrolling.

   This drives a real headless Chrome over CDP at the window sizes people
   actually have, and fails if the card overflows, the page scrolls
   sideways, or any control is not fully inside the viewport.

     node scripts/test-layout.mjs

   It needs Chrome. If Chrome is not there the test says so and passes -
   a missing browser is not a broken page, and this must not turn a
   machine without Chrome into a red build. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9377;
const PAGE = new URL('../public/index.html', import.meta.url).href;

// width, height, label. The first four are ordinary laptop and desktop
// windows; the last two are a phone and a phone turned sideways.
const VIEWPORTS = [
  [1440, 1150, 'desktop'],
  [1440, 900, 'laptop, short'],
  [1366, 768, 'the smallest common laptop'],
  [1180, 900, 'laptop window'],
  [900, 1200, 'portrait'],
  [500, 900, 'narrow'],
  [360, 760, 'phone'],
];

let chrome;
try {
  chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/fuji-layout-test',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank',
  ]);
  chrome.on('error', () => {});
} catch {
  console.log(`test-layout: no Chrome at ${CHROME} - skipped`);
  process.exit(0);
}

let target = null;
for (let i = 0; i < 120 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    /* not up yet */
  }
}
if (!target) {
  chrome.kill('SIGKILL');
  console.log('test-layout: Chrome did not come up - skipped');
  process.exit(0);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});
let seq = 0;
const waiting = new Map();
const exceptions = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Runtime.exceptionThrown')
    exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.text);
  const done = waiting.get(msg.id);
  if (done) {
    waiting.delete(msg.id);
    done(msg);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    waiting.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: PAGE });
await sleep(1500);

const probe = `(() => {
  const inView = (el) => {
    const b = el.getBoundingClientRect();
    return b.top >= -1 && b.bottom <= innerHeight + 1 && b.left >= -1 && b.right <= innerWidth + 1;
  };
  const card = document.querySelector('.card').getBoundingClientRect();
  const controls = [...document.querySelectorAll('.console button, .console input')];
  const off = controls.filter((c) => !inView(c)).map((c) => c.id || c.className);
  return JSON.stringify({
    cardFits: inView(document.querySelector('.card')),
    aspect: +(card.width / card.height).toFixed(3),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    offscreen: off,
  });
})()`;

const problems = [];
const report = [];
for (const [w, h, label] of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: false,
  });
  exceptions.length = 0;
  await send('Page.navigate', { url: PAGE });
  await sleep(1200);
  const { result } = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
  const r = JSON.parse(result.value);
  const at = `${w}x${h}`;
  if (!r.cardFits) problems.push(`${at} (${label}): the card is not fully in view`);
  if (r.aspect < 1.497 || r.aspect > 1.503)
    problems.push(`${at} (${label}): the card is ${r.aspect}:1, it must stay 3:2`);
  if (r.overflowX) problems.push(`${at} (${label}): the page scrolls sideways`);
  if (r.offscreen.length) problems.push(`${at} (${label}): off screen - ${r.offscreen.join(', ')}`);
  if (exceptions.length) problems.push(`${at} (${label}): ${exceptions.length} page exception(s)`);
  report.push(`${at} ${r.offscreen.length ? 'OFF' : 'ok'}`);
}

await send('Emulation.clearDeviceMetricsOverride');
ws.close();
chrome.kill('SIGKILL');

if (problems.length) {
  console.error(`test-layout: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`test-layout: ${VIEWPORTS.length} viewports · ${report.join(' · ')} — no problems`);
