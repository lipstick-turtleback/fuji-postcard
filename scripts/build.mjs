#!/usr/bin/env node
/* Build public/index.html from the parts under src/.
 *
 * The page is one self-contained file on purpose: it works offline, it has no
 * runtime dependencies, and the "save the plate" control serialises the live
 * SVG out of the DOM. So the split lives in src/ and the single file is the
 * artefact. No bundler, no framework — the parts are plain CSS, SVG and JS,
 * each of which a linter can read on its own.
 *
 *   node scripts/build.mjs          write public/index.html
 *   node scripts/build.mjs --check  fail if the committed file is stale
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'public', 'index.html');

const read = (p) => `${readFileSync(join(src, p), 'utf8').replace(/\s+$/, '')}\n`;

const css = () =>
  readdirSync(join(src, 'styles'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => read(`styles/${f}`))
    .join('\n');

const js = (name) => read(`script/${name}`);

/* A face of the artwork is either one file (the back, 261 lines) or a
   directory of ordered fragments (the front, which is a whole scene). The
   names sort into paint order, and paint order *is* the drawing: a later
   element is a nearer one, so the file order is not bookkeeping, it is the
   picture. Splitting it into files must not change a byte of the built page
   — if `git diff public/index.html` is empty after a split, the split cannot
   have changed what the page does. */
const art = (name) => {
  const dir = join(src, 'art', name);
  if (existsSync(dir))
    return readdirSync(dir)
      .filter((f) => f.endsWith('.svg'))
      .sort()
      .map((f) => read(`art/${name}/${f}`))
      .join('');
  return read(`art/${name}.svg`);
};

const slots = {
  '@CSS@': css,
  '@SVG_FRONT@': () => art('front'),
  '@SVG_BACK@': () => art('back'),
  '@JS_CARD@': () => js('card.js'),
  '@JS_SOUNDTRACK@': () => js('soundtrack.js'),
};

let html = read('template.html');
for (const [marker, fill] of Object.entries(slots)) {
  // a marker must own its line, so the part can be stored at its own indent
  const line = new RegExp(`^[ \\t]*${marker}[ \\t]*$`, 'm');
  if (!line.test(html)) {
    console.error(`build: ${marker} is missing from src/template.html`);
    process.exit(1);
  }
  html = html.replace(line, () => fill().replace(/\n+$/, ''));
}

const left = html.match(/@[A-Z_]+@/g);
if (left) {
  console.error(`build: unresolved markers in output: ${[...new Set(left)].join(', ')}`);
  process.exit(1);
}

if (process.argv.includes('--check')) {
  if (!existsSync(out)) {
    console.error('check: public/index.html does not exist — run npm run build');
    process.exit(1);
  }
  if (readFileSync(out, 'utf8') === html) {
    console.log('check: public/index.html is up to date');
  } else {
    console.error('check: public/index.html is stale — run npm run build');
    process.exit(1);
  }
} else {
  writeFileSync(out, html);
  const bytes = Buffer.byteLength(html);
  console.log(`build: public/index.html — ${bytes.toLocaleString()} bytes`);
}
