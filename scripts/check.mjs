#!/usr/bin/env node
/* Verify a built page without a browser and without dependencies.
 *
 * The page is one file of inline SVG, CSS and JS, and the browser is very
 * forgiving about the mistakes that actually break it — an unterminated
 * HTML comment, closed with the two characters that end a C comment, will
 * silently swallow every filter defined after it, and the art just stops
 * rendering. These checks report the exact line instead.
 *
 *   node scripts/check.mjs                     the annotated page
 *   node scripts/check.mjs public/index.html   the shipped one
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathProblems } from './svg-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Which page, and why the default is the annotated one. Half of what this file
   looks for lives inside comments — an HTML comment closed with the two
   characters that end a C comment silently swallows every filter defined after
   it — and the only file where that can be seen is the one that still has its
   comments. `npm run check` therefore runs this twice: once on
   public/index-full.html, once on public/index.html, which has no comments left
   to go wrong and the same tags, paths and <use> references to get right. */
const file = process.argv[2]
  ? resolve(root, process.argv[2])
  : join(root, 'public', 'index-full.html');
const html = readFileSync(file, 'utf8');
const readmeFile = join(root, 'README.md');
const readme = readFileSync(readmeFile, 'utf8');

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
// script and style bodies are not markup, and neither is a comment: a note
// saying "<defs> is closed by the next file" was being counted as an element,
// which unbalanced the whole front face. Blank both out (same length, so
// every reported line number still points at the real file)
const blank = (block) => block.replace(/[^\n]/g, ' ');
const markup = html
  .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank)
  .replace(/<!--[\s\S]*?-->/g, blank);
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
  // A detail names the shape it is drawn on with data-on, and that name is an
  // id like any other. test-visible walks it; a typo there is not a crash, it
  // is the walk quietly not happening, so the id has to be resolved here.
  ...html.matchAll(/data-on="([^"]+)"/g),
];
// aria-labelledby and aria-describedby take space-separated id lists, not one
// id, so they need their own pass. A typo in one of them is invisible: the
// element simply stops having a name and nothing else complains.
for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([^"]*)"/g))
  for (const name of m[1].trim().split(/\s+/))
    if (!ids.has(name)) fail(m.index, `aria reference to missing id "${name}"`);
for (const r of refs) if (!ids.has(r[1])) fail(r.index, `reference to missing id "#${r[1]}"`);

/* ---- every path has to be a path --------------------------------------- */
// the rules live in svg-check.mjs because the same rules have to hold over a
// .svg file this page hands out, not only over the page itself
for (const p of pathProblems(html)) fail(p.index, p.message);

/* ---- every picture has to say what it is ------------------------------- */
// The artwork is the page. An <svg> with no <title> is invisible to a screen
// reader and unnamed in whatever opens an exported plate.
for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
  const end = html.indexOf('</svg>', m.index);
  const body = html.slice(m.index, end === -1 ? html.length : end);
  if (!/<title\b/.test(body)) fail(m.index, '<svg> has no <title>');
  if (!/<desc\b/.test(body)) fail(m.index, '<svg> has no <desc>');
  if (!/aria-labelledby=/.test(m[0]))
    fail(m.index, '<svg> <title> is not wired to aria-labelledby');
}

/* ---- a shape that cannot paint ----------------------------------------- */
// fill and stroke are inherited, and a group that says fill="none" says it for
// every descendant that does not name its own. Two cast marks were built that
// way: the bent reed's head and the seeded tuft's two seeds set stroke="none"
// inside a group that set fill="none", so between the two attributes they
// painted nothing at all. The reed's stem ended in a bare point with a short
// curve of tip floating above the gap where its head should have been, and the
// plant the file calls "a tuft that has gone to seed" had no seed on it. The
// drawing was correct and the ink was not, and nothing that reads geometry can
// tell.
//
// So: walk the markup carrying what fill and stroke mean at this depth, and
// report any shape that has neither. Shapes inside a clipPath or a mask are
// not ink and are left alone, and so is anything explicitly turned off.
const SHAPE = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'polyline']);
const NOT_INK = new Set(['clipPath', 'mask', 'filter']);
const paintAttr = (attrs, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
};
const paintStack = [{ fill: null, stroke: null, sw: null, skip: false }];
for (const m of markup.matchAll(tagRe)) {
  const [, closing, name, attrs, selfClose] = m;
  if (closing) {
    paintStack.pop();
    continue;
  }
  const above = paintStack[paintStack.length - 1];
  const skip = above.skip || NOT_INK.has(name);
  const fill = paintAttr(attrs, 'fill') ?? above.fill;
  const stroke = paintAttr(attrs, 'stroke') ?? above.stroke;
  const sw = paintAttr(attrs, 'stroke-width') ?? above.sw;
  if (!skip && SHAPE.has(name)) {
    const off = paintAttr(attrs, 'opacity') ?? paintAttr(attrs, 'display');
    const noFill = fill === 'none';
    const noStroke = stroke === 'none' || (sw !== null && Number.parseFloat(sw) === 0);
    if (off !== '0' && off !== 'none' && noFill && noStroke)
      fail(m.index, `<${name}> can paint nothing: fill is none and stroke is none here`);
  }
  if (!selfClose) paintStack.push({ fill, stroke, sw, skip });
}

