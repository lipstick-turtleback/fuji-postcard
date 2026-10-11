#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
/* Build public/index.html from the parts under src/.
 *
 * The page is one self-contained file on purpose: it works offline, it has no
 * runtime dependencies, and the "save the plate" control serialises the live
 * SVG out of the DOM. So the split lives in src/ and the single file is the
 * artefact. No bundler, no framework — the parts are plain CSS, SVG and JS,
 * each of which a linter can read on its own.
 *
 * Two artefacts come out of one string: the annotated page, which is what the
 * suite reads and what the artwork's reasoning lives in, and the shipped one
 * with the reasoning taken out. See the minify step at the bottom.
 *
 *   node scripts/build.mjs          write both files
 *   node scripts/build.mjs --check  fail if either committed file is stale
 */
import { render } from 'svelte/server';
// first, so Node can read a .svelte file when the scene asks for one
import './register-svelte.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'public', 'index.html');

const read = (p) => `${readFileSync(join(src, p), 'utf8').replace(/\s+$/, '')}\n`;

/* The cascade order is written down.

   Nine files in a directory, sorted by name, concatenated: that is a real
   order, and it decides which rule wins wherever two rules reach the same
   element with the same weight — `.card` is styled in 03-card.css and again in
   05-foil.css, and today they happen to set disjoint properties, which is a
   fact about the two files and not a fact about the build. A file named
   `07-foo.css` would land between motion and quality without anyone choosing
   it, and nothing in the artefact would say so.

   So the order is a list, the list is the build's, and each file is wrapped in
   a layer named after itself. A stylesheet that appears in the directory and
   not in the list fails the build rather than sorting itself in.

   One consequence worth knowing: `!important` reverses layer order, so between
   two important declarations the *earlier* layer wins. The page has exactly
   two — the reduced-motion promise and the Enhance-off kill rule — and both
   set `animation: none`, so the reversal changes nothing. It is written here
   because it is the kind of thing that changes something else, later. */
const CSS_LAYERS = [
  ['wall', '01-wall.css'],
  ['masthead', '02-masthead.css'],
  ['card', '03-card.css'],
  ['console', '04-console.css'],
  ['foil', '05-foil.css'],
  ['motion', '06-motion.css'],
  ['narrow', '07-narrow.css'],
  ['quality', '08-quality.css'],
  ['height', '09-height.css'],
  // last, because it is the only layer that answers a different medium, and it
  // has to be able to overrule everything above it without !important
  ['print', '10-print.css'],
];

const css = () => {
  const onDisk = readdirSync(join(src, 'styles'))
    .filter((f) => f.endsWith('.css'))
    .sort();
  const listed = CSS_LAYERS.map(([, f]) => f);
  const unlisted = onDisk.filter((f) => !listed.includes(f));
  const missing = listed.filter((f) => !onDisk.includes(f));
  if (unlisted.length || missing.length) {
    throw new Error(
      `styles/ and CSS_LAYERS disagree — unlisted: ${unlisted.join(', ') || 'none'}; listed but absent: ${missing.join(', ') || 'none'}`,
    );
  }
  const statement = `@layer ${CSS_LAYERS.map(([n]) => n).join(', ')};`;
  return [
    statement,
    ...CSS_LAYERS.map(
      ([name, f]) => `@layer ${name} {\n${read(`styles/${f}`).replace(/\n$/, '')}\n}`,
    ),
  ].join('\n\n');
};

/* The JavaScript is bundled, not glued. Two files dropped into two <script>
   tags share one global scope — card.js declared `const card` at the top level
   and only got away with it because soundtrack.js happened to be an IIFE.
   Rollup gives every module its own scope and lets the parts under
   src/script/ import each other for real. The output is one IIFE per entry,
   inlined, so the page still ships with zero runtime dependencies and still
   opens from the file system. Rollup rather than esbuild because it prints the
   source as it wrote it: the comments that explain why a drone is anchored to
   the clock survive into the annotated artefact, and this project's reasoning
   lives in those comments. The shipped artefact takes them out — see the
   minify step at the bottom, which is where esbuild belongs. */
const js = async (entry) => {
  const bundle = await rollup({ input: join(src, 'script', entry) });
  const { output } = await bundle.generate({ format: 'iife' });
  await bundle.close();
  return `${output[0].code.replace(/\s+$/, '')}\n`;
};

/* A face of the artwork is either one file (the back, 261 lines) or a
   directory of ordered fragments (the front, which is a whole scene). The
   names sort into paint order, and paint order *is* the drawing: a later
   element is a nearer one, so the file order is not bookkeeping, it is the
   picture. Splitting it into files must not change a byte of the built page
   — if `git diff public/index.html` is empty after a split, the split cannot
   have changed what the page does. */
const art = (name) => {
  if (!existsSync(join(src, 'art', `${name}.svg`))) return part(`art/${name}`);
  return read(`art/${name}.svg`);
};

/* A part is a file, or a directory of parts read in sorted order — which is
   how the front face is a scene of twelve fragments, and how its cast is one
   file per mark. The order is the drawing: in SVG a later element is a nearer
   one, and inside the defs it is the order marks are declared in. */
