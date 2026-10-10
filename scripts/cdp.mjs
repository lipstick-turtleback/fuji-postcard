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

/**
 * Launch headless Chrome and attach to its first page target.
 *
 * Resolves to null when Chrome is not there or does not come up. Callers are
 * expected to skip rather than fail: a machine without Chrome is not a machine
 * with a broken page, and a visual test must not turn one into a red build.
 */
export async function openPage({ port, userDataDir, args = [] }) {
  let chrome;
  try {
    chrome = spawn(CHROME, [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu',
      ...args,
      'about:blank',
    ]);
    chrome.on('error', () => {});
  } catch {
    return null;
  }

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

  /** Run an expression in the page and get its value back, not a remote handle. */
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  };

  return {
    send,
    evaluate,
    exceptions,
    chromePath: CHROME,
    close: () => {
      ws.close();
      chrome.kill('SIGKILL');
    },
  };
}
