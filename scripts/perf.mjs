#!/usr/bin/env node
/* Measure what the page actually costs, in a real browser, in real time.

   Screenshots cannot tell you this and --virtual-time-budget lies about it:
   virtual time fast-forwards the clock, so frame intervals mean nothing.
   This drives headless Chrome over CDP with no dependencies at all (Node
   ships a WebSocket client), puts the pointer on the card so the lighting
   model is running, and samples requestAnimationFrame intervals.

     node scripts/perf.mjs [url] [seconds]

   What the numbers mean: 16.7 ms is one frame at 60 Hz. A mean above that
   is dropped frames; p95 is the stutter you can feel.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const url = process.argv[2] || `${new URL('../public/index.html', import.meta.url).href}?silent`;
const seconds = Number(process.argv[3] || 4);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/fuji-perf-profile',
    '--no-sandbox',
    '--mute-audio',
    ...(process.env.PERF_GPU ? [] : ['--disable-gpu']),
    '--disable-breakpad',
    '--noerrdialogs',
    '--hide-scrollbars',
    '--window-size=1440,1150',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const die = (message) => {
  chrome.kill('SIGKILL');
  console.error(`perf: ${message}`);
  process.exit(1);
};

// wait for the debugging endpoint to answer
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    /* not up yet */
  }
}
if (!target) die('Chrome never exposed a debugging endpoint');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', () => reject(new Error('websocket failed')));
});

let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  const hit = pending.get(msg.id);
  if (hit) {
    pending.delete(msg.id);
    hit(msg);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (msg) =>
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result),
    );
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
await send('Performance.enable');
await send('Runtime.enable');
await send('Page.navigate', { url });
await sleep(2500);

// put the pointer on the middle of the card: the lighting model only runs
// when something is moving, and that is the expensive case
const move = async (x, y) => {
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    modifiers: 0,
  });
};

const sample = async (label) => {
  const expression = `new Promise((resolve) => {
    const d = [];
    let prev = performance.now();
    let n = 0;
    const tick = (t) => {
      d.push(t - prev);
      prev = t;
      if (++n < ${Math.round(seconds * 60)}) requestAnimationFrame(tick);
      else {
        d.sort((a, b) => a - b);
        resolve({
          frames: n,
          mean: d.reduce((a, b) => a + b, 0) / d.length,
          median: d[Math.floor(d.length / 2)],
          p95: d[Math.floor(d.length * 0.95)],
          worst: d[d.length - 1],
          over33: d.filter((x) => x > 33).length,
        });
      }
    };
    requestAnimationFrame(tick);
  })`;
  const evaluated = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluated.exceptionDetails)
    die(`probe threw: ${evaluated.exceptionDetails.exception?.description}`);
  const r = evaluated.result?.value;
  if (!r) die(`probe returned no value: ${JSON.stringify(evaluated).slice(0, 300)}`);
  const fps = 1000 / r.mean;
  console.log(
    `${label.padEnd(22)} mean ${r.mean.toFixed(1)}ms  median ${r.median.toFixed(1)}ms  ` +
      `p95 ${r.p95.toFixed(1)}ms  worst ${r.worst.toFixed(0)}ms  ` +
      `>33ms ${r.over33}/${r.frames}  ≈${fps.toFixed(0)} fps`,
  );
  return r;
};

// sweep the pointer across the card while sampling, so the foil is re-lit
const sweep = setInterval(async () => {
  for (let i = 0; i < 6; i++) {
    await move(500 + i * 90, 560 + i * 40);
    await sleep(60);
  }
}, 600);

/* Both tiers. The page's cheap mode is the one that ships by default and the
   one the budget was written against, but the expensive mode is the one that
   can actually miss a frame, and a number nobody measures is a number nobody
   promised.

   The state is set, not toggled, and the label comes from what the page says
   it is. The first version of this clicked the button and called the result
   "on", which was wrong whenever the profile had already remembered an earlier
   run's choice: the labels came out swapped and the numbers made no sense. */
const setEnhance = async (want) => {
  const r = await send('Runtime.evaluate', {
    expression:
      '(() => {' +
      `  const on = document.documentElement.dataset.enhance === 'on';` +
      '  if (on !== ' +
      String(want) +
      ') document.getElementById("enhanceBtn").click();' +
      '  return document.documentElement.dataset.enhance;' +
      '})()',
    returnByValue: true,
  });
  await sleep(1200);
  return r.result?.value || '?';
};
await sample(`idle, enhance ${await setEnhance(false)}`);
await sample(`idle, enhance ${await setEnhance(true)}`);
clearInterval(sweep);

const quality = await send('Runtime.evaluate', {
  expression:
    '(() => {' +
    '  const label = document.getElementById("enhanceLabel");' +
    '  if (!label) return "NO ENHANCE BUTTON - the harness is out of date";' +
    '  return (document.documentElement.dataset.enhance || "?") + " | " + label.textContent;' +
    '})()',
  returnByValue: true,
});
console.log(`                     rendering: ${quality.result.value}`);

const metrics = await send('Performance.getMetrics');
const m = Object.fromEntries(metrics.metrics.map((x) => [x.name, x.value]));
console.log(
  `                     script ${m.ScriptDuration?.toFixed(2)}s  style ${m.RecalcStyleDuration?.toFixed(2)}s  ` +
    `layout ${m.LayoutDuration?.toFixed(2)}s  task ${m.TaskDuration?.toFixed(2)}s`,
);

ws.close();
chrome.kill('SIGKILL');
