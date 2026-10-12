#!/usr/bin/env node
/* The suite, at once.

   Seventeen test scripts, and for years they ran one after another: 3 minutes
   54 seconds of wall clock against 35 seconds of actual work, because what the
   browser tests do is wait — for the page to settle, for an animation to be
   seeked, for a screenshot to come back. The machine sat idle between them.

   They can run together, up to a point. Every browser test owns a Chrome on its
   own port with its own profile directory, and none of them writes to the
   repository; the ports used to be reused between tests, which was invisible
   while the suite was serial and a collision the moment it was not, so the two
   that shared a port (test-build with test-layout on 9377, test-css with
   test-ink on 9389) were moved apart first.

   Two lanes is the measured answer on the machine this was written on: 206s of
   work in 116s of wall, with every test taking the time it takes alone. Four
   lanes is 660s of work in 403s of wall — the tests do not slow down a little,
   they slow down threefold, because each one is a Chrome with its own renderer
   threads and they are all asking for the same cores. The default is therefore
   two, and the flag exists because the right number is a property of the
   machine, not of the suite.

   Output is buffered per test and printed as a block when that test finishes,
   because interleaved lines from four Chromes are not a log. A passing test
   prints its summary line; a failing one prints everything it said.

     node scripts/run-tests.mjs [--jobs=N] [--only=name,...]

   Exit is non-zero if any test failed, and the summary says which. */
import { spawn } from 'node:child_process';

const tests = [
  'test-build',
  'test-score',
  'test-contrast',
  'test-layout',
  'test-cast',
  'test-visible',
  'test-plate',
  'test-ink',
  'test-export',
  'test-interactions',
  'test-keys',
  'test-motion',
  'test-css',
  'test-nojs',
  'test-degrade',
  'test-print',
  'test-sound',
];

const flag = (name, fallback) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
};

let list = tests;
const only = flag('only', null);
if (only) {
  const wanted = only.split(',');
  list = tests.filter((t) => wanted.includes(t));
  if (!list.length) {
    console.error(`run-tests: --only matched nothing among ${tests.join(', ')}`);
    process.exit(2);
  }
}
const jobs = Math.max(1, Math.min(Number(flag('jobs', 2)) || 2, list.length));

const runOne = (name) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [`scripts/${name}.mjs`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', (e) => resolve({ name, code: 1, out: String(e), ms: Date.now() - started }));
    child.on('exit', (code) => resolve({ name, code, out, ms: Date.now() - started }));
  });

const results = [];
const queue = [...list];
const t0 = Date.now();
const worker = async () => {
  while (queue.length) {
    const r = await runOne(queue.shift());
    results.push(r);
    const lines = r.out.trimEnd().split('\n');
    const summary = lines.filter((l) => l.trim()).slice(-1)[0] || '';
    const status = r.code === 0 ? 'ok  ' : 'FAIL';
    console.log(
      `${status} ${r.name.padEnd(17)} ${(r.ms / 1000).toFixed(1).padStart(5)}s  ${r.code === 0 ? summary : `\n${r.out.trimEnd()}\n`}`,
    );
  }
};
await Promise.all(Array.from({ length: jobs }, worker));

const wall = (Date.now() - t0) / 1000;
const work = results.reduce((s, r) => s + r.ms, 0) / 1000;
const failed = results.filter((r) => r.code !== 0);
console.log(
  `\n${results.length} test scripts in ${jobs} lanes: ${work.toFixed(0)}s of work, ${wall.toFixed(0)}s of wall` +
    (failed.length ? ` — failed: ${failed.map((r) => r.name).join(', ')}` : ' — no failures'),
);
process.exit(failed.length ? 1 : 0);
