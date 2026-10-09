#!/usr/bin/env node
/* Verify public/index.html without a browser and without dependencies.
 *
 * The page is one file of inline SVG, CSS and JS, and the browser is very
 * forgiving about the mistakes that actually break it — an unterminated
 * HTML comment, closed with the two characters that end a C comment, will
 * silently swallow every filter defined after it, and the art just stops
 * rendering. These checks report the exact line instead.
 *
 *   node scripts/check.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'index.html');
const html = readFileSync(file, 'utf8');

const problems = [];
const at = (index) => `${file}:${html.slice(0, index).split('\n').length}`;
const fail = (index, message) => problems.push(`${at(index)}: ${message}`);

/* ---- comments: the bug that hid half the artwork ----------------------- */
for (let i = html.indexOf('<!--'); i !== -1; i = html.indexOf('<!--', i + 4)) {
  const end = html.indexOf('-->', i + 4);
  if (end === -1) {
    fail(i, 'comment is never closed');
    break;
  }
  const body = html.slice(i + 4, end);
  if (body.includes('--')) fail(i, `comment contains "--" (illegal in XML): ${body.slice(0, 40)}…`);
  if (body.includes('*/')) fail(i, 'comment looks like a C comment closed with "*/"');
  i = end;
}

/* ---- tag nesting -------------------------------------------------------- */
// script and style bodies are not markup; blank them out (same length, so
// every reported line number still points at the real file)
const markup = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (block) =>
  block.replace(/[^\n]/g, ' '),
);
const stack = [];
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\s*(\/?)>/g;
for (const m of markup.matchAll(tagRe)) {
  const [, closing, name, , selfClose] = m;
  if (closing) {
    const open = stack.pop();
    if (!open) fail(m.index, `</${name}> with nothing open`);
    else if (open.name !== name)
      fail(m.index, `</${name}> closes <${open.name}> opened at ${at(open.index)}`);
  } else if (!selfClose && !VOID.has(name.toLowerCase())) {
    stack.push({ name, index: m.index });
  }
}
for (const open of stack) fail(open.index, `<${open.name}> is never closed`);

/* ---- ids must be unique, and every reference must resolve -------------- */
const ids = new Map();
for (const d of html.matchAll(/\sid="([^"]+)"/g)) {
  if (ids.has(d[1])) fail(d.index, `duplicate id "${d[1]}" (first at ${at(ids.get(d[1]))})`);
  ids.set(d[1], d.index);
}
const refs = [
  ...html.matchAll(/url\(#([^)]+)\)/g),
  ...html.matchAll(/href="#([^"]+)"/g),
  ...html.matchAll(/xlink:href="#([^"]+)"/g),
];
// aria-labelledby and aria-describedby take space-separated id lists, not one
// id, so they need their own pass. A typo in one of them is invisible: the
// element simply stops having a name and nothing else complains.
for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]*)"/g))
  for (const name of m[1].trim().split(/\s+/))
    if (!ids.has(name)) fail(m.index, `aria reference to missing id "${name}"`);
for (const r of refs) if (!ids.has(r[1])) fail(r.index, `reference to missing id "#${r[1]}"`);

/* ---- every picture has to say what it is ------------------------------- */
// The artwork is the page. An <svg> with no <title> is invisible to a screen
// reader and unnamed in whatever opens an exported plate.
for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
  const end = html.indexOf('</svg>', m.index);
  const body = html.slice(m.index, end === -1 ? html.length : end);
  if (!/<title\b/.test(body)) fail(m.index, '<svg> has no <title>');
  if (!/<desc\b/.test(body)) fail(m.index, '<svg> has no <desc>');
  if (!/aria-labelledby=/.test(m[0])) fail(m.index, '<svg> <title> is not wired to aria-labelledby');
}

/* ---- an id nothing points to is artwork that quietly stopped existing --- */
// anything that can name an id: CSS selectors, querySelector/closest
// strings, and getElementById
const named = new Set();
for (const r of refs) named.add(r[1]);
for (const r of html.matchAll(/#([A-Za-z][\w-]*)/g)) named.add(r[1]);
for (const r of html.matchAll(/getElementById\(\s*['"]([^'"]+)['"]/g)) named.add(r[1]);
// aria-labelledby / aria-describedby are references too. Without this the
// rule reports a perfectly good <desc> as artwork that stopped existing.
for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]*)"/g))
  for (const name of m[1].trim().split(/\s+/)) named.add(name);
const unused = [...ids].filter(([name]) => !named.has(name));

/* ---- every advertised keyboard shortcut actually exists ----------------- */
// The README and the <kbd> hints on the buttons are promises. This caught
// "S — Save the plate" being advertised for the whole life of the README
// while only F and M were ever wired up.
const scripts = [...html.matchAll(/<script\b[\s\S]*?<\/script>/gi)].map((m) => m[0]).join('\n');
const handled = new Set([...scripts.matchAll(/e\.key === '(.)'/g)].map((m) => m[1].toUpperCase()));
for (const m of markup.matchAll(/<kbd[^>]*>\s*([A-Za-z])\s*<\/kbd>/g)) {
  const key = m[1].toUpperCase();
  if (!handled.has(key))
    fail(m.index, `the button advertises the "${key}" key but nothing handles it`);
}
const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const m of readme.matchAll(/\*\*`([A-Za-z])`\*\*/g)) {
  const key = m[1].toUpperCase();
  if (!handled.has(key)) fail(0, `README documents the "${key}" shortcut but nothing handles it`);
}

/* ---- the export must carry every animation the page has ---------------- */
// "Save the plate" clones the live SVG and inlines only the CSS rules its
// filter regex matches. A class that animates but is not in that regex
// exports as a still image, silently.
const styleBlock = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const animClasses = new Set();
for (const rule of styleBlock.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const [, selector, body] = rule;
  const decl = /\banimation(-name)?\s*:\s*([^;}]*)/.exec(body);
  // "animation: none" turns motion off; it does not make a class animated
  if (!decl || /^\s*none\b/.test(decl[2])) continue;
  for (const cls of selector.matchAll(/\.([A-Za-z][\w-]*)/g)) animClasses.add(cls[1]);
}
const reStart = html.indexOf('/@keyframes|');
if (reStart < 0) {
  fail(0, 'the export filter regex was not found — did card.js change?');
} else {
  let reEnd = reStart + 1;
  while (reEnd < html.length) {
    if (html[reEnd] === '\\') reEnd += 2;
    else if (html[reEnd] === '/') break;
    else reEnd++;
  }
  const exportRe = new RegExp(html.slice(reStart + 1, reEnd));
  for (const cls of animClasses)
    if (!exportRe.test(`.${cls}`))
      fail(
        reStart,
        `the export drops the animated class ".${cls}" — add it to the filter in card.js`,
      );
}

/* ---- the file must stay self-contained --------------------------------- */
for (const d of html.matchAll(/(?:src|href)="(?!#)([^"]*)"/g)) {
  if (/^(https?:)?\/\//.test(d[1]) || !d[1].startsWith('data:'))
    fail(d.index, `external reference: ${d[1]}`);
}
for (const d of html.matchAll(/url\((['"]?)(https?:)?\/\/[^)]*\)/g))
  fail(d.index, 'external url() in CSS');
if (/@import/.test(html)) fail(0, '@import found');

if (problems.length) {
  console.error(`check: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
for (const [name, index] of unused)
  console.log(`check: note — id "${name}" defined at ${at(index)} is never referenced`);
console.log(`check: ${file} — ${html.split('\n').length} lines, no problems`);