/* ---- how big the picture is -------------------------------------------- */
// The docs quote this, so the tool that validates the page also says what the
// number currently is: 834 elements on the front, 143 on the back.
const faces = [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)];
const elements = faces.map((f) => [...f[0].matchAll(/<[a-zA-Z][\w:-]*/g)].length);

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
// `.key`, not `e.key`: this file is run on the shipped page as well as the
// annotated one, and the shipped page has been through a minifier that renames
// every local. The handler used to be found by its variable's letter, which made
// the check pass on one file and fail on the other for a reason that had nothing
// to do with whether the shortcut works.
const handled = new Set(
  [...scripts.matchAll(/\.key\s*===\s*['"](.+?)['"]/g)].map((m) => m[1].toUpperCase()),
);
for (const m of markup.matchAll(/<kbd[^>]*>\s*([A-Za-z])\s*<\/kbd>/g)) {
  const key = m[1].toUpperCase();
  if (!handled.has(key))
    fail(m.index, `the button advertises the "${key}" key but nothing handles it`);
}
for (const m of readme.matchAll(/\*\*`([A-Za-z])`\*\*/g)) {
  const key = m[1].toUpperCase();
  if (!handled.has(key))
    problems.push(
      `${readmeFile}:${readme.slice(0, m.index).split('\n').length}: documents the "${key}" shortcut but nothing handles it`,
    );
}

/* ---- the export must carry every animation the page has ---------------- */
// "Save the plate" clones the live SVG and inlines only the CSS rules its
// filter regex matches. A class that animates but is not in that regex
// exports as a still image, silently.
// comments blanked first, for the same reason the tag scan blanks them: the
// selector of a rule is everything back to the previous `}`, so a sentence
// that mentions a filename — "see 50-lake.svg" — becomes a class named `.svg`
const styleBlock = html
  .slice(html.indexOf('<style>'), html.indexOf('</style>'))
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
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

/* ---- a test nobody runs is a test that does not exist ------------------- */
// A browser test written, run by hand once, and left out of the chain reports
// nothing to anybody ever again — it is a check in the same way a stylesheet
// rule with no element to select is a check. The mirror case is a chain that
// names a file that has been renamed or deleted, which fails every later run
// for a reason that has nothing to do with the page.
const scriptsOnDisk = readdirSync(join(root, 'scripts'))
  .filter((f) => /^test-.+\.mjs$/.test(f))
  .sort();
const pkgFile = join(root, 'package.json');
const chain = JSON.parse(readFileSync(pkgFile, 'utf8')).scripts.test;
// The chain is allowed to reach the tests through a runner, because the runner
// is what runs them at once. That only counts if the runner is in the chain and
// the test is in the runner's own list — the promise is that the suite runs it,
// not that package.json says so with its own words.
const runnerName = 'scripts/run-tests.mjs';
const runnerPath = join(root, runnerName);
const runner = existsSync(runnerPath) ? readFileSync(runnerPath, 'utf8') : '';
const runnerInChain = chain.includes(runnerName);
for (const f of scriptsOnDisk) {
  const inChain = new RegExp(`scripts/${f.replace(/\./g, '\\.')}(?=\\s|$)`).test(chain);
  const inRunner = runnerInChain && new RegExp(`['"]${f.replace(/\.mjs$/, '')}['"]`).test(runner);
  if (!inChain && !inRunner) problems.push(`${pkgFile}: scripts/${f} is not in the npm test chain`);
}
for (const m of runner.matchAll(/^\s*'(test-[\w-]+)',$/gm))
  if (!existsSync(join(root, 'scripts', `${m[1]}.mjs`)))
    problems.push(`${runnerName}: ${m[1]} is in the runner's list and not on disk`);
for (const m of chain.matchAll(/node (scripts\/[\w-]+\.mjs)/g))
  if (!existsSync(join(root, m[1])))
    problems.push(`${pkgFile}: ${m[1]} is in the npm test chain and not on disk`);

/* ---- the README's map of scripts/ has to be the directory --------------- */
// The listing is how anyone finds their way in, and a file that is not in it is
// a file nobody will run on purpose.
for (const f of readdirSync(join(root, 'scripts'))
  .filter((f) => f.endsWith('.mjs'))
  .sort())
  if (!readme.includes(f)) problems.push(`${readmeFile}: scripts/${f} is not in the listing`);

if (problems.length) {
  console.error(`check: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
for (const [name, index] of unused)
  console.log(`check: note — id "${name}" defined at ${at(index)} is never referenced`);
console.log(
  `check: ${file} — ${html.split('\n').length} lines, ${elements.join(' + ')} svg elements, no problems`,
);
