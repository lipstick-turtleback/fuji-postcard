#!/usr/bin/env node
/* The palette has to stay readable, not just quiet.

   Most of the page's text is 9 px, uppercase, letter-spaced — the least
   forgiving kind there is. WCAG asks 4.5:1 for it, and a palette that is
   "a bit softer" drifts under that without anyone noticing until it is a
   screenshot on a bad monitor.

   This reads the custom properties out of the built page and checks the
   pairs that are actually used together.

     node scripts/test-contrast.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8');

const vars = {};
for (const m of html.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?:;|\n)/g))
  vars[m[1]] ??= m[2];

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const h = hex.slice(1);
  const n =
    h.length === 3 ? [...h].map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = n.map((c) => channel(parseInt(c, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// text colour, background colour, the WCAG AA floor for the size it is used at
const PAIRS = [
  ['--ink', '--wall', 4.5, 'masthead, labels'],
  ['--ink-soft', '--wall', 4.5, 'console buttons'],
  ['--muted', '--wall', 4.5, 'topbar, footer, plate metadata — 9 px uppercase'],
];

const problems = [];
const report = [];
for (const [fg, bg, min, what] of PAIRS) {
  if (!vars[fg] || !vars[bg]) {
    problems.push(`missing custom property: ${vars[fg] ? bg : fg}`);
    continue;
  }
  const r = ratio(vars[fg], vars[bg]);
  report.push(`${fg} on ${bg} ${r.toFixed(2)}:1`);
  if (r < min)
    problems.push(
      `${fg} (${vars[fg]}) on ${bg} (${vars[bg]}) is ${r.toFixed(2)}:1, needs ${min}:1 for ${what}`,
    );
}

if (problems.length) {
  console.error(`test-contrast: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`test-contrast: ${report.join(' · ')} — all above AA`);
