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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
/* The annotated page, whichever page this run is checking. Several claims in the
   documents are only true of that file — its comments, its length — and
   `npm run check` runs here twice, once on each. */
const annotated = join(root, 'public', 'index-full.html');
const annotatedText = () => (file === annotated ? html : readFileSync(annotated, 'utf8'));
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
// number currently is — and the number the docs were last told is written down
// one line below, where changing the artwork has to disagree with it. Add a mark
// and the build fails until the claim is changed to match, which is the point: a
// count in a document that nobody re-measures is a count that is already wrong.
const CLAIMED = [841, 144];
const faces = [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)];
const elements = faces.map((f) => [...f[0].matchAll(/<[a-zA-Z][\w:-]*/g)].length);
if (String(elements) !== String(CLAIMED))
  fail(
    0,
    `the page has ${elements.join(' + ')} svg elements and this file claims ${CLAIMED.join(' + ')} — the documents quote the claim, so change the claim, or the artwork, to say which is true`,
  );

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

/* ---- the wave tile has to actually tile -------------------------------- */
// The comment on .bg-seigaiha claims the repeat is invisible at any zoom: every
// arc cut by one edge of the tile is finished by its twin on the opposite edge.
// That is a claim about a handful of numbers inside a data URI, and a claim like
// that survives an edit exactly as long as nobody edits the numbers. So the tile
// is read back out of the page and the claim is checked: any circle that reaches
// past an edge must have a twin, same radius, one tile-width over.
const waveTile = /\.bg-seigaiha\s*\{[^}]*?url\("data:image\/svg\+xml,([^"]+)"\)/.exec(html);
if (!waveTile) {
  fail(0, 'the seigaiha tile could not be found — the check that keeps it seamless is blind');
} else {
  const svg = decodeURIComponent(waveTile[1]);
  const tw = Number(/width=['"]([\d.]+)['"]/.exec(svg)?.[1]);
  const th = Number(/height=['"]([\d.]+)['"]/.exec(svg)?.[1]);
  const arcs = [
    ...svg.matchAll(/<circle\s+cx=['"]([\d.]+)['"]\s+cy=['"]([\d.]+)['"]\s+r=['"]([\d.]+)['"]/g),
  ].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  if (!tw || !th || !arcs.length)
    fail(
      waveTile.index,
      `the seigaiha tile could not be parsed (${tw} × ${th}, ${arcs.length} arcs)`,
    );
  const near = (a, b) => Math.abs(a - b) < 0.01;
  for (const [cx, cy, r] of arcs) {
    const twins = [];
    if (cx - r < 0) twins.push([cx + tw, cy, r]);
    if (cx + r > tw) twins.push([cx - tw, cy, r]);
    if (cy - r < 0) twins.push([cx, cy + th, r]);
    if (cy + r > th) twins.push([cx, cy - th, r]);
    for (const [nx, ny, nr] of twins)
      if (!arcs.some(([x, y, rr]) => near(x, nx) && near(y, ny) && near(rr, nr)))
        fail(
          waveTile.index,
          `the wave tile's arc at ${cx},${cy} r${r} is cut by an edge and has no twin at ${nx},${ny} r${nr} — the repeat will show a seam`,
        );
  }
}

/* ---- and the paper fibre has to stitch --------------------------------- */
// The grain is one 180 px tile of turbulence repeated over the whole wall. It
// only repeats invisibly because the noise is generated with stitchTiles and the
// filter region is pinned to exactly the tile box: change either and the wall
// grows a visible grid of tile edges, which is the one thing a paper texture is
// not allowed to do. Three numbers have to agree — the tile's own width and
// height, the filter region, and background-size — and nothing but this check
// knows they are the same three numbers.
const grainTile = /\.bg-grain\s*\{[^}]*?url\("data:image\/svg\+xml,([^"]+)"\)/.exec(html);
if (!grainTile) {
  fail(0, 'the grain tile could not be found — the check that keeps it stitched is blind');
} else {
  const svg = decodeURIComponent(grainTile[1]);
  const gw = Number(/<svg[^>]*\swidth=['"]([\d.]+)['"]/.exec(svg)?.[1]);
  const gh = Number(/<svg[^>]*\sheight=['"]([\d.]+)['"]/.exec(svg)?.[1]);
  const region =
    /<filter[^>]*filterUnits=['"]userSpaceOnUse['"][^>]*\sx=['"]([-\d.]+)['"]\s+y=['"]([-\d.]+)['"]\s+width=['"]([\d.]+)['"]\s+height=['"]([\d.]+)['"]/.exec(
      svg,
    );
  if (!gw || !gh) fail(grainTile.index, `the grain tile could not be read (${gw} × ${gh})`);
  if (!/stitchTiles=['"]stitch['"]/.test(svg))
    fail(grainTile.index, 'the grain is generated without stitchTiles — the tile will not wrap');
  if (!region)
    fail(
      grainTile.index,
      "the grain's filter region is not pinned to the tile box with filterUnits=userSpaceOnUse",
    );
  else if (
    region[1] !== '0' ||
    region[2] !== '0' ||
    Number(region[3]) !== gw ||
    Number(region[4]) !== gh
  )
    fail(
      grainTile.index,
      `the grain's filter region is ${region[3]} × ${region[4]} at ${region[1]},${region[2]} and the tile is ${gw} × ${gh} — the noise is cropped out of a larger field and the repeat shows`,
    );
  const sized = /\.bg-grain\s*\{[^}]*?background-size:\s*([\d.]+)px\s+([\d.]+)px/.exec(html);
  if (!sized) fail(0, 'the grain tile has no background-size — it is being scaled, not repeated');
  else if (Number(sized[1]) !== gw || Number(sized[2]) !== gh)
    fail(
      sized.index,
      `the grain is repeated at ${sized[1]} × ${sized[2]} css px but the tile is ${gw} × ${gh} — the texture is being rescaled`,
    );
}

/* ---- the README's tree of the front is a list of files that exist ------- */
// The section that says the front is twelve fragments prints the directory, and
// it is the one place a reader learns where to go to change a mark. A name in it
// that is not a name on disk sends them to a file that was never there: the cast
// moved from one file to a directory of one file per mark, and the tree went on
// printing `20-cast.svg` afterwards. So the tree is read back and matched to the
// directory in both directions — every entry listed has to exist, as a file or a
// directory according to its trailing slash, and every entry on disk has to be
// listed — and the count in the heading has to be the number of entries under
// it, because a heading that says twelve over a list of eleven is the same
// mistake one line further down.
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];
const treeHead = /^### The front is ([a-z]+) fragments, in paint order\n+```/m.exec(readme);
if (!treeHead)
  problems.push(
    `${readmeFile}: the README no longer has the front's fragment tree, so nothing matches it to the directory`,
  );
else {
  const body = readme.slice(treeHead.index + treeHead[0].length);
  const fence = body.indexOf('```');
  const block = body.slice(0, fence);
  const blockAt = treeHead.index + treeHead[0].length;
  const listed = new Map();
  for (const m of block.matchAll(/^ {2}([\w.-]+\/?)\s/gm))
    listed.set(m[1], readme.slice(0, blockAt + m.index).split('\n').length);
  if (!listed.size)
    problems.push(
      `${readmeFile}: the front's fragment tree lists no entries, so the check that matches it to the directory matches nothing`,
    );
  const spelled = WORDS.indexOf(treeHead[1]);
  if (spelled < 0)
    problems.push(
      `${readmeFile}: the README says "${treeHead[1]} fragments" of the front, which is not a count this can check`,
    );
  else if (spelled !== listed.size)
    problems.push(
      `${readmeFile}:${readme.slice(0, treeHead.index).split('\n').length}: the heading says ${treeHead[1]} fragments and the tree under it lists ${listed.size}`,
    );
  const frontDir = join(root, 'src', 'art', 'front');
  const onDisk = readdirSync(frontDir);
  for (const [name, line] of listed) {
    const wantsDir = name.endsWith('/');
    const base = wantsDir ? name.slice(0, -1) : name;
    if (!onDisk.includes(base))
      problems.push(
        `${readmeFile}:${line}: the tree lists src/art/front/${name} and there is no such ${wantsDir ? 'directory' : 'file'}`,
      );
    else if (wantsDir !== statSync(join(frontDir, base)).isDirectory())
      problems.push(
        `${readmeFile}:${line}: the tree marks src/art/front/${base} as ${wantsDir ? 'a directory' : 'a file'} and on disk it is the other one`,
      );
  }
  for (const entry of onDisk)
    if (!listed.has(entry) && !listed.has(`${entry}/`))
      problems.push(
        `${readmeFile}: src/art/front/${entry} is on disk and not in the README's tree of the front`,
      );
}

/* ---- the README quotes the build's own layer line ----------------------- */
// The stylesheet section says how many CSS files there are and quotes the first
// line the build writes. Both were true when written and both are the kind of
// thing that goes quietly false: a tenth file, 10-print.css, arrived and the
// count stayed at nine, and `print` joined the layer list while the quoted line
// stayed at nine names. A quoted line that no longer matches the build is worse
// than no quoted line, because a reader checks their own reading of the page
// against it and concludes the page is wrong.
const layerQuote = /`@layer ([a-z,\s]+);`/.exec(readme);
if (!layerQuote)
  problems.push(
    `${readmeFile}: the README no longer quotes the @layer line, so nothing matches it to what the build writes`,
  );
else {
  const quoted = layerQuote[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const built = /@layer ([a-z,\s]+?);/.exec(html);
  if (!built)
    problems.push(
      `${file}: the built page has no @layer statement, so the README is quoting a line nothing writes`,
    );
  else {
    const written = built[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const line = readme.slice(0, layerQuote.index).split('\n').length;
    if (quoted.length !== written.length)
      problems.push(
        `${readmeFile}:${line}: the README quotes ${quoted.length} cascade layers and the build writes ${written.length} (${written.join(', ')})`,
      );
    else
      for (let i = 0; i < written.length; i++)
        if (quoted[i] !== written[i])
          problems.push(
            `${readmeFile}:${line}: the README's layer list has "${quoted[i]}" in position ${i + 1} and the build writes "${written[i]}"`,
          );
  }
}
const fileCount = /([A-Za-z]+) CSS files/.exec(readme);
if (!fileCount)
  problems.push(
    `${readmeFile}: the README no longer says how many CSS files there are, so nothing counts them`,
  );
else {
  const spelled = WORDS.indexOf(fileCount[1].toLowerCase());
  const cssOnDisk = readdirSync(join(root, 'src', 'styles')).filter((f) => f.endsWith('.css'));
  if (spelled < 0)
    problems.push(
      `${readmeFile}: the README says "${fileCount[1]} CSS files", which is not a count this can check`,
    );
  else if (spelled !== cssOnDisk.length)
    problems.push(
      `${readmeFile}:${readme.slice(0, fileCount.index).split('\n').length}: the README says ${fileCount[1]} CSS files and src/styles holds ${cssOnDisk.length}`,
    );
}

/* ---- the page's own argument is counted, and the count is checked ------- */
// The annotated page is the artwork with its reasoning attached, and the README
// says how much reasoning that is. The numbers were 152 and 55 and a byte figure
// that had to be rounded to be meaningful; every round of work adds comments, so
// all three had drifted and the byte one could not be checked at all without
// deciding what counts as a comment in a string. They are counts now, and this is
// the measure they are checked against: `<!--` in the markup, `/*` inside the one
// style element, `/*` inside the script elements. None of them can be spoofed by
// the data URIs, which are percent-encoded and contain no comment opener at all.
const commentClaim =
  /(\d+) markup comments,\s*(\d+) CSS comment blocks and\s*(\d+) JS\s+comment blocks/.exec(readme);
if (!commentClaim)
  problems.push(
    `${readmeFile}: the README no longer counts the page's comments, so nothing re-measures them`,
  );
else {
  // The claim is about the annotated page, so it is measured from that file
  // whichever one this run is checking: `npm run check` runs here twice, and the
  // shipped page has no comments left to count.
  const full = annotatedText();
  const measured = {
    markup: [...full.matchAll(/<!--/g)].length,
    css: [...(/<style>([\s\S]*?)<\/style>/g.exec(full)?.[1] ?? '').matchAll(/\/\*/g)].length,
    js: [...full.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].reduce(
      (n, s) => n + [...s[1].matchAll(/\/\*/g)].length,
      0,
    ),
  };
  const claimed = { markup: +commentClaim[1], css: +commentClaim[2], js: +commentClaim[3] };
  const line = readme.slice(0, commentClaim.index).split('\n').length;
  const noun = { markup: 'markup comments', css: 'CSS comment blocks', js: 'JS comment blocks' };
  for (const kind of ['markup', 'css', 'js'])
    if (measured[kind] !== claimed[kind])
      problems.push(
        `${readmeFile}:${line}: the README says ${claimed[kind]} ${noun[kind]} and the page has ${measured[kind]} — the documents quote the count, so change the count, or the page, to say which is true`,
      );
}

/* ---- a custom property nobody reads is a mark that stopped moving ------- */
// Custom properties are how this page reaches across the gap between the artwork
// and the stylesheet: the ripple's wobble, the pool's position, the card's
// shadow, the reflection's stretch — all named values handed from one file to
// another, some of them written in a style attribute on a shape in the artwork
// and read in a keyframe three files away. A name written and never read is dead
// in the way this project means: it costs nothing, says nothing, and outlives
// the mark it was written for. A name read and never written is worse. With a
// fallback it computes to the fallback, which is a value nobody chose for this
// mark; without one the declaration is invalid at computed-value time and the
// property takes its initial value — a ripple that does not wobble, a shadow
// that does not move, and a page that looks like a calm day.
const propWrites = new Set();
for (const m of html.matchAll(/--([a-z][\w-]*)\s*:/g)) propWrites.add(m[1]);
for (const m of html.matchAll(/setProperty\(\s*['"]--([\w-]+)['"]/g)) propWrites.add(m[1]);
const propReads = new Map();
const bareRead = new Set();
for (const m of html.matchAll(/var\(\s*--([\w-]+)(\s*,)?/g)) {
  propReads.set(m[1], (propReads.get(m[1]) ?? 0) + 1);
  if (!m[2]) bareRead.add(m[1]);
}
for (const m of html.matchAll(/getPropertyValue\(\s*['"]--([\w-]+)['"]/g))
  propReads.set(m[1], (propReads.get(m[1]) ?? 0) + 1);
for (const name of propWrites)
  if (!propReads.has(name))
    problems.push(
      `--${name} is written and never read — the mark it was written for is not using it`,
    );
for (const [name, n] of propReads)
  if (!propWrites.has(name) && bareRead.has(name))
    problems.push(
      `--${name} is read ${n} time${n > 1 ? 's' : ''} with no fallback and written nowhere — those declarations are invalid at computed-value time`,
    );

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

/* ---- the README's counts of the suite and the page are re-measured ------ */
// Two more numbers the README quotes and the tools already know: how many test
// scripts the runner drives, and how long the annotated page is. Both had drifted
// the way these do — the eighteenth test arrived and the sentence still said
// seventeen, and the page grew past the 4,100 lines the opening paragraph names.
const driven = [...runner.matchAll(/^\s*'(test-[\w-]+)',$/gm)].length;
const scriptClaim = /takes the ([a-z]+) scripts/.exec(readme);
if (!scriptClaim)
  problems.push(
    `${readmeFile}: the README no longer says how many test scripts the runner takes, so nothing counts them`,
  );
else {
  const spelled = WORDS.indexOf(scriptClaim[1].toLowerCase());
  if (spelled < 0)
    problems.push(
      `${readmeFile}: the README says "${scriptClaim[1]} scripts", which is not a count this can check`,
    );
  else if (spelled !== driven)
    problems.push(
      `${readmeFile}:${readme.slice(0, scriptClaim.index).split('\n').length}: the README says the runner takes ${scriptClaim[1]} scripts and it lists ${driven}`,
    );
}
const lineClaim = /one ([\d,]+)-line file/.exec(readme);
if (!lineClaim)
  problems.push(
    `${readmeFile}: the README no longer says how long the built page is, so nothing re-measures it`,
  );
else {
  const lines = annotatedText().split('\n').length;
  const claimed = Number(lineClaim[1].replace(/,/g, ''));
  if (claimed !== lines)
    problems.push(
      `${readmeFile}:${readme.slice(0, lineClaim.index).split('\n').length}: the README calls it a ${lineClaim[1]}-line file and the annotated page is ${lines} lines`,
    );
}

/* ---- and no two of them can want the same port -------------------------- */
// The suite runs two tests at a time. Two tests on one port was invisible for as
// long as the suite was a chain of &&, because the second one started after the
// first had let go; it became a Chrome that refuses to come up the moment the
// runner existed, and the refusal names the port and not the other test that is
// holding it. So the ports each test opens are read out of the source and
// compared, which is the only way this stays true without somebody remembering.
const wantedPorts = new Map();
for (const f of scriptsOnDisk) {
  const src = readFileSync(join(root, 'scripts', f), 'utf8');
  for (const m of src.matchAll(/\bport:\s*(\d{4})\b|\bPORT\s*=\s*(\d{4})\b/g)) {
    const port = m[1] || m[2];
    if (!wantedPorts.has(port)) wantedPorts.set(port, new Set());
    wantedPorts.get(port).add(f);
  }
}
for (const [port, files] of wantedPorts)
  if (files.size > 1)
    problems.push(
      `scripts/: port ${port} is opened by ${[...files].join(' and ')} — the suite runs them at the same time, and one of them will not get a browser`,
    );

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
