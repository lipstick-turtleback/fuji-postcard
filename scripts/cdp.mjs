#!/usr/bin/env node
/* A ~100-line DevTools protocol client, with no dependencies.

   Node ships a WebSocket client and fetch, so driving a real headless Chrome
   costs nothing. Two scripts need it — the layout test and the plate test —
   and they need the same three things: a Chrome that may not be installed, a
   page target, and a way to read page exceptions rather than only pixels.

   A page exception matters because a ReferenceError during startup once left
   this page looking completely fine while tilt, flip, export and every
   keyboard shortcut were dead. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** The page, asked to be quiet. Every harness that drives this page presses
 *  the buttons it finds, and one of those buttons starts four and a half
 *  minutes of music at whoever is sitting at the machine. `?silent` closes
 *  the last gain before the speakers — the graph, the clock and the meter
 *  all still run, so the thing under test is the real thing. */
export const silentPage = (href) => `${href}${href.includes('?') ? '&' : '?'}silent`;

/** A real key event, not a synthetic one: the page's shortcuts are checked by
 *  pressing keys the way a person does. */
// key, code, virtual key code, and the text a real keypress carries. Enter
// without its carriage return reaches the page as a keydown and never becomes
// the click a focused button would have produced — a fact about this dispatch
// path, not about the page.
const NAMED = {
  tab: ['Tab', 'Tab', 9, ''],
  enter: ['Enter', 'Enter', 13, '\r'],
  space: [' ', 'Space', 32, ' '],
  escape: ['Escape', 'Escape', 27, ''],
  arrowleft: ['ArrowLeft', 'ArrowLeft', 37, ''],
  arrowup: ['ArrowUp', 'ArrowUp', 38, ''],
  arrowright: ['ArrowRight', 'ArrowRight', 39, ''],
  arrowdown: ['ArrowDown', 'ArrowDown', 40, ''],
};

export const key = async (send, k) => {
  const named = NAMED[k.toLowerCase()];
  const ev = named
    ? {
        key: named[0],
        code: named[1],
        windowsVirtualKeyCode: named[2],
        nativeVirtualKeyCode: named[2],
        ...(named[3] ? { text: named[3] } : {}),
      }
    : { key: k, code: `Key${k.toUpperCase()}`, text: k };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...ev });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...ev });
};

/**
 * Launch headless Chrome and attach to its first page target. Runtime and Log
 * are enabled before anything navigates, so the caller gets two arrays: the
 * exceptions the page threw, and the errors the browser raised while parsing
 * it — which is where a malformed path shows up, and it shows up exactly once.
 *
 * Resolves to null when Chrome is not there or does not come up. Callers are
 * expected to skip rather than fail: a machine without Chrome is not a machine
 * with a broken page, and a visual test must not turn one into a red build.
 *
 * Throws when the port is already serving a Chrome. That is not this browser,
 * and attaching to it is the worst kind of pass: a test then runs against a
 * process left behind by an earlier, crashed run, with that run's flags. It
 * happened with 9389, where a browser started with
 * --force-prefers-reduced-motion answered a later test that had not asked for
 * the flag, and the page came back reporting prefers-reduced-motion as reduce
 * and zero animations, which read like a broken build.
 */
export async function openPage({ port, userDataDir, args = [] }) {
  try {
    const taken = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(600),
    });
    // A 200 is not enough to call the port a Chrome. Anything that answers HTTP
    // answers this — a test that serves its page on the port it also asked
    // Chrome to debug on gets "port N is already serving a Chrome" from its own
    // web server, which sends the reader off looking for a browser that does not
    // exist. The version endpoint is the thing that actually identifies one.
    if (taken.ok && /"Browser"\s*:/.test(await taken.text().catch(() => ''))) {
      throw new Error(
        `cdp: port ${port} is already serving a Chrome — another test's browser, or one a crashed run left behind. Kill it or take another port.`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('cdp:')) throw e;
    // nothing listening, which is the normal case
  }

  let chrome;
  try {
    chrome = spawn(CHROME, [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu',
      // The soundtrack tests press Play and press M, and a headless Chrome
      // on a Mac still has speakers. A test run that fills the room with a
      // koto line is a test run nobody will start. The tests read the audio
      // graph over CDP, never the air.
      '--mute-audio',
      ...args,
      'about:blank',
    ]);
    chrome.on('error', () => {});
  } catch {
    return null;
  }

  /* A test that dies with an uncaught error leaves its Chrome behind, and that
     is not a leak of memory but a leak of the port: the next run attaches to the
     leftover browser, gets its flags, and reports something that has nothing to
     do with the code being tested. Killing on exit is the part a caller cannot
     remember to do. */
  process.on('exit', () => {
    try {
      chrome.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  });

  let target = null;
  for (let i = 0; i < 120 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!target) {
    chrome.kill('SIGKILL');
    return null;
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  try {
    await new Promise((res, rej) => {
      ws.addEventListener('open', res);
      ws.addEventListener('error', rej);
    });
  } catch {
    chrome.kill('SIGKILL');
    return null;
  }

  let seq = 0;
  const waiting = new Map();
  const exceptions = [];
  const consoleErrors = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.exceptionThrown')
      exceptions.push(msg.params.exceptionDetails?.exception?.description || msg.params.text);
    if (msg.method === 'Log.entryAdded' && msg.params.entry?.level === 'error')
      consoleErrors.push(`${msg.params.entry.source || 'log'}: ${msg.params.entry.text}`);
    if (
      msg.method === 'Runtime.consoleAPICalled' &&
      (msg.params.type === 'error' || msg.params.type === 'warning')
    )
      consoleErrors.push(
        `${msg.params.type}: ${(msg.params.args || [])
          .map((a) => a.value ?? a.description ?? a.type)
          .join(' ')}`,
      );
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

  /** Run an expression in the page and get its value back, not a remote handle.
   *  An async expression is awaited: without that a promise comes back as an
   *  empty object, which reads like the page returned nothing. */
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  };

  // Enabled here, before anything navigates, because the errors worth catching
  // are the ones the browser raises while it parses the page: a malformed path
  // is a Log entry, not an exception, and it arrives exactly once.
  await send('Runtime.enable');
  await send('Log.enable');

  return {
    send,
    evaluate,
    exceptions,
    consoleErrors,
    chromePath: CHROME,
    close: () => {
      ws.close();
      chrome.kill('SIGKILL');
    },
  };
}