const part = (rel) => {
  const abs = join(src, rel);
  if (statSync(abs).isDirectory())
    return readdirSync(abs)
      .sort()
      .filter((f) => !f.startsWith('.'))
      .map((f) => part(`${rel}/${f}`))
      .join('');
  return read(rel);
};

/* A generated part: a Svelte component, rendered at build time to static
   markup and dropped into the scene where the marker line sits. Nothing
   Svelte is shipped — no runtime, no hydration comments, nothing to fetch.
   What the component buys is the ability to say a thing once: forty-five
   plant placements are a loop over data instead of forty-five hand-typed
   transforms, and the data can be measured and argued about. */
const gen = async (name) => {
  const dir = join(src, 'art', 'gen');
  const component = (await import(new URL(`../src/art/gen/${name}.svelte`, import.meta.url).href))
    .default;
  const props = existsSync(join(dir, `${name}.data.mjs`))
    ? await import(new URL(`../src/art/gen/${name}.data.mjs`, import.meta.url).href)
    : {};
  // the anchors Svelte emits for hydration are meaningless in a page that is
  // never hydrated, and they would sit in the exported plate
  return render(component, { props }).body.replace(/<!--\[-->|<!--\]-->/g, '');
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
  const text = String(await fill()).replace(/\n+$/, '');
  html = html.replace(line, () => text);
}

const asked = new Set();
for (const name of [...html.matchAll(/^[ \t]*@GEN:([A-Za-z0-9_]+)@[ \t]*$/gm)].map((m) => m[1])) {
  asked.add(name);
  const text = await gen(name);
  html = html.replace(new RegExp(`^[ \\t]*@GEN:${name}@[ \\t]*$`, 'm'), () => text);
}

/* A component sitting in src/art/gen that no marker asked for is dead source
   that looks alive. The build reads the page for markers rather than the
   directory for files, so an unwired stand of reeds renders nowhere and nothing
   says so — and the picture is one file narrower than anybody thinks. Fail
   here, where the cause is still obvious. */
const offered = readdirSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'art', 'gen'),
);
const dead = [
  ...offered.filter((f) => f.endsWith('.svelte')),
  ...offered.filter((f) => f.endsWith('.data.mjs')),
].filter((f) => !asked.has(f.replace(/\.(svelte|data\.mjs)$/, '')));
if (dead.length) {
  console.error(
    `build: nothing includes ${dead.map((f) => `src/art/gen/${f}`).join(', ')} — ` +
      `put an @GEN:${dead[0].replace(/\.(svelte|data\.mjs)$/, '')}@ line on its own line where it belongs`,
  );
  process.exit(1);
}

const left = html.match(/@[A-Z_]+@|@GEN:[A-Za-z0-9_]+/g);
if (left) {
  console.error(`build: unresolved markers in output: ${[...new Set(left)].join(', ')}`);
  process.exit(1);
}

/* The shipped artefact. `public/index.html` is the artwork with its reasoning
   written beside every mark — 152 SVG comments, 55 CSS blocks, 17 KB of JS
   comments, 35% of the file. `public/index.min.html` is the same page with the
   reasoning taken out: comments gone, indentation gone, and the stylesheet and
   the two bundles put through esbuild's minifier.

   Both are built from the same string, in the same run, so the annotated page
   cannot drift from the shipped one — and `test-build.mjs` compares the two
   element by element, attribute by attribute and text node by text node, so a
   tidy that ate a word or a minifier that rewrote a rule fails the suite rather
   than the eyes.

   The markup is tidied by hand rather than by a HTML minifier because the page
   is an SVG drawing: every line is trimmed but the line breaks are kept, so a
   `<text>` element's content loses its indentation and keeps its structure.
   esbuild is used for the two things it is good at and nothing else. */
const tidy = (markup) =>
  markup
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');

const minOut = join(root, 'public', 'index.min.html');

const minify = async (page) => {
  const esbuild = await import('esbuild');
  const block = /<(style|script)>([\s\S]*?)<\/\1>/g;
  let out = '';
  let last = 0;
  let m = block.exec(page);
  while (m) {
    out += tidy(page.slice(last, m.index));
    const code = await esbuild.transform(m[2], {
      loader: m[1] === 'style' ? 'css' : 'js',
      minify: true,
      target: 'es2020',
    });
    out += `<${m[1]}>${code.code}</${m[1]}>`;
    last = block.lastIndex;
    m = block.exec(page);
  }
  return out + tidy(page.slice(last));
};

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
  const min = await minify(html);
  if (!existsSync(minOut)) {
    console.error('check: public/index.min.html does not exist — run npm run build');
    process.exit(1);
  }
  if (readFileSync(minOut, 'utf8') !== min) {
    console.error('check: public/index.min.html is stale — run npm run build');
    process.exit(1);
  }
  console.log('check: public/index.min.html is up to date');
} else {
  writeFileSync(out, html);
  const min = await minify(html);
  writeFileSync(minOut, min);
  const bytes = Buffer.byteLength(html);
  const minBytes = Buffer.byteLength(min);
  console.log(
    `build: public/index.html — ${bytes.toLocaleString()} bytes, ` +
      `public/index.min.html — ${minBytes.toLocaleString()} bytes ` +
      `(${((100 * minBytes) / bytes).toFixed(0)}% of it, ${((bytes - minBytes) / 1024).toFixed(0)} KB of comments and indentation taken out)`,
  );
}
