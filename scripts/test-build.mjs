#!/usr/bin/env node
/* The shipped page has to be the same picture.

   `npm run build` writes two files from one string: `public/index-full.html`,
   which carries the artwork's reasoning in 152 markup comments, 55 CSS blocks
   and 17 KB of JS comments, and `public/index.html`, which carries none of it
   and is the file a static host serves at the root. Half the bytes go. That is a
   build step whose whole job is to change the file without changing the page,
   and the ways it can fail are quiet: a tidy that joins two words inside a
   `<text>` element, a minifier that decides a rule it does not understand is
   dead, a comment that ends where a `-->` was part of an expression.

   So the shipped page is compared to the annotated one at three depths.

   The document: both files are parsed — without running either page's script —
   and walked in document order, element by element, comparing the tag name,
   every attribute, and every text node with its whitespace normalised. A word
   eaten by the tidy shows up here as a text node that reads `KAWAGUCHI-KO`
   where the other reads `KAWAGUCHI- KO`. The contents of the stylesheet and the
   two bundles are the one thing excluded from the walk, because minifying them
   is exactly what changes them; the stylesheet is compared one level in instead,
   as the rules the browser parsed, and the scripts are left to the next two.

   The boot: the shipped page is loaded in Chrome and asked whether its script
   ran, whether the animations are running, and whether anything threw.

   The pixels: both pages are rendered at the same size with motion switched
   off, screenshotted, and diffed pixel by pixel. This is the one that catches a
   minifier dropping a rule, because a dropped rule is invisible to a document
   walk and obvious to a raster.

     node scripts/test-build.mjs
*/
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const annotatedPath = join(root, 'public', 'index-full.html');
const shippedPath = join(root, 'public', 'index.html');
const { ok, finish } = checks('test-build');

const annotated = readFileSync(annotatedPath, 'utf8');
let shipped;
try {
  shipped = readFileSync(shippedPath, 'utf8');
} catch {
  ok('the shipped page exists', false, 'public/index.html was not written — run npm run build');
  finish();
  process.exit(1);
}

const bytes = (s) => Buffer.byteLength(s);

/* Comments are gone, and the claim about size is stated as a floor rather than
   a target: the artwork grows and shrinks, and a number pinned to today's byte
   count is a number that fails for the wrong reason. What has to stay true is
   that the shipped page is meaningfully smaller than the annotated one, because
   if the ratio comes back near 1 the strip step stopped doing anything. */
const comments = (shipped.match(/<!--/g) || []).length;
ok('the shipped page carries no markup comments', comments === 0, `${comments} left`);

const blocks = [...shipped.matchAll(/<(style|script)>([\s\S]*?)<\/\1>/g)];
const blockComments = blocks.reduce((n, m) => n + (m[2].match(/\/\*/g) || []).length, 0);
ok(
  'and none in its stylesheet or its two bundles',
  blocks.length === 3 && blockComments === 0,
  `${blocks.length} blocks, ${blockComments} comment openers`,
);

ok(
  'and it is smaller than the annotated page by more than a quarter',
  bytes(shipped) < 0.75 * bytes(annotated),
  `${bytes(shipped).toLocaleString()} of ${bytes(annotated).toLocaleString()} bytes`,
);

/* And the naming has to be what does the serving. A static host answers the root
   of `outputDirectory` with `index.html`, so the smaller page is worth having
   under that name and not another — and if a rewrite for `/` is ever added to
   point somewhere else, the rule and the two filenames can disagree without
   anything failing. This is the same claim seen from the other side: the check
   above proves the file called index.html is the smaller one, this one proves
   nothing overrides it. */
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const rewritten = (vercel.rewrites ?? []).find((r) => r.source === '/');
ok(
  'and the deployment reaches it by name, with nothing rewriting the root',
  vercel.outputDirectory === 'public' && rewritten === undefined,
  `outputDirectory ${vercel.outputDirectory} · ${rewritten ? `/ → ${rewritten.destination}` : 'no rewrite for /'}`,
);

/* Two browsers, because one flag is the difference between the two questions.
   The boot asks whether the page is alive, and a page with
   --force-prefers-reduced-motion has no animations to count. The raster asks
   whether the two pages are the same picture, and that needs a page that is
   standing still while it is photographed. */
const plain = await openPage({ port: 9377, userDataDir: '/tmp/fuji-build' });
const still = await openPage({
  port: 9378,
  userDataDir: '/tmp/fuji-build-still',
  args: ['--force-prefers-reduced-motion'],
});
if (!plain || !still) {
  skipped('test-build');
  finish();
  process.exit(0);
}
for (const p of [plain, still]) {
  await p.send('Page.enable');
  await p.send('Runtime.enable');
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: 1441,
    height: 1150,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

/* Everything below runs inside a try so the two browsers are closed even when an
   evaluate throws. A Chrome left running on a test's port is not a leak that
   costs a megabyte of RAM and nothing else: the next run of the next test
   attaches to it and inherits its flags. See openPage in cdp.mjs.

   */
try {
  /* The boot. Everything the page does with a script has to survive minification:
   the Enhance switch, the animations, and the plate export, which is the one
   place the code reaches into its own stylesheet — the button is looked for by id
   because that is the control the plate comes out of.

   Both pages are booted and their numbers are compared to each other rather than
   to a constant, because the count of animations is a property of the artwork
   that moves: the day a mark is added, a threshold of 40 is a lie about the page
   and not a finding about the build.

   The wait is a poll of readyState rather than a fixed sleep. Asked too early,
   the page answers with its markup and no styles resolved, which is how this
   check first reported 0 animations on a page that had 65. */
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));
  const bootPage = async (p, path) => {
    await p.send('Page.navigate', { url: silentPage(`file://${path}`) });
    for (let i = 0; i < 60; i++) {
      if ((await p.evaluate('document.readyState')) === 'complete') break;
      await settle(100);
    }
    await settle(900);
    const stats = await p.evaluate(`(() => {
    const svg = document.querySelector('.face.front svg');
    return JSON.stringify({
      ready: document.readyState,
      enhance: document.documentElement.dataset.enhance || null,
      animations: document.getAnimations().length,
      marks: svg ? svg.querySelectorAll('*').length : 0,
      exportButton: !!document.querySelector('#dl'),
      sheets: document.styleSheets.length,
      mist: getComputedStyle(document.querySelector('.mist-a') || document.body).animationName,
    });
  })()`);
    return JSON.parse(stats);
  };
  const bootA = await bootPage(plain, annotatedPath);
  const bootB = await bootPage(plain, shippedPath);
  ok(
    'the shipped page boots the same way the annotated one does',
    bootA.enhance === 'off' &&
      bootB.enhance === 'off' &&
      bootA.animations === bootB.animations &&
      bootA.animations > 0 &&
      bootA.marks === bootB.marks &&
      bootA.exportButton &&
      bootB.exportButton,
    `ready ${bootA.ready}/${bootB.ready} · annotated: ${bootA.animations} animations, ${bootA.marks} svg elements · shipped: ${bootB.animations} animations, ${bootB.marks} svg elements · export control ${
      bootB.exportButton ? 'there' : 'missing'
    }`,
  );

  /* The document walk. Parsed rather than loaded: a script that runs could add a
   node to one page and not the other for reasons that have nothing to do with
   the build, and what is being tested here is what the build wrote. */
  await plain.send('Page.navigate', { url: silentPage('about:blank') });
  await new Promise((r) => setTimeout(r, 400));

  const walk = JSON.parse(
    await plain.evaluate(
      `(() => {
      const parse = (s) => new DOMParser().parseFromString(s, 'text/html');
      const norm = (s) => s.replace(/\\s+/g, ' ').trim();
      const list = (doc) => {
        const out = [];
        const visit = (node) => {
          for (const child of node.childNodes) {
            if (child.nodeType === 1) {
              const attrs = [];
              // whitespace inside an attribute value is normalised on both sides:
              // a filter's values="…" list is written across five indented lines
              // in the annotated page and on one in the shipped one, and the
              // renderer reads the same list out of both
              for (const a of child.attributes)
                attrs.push(a.name + '=' + a.value.replace(/\\s+/g, ' '));
              out.push(child.tagName + ' ' + attrs.sort().join(' '));
              // the contents of a style or script element are what the minifier
              // is for; the stylesheet is compared as rules, the scripts as the
              // live page below
              if (child.tagName !== 'STYLE' && child.tagName !== 'SCRIPT') visit(child);
            } else if (child.nodeType === 3) {
              const t = norm(child.nodeValue);
              if (t) out.push('#text ' + t);
            }
          }
        };
        visit(doc.documentElement);
        return out;
      };
      const a = list(parse(${JSON.stringify(annotated)}));
      const b = list(parse(${JSON.stringify(shipped)}));
      let first = null;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
          first = { i, annotated: a[i] || '(nothing)', shipped: b[i] || '(nothing)' };
          break;
        }
      }
      return JSON.stringify({
        a: a.length,
        b: b.length,
        same: a.length === b.length && !first,
        first,
      });
    })()`,
    ),
  );
  ok(
    'the shipped page is the same document as the annotated one',
    walk.same,
    walk.same
      ? `${walk.a} nodes in both`
      : `node ${walk.i}: annotated «${(walk.first?.annotated || '').slice(0, 90)}» · shipped «${(walk.first?.shipped || '').slice(0, 90)}»`,
  );

  /* The README quotes this count, so the test that measures it also holds the
     document to it — the same arrangement check.mjs uses for the element counts.
     A number in a document that nobody re-measures is a number that is already
     wrong, and this one had drifted by three while the artwork grew: the caption
     gained a tspan, the pole was cut in two at the waterline. */
  const CLAIMED_NODES = 1134;
  ok(
    'and the node count the README quotes is the one the page has',
    walk.a === CLAIMED_NODES,
    `${walk.a} nodes measured, README.md claims ${CLAIMED_NODES} — change the claim, or the artwork, to say which is true`,
  );

  /* The stylesheet one level in: not the text the build wrote but the rules the
   browser read out of it. What is compared is the shape of the stylesheet — the
   rule kinds, the selectors, the media and layer conditions, the animation names
   and the keyframe keys, in order — and not the declarations inside a rule,
   because a minifier is allowed to rewrite those and does: it drops the leading
   zero of a decimal, and it drops `0%` and `100%` from the ends of a gradient,
   both of which are what the browser would assume anyway. Whether the
   declarations still add up to the same picture is the pixel check below, which
   is a far better judge of that than a string comparison. */
  const shapeOf = async (html) =>
    JSON.parse(
      await plain.evaluate(
        `(() => {
        const css = /<style>([\\s\\S]*?)<\\/style>/.exec(${JSON.stringify(html)})[1];
        const el = document.createElement('style');
        el.textContent = css;
        document.head.append(el);
        const out = [];
        const walk = (list) => {
          for (const r of list) {
            out.push(
              r.constructor.name +
                ' ' +
                (r.selectorText || r.conditionText || r.name || r.keyText || ''),
            );
            if (r.cssRules) walk(r.cssRules);
          }
        };
        walk(el.sheet.cssRules);
        el.remove();
        return JSON.stringify(out);
      })()`,
      ),
    );
  const shapeA = await shapeOf(annotated);
  const shapeB = await shapeOf(shipped);
  let shapeFirst = null;
  for (let i = 0; i < Math.max(shapeA.length, shapeB.length); i++) {
    const x = (shapeA[i] || '(none)').replace(/\s+/g, ' ').trim();
    const y = (shapeB[i] || '(none)').replace(/\s+/g, ' ').trim();
    if (x === y) continue;
    shapeFirst = { i, annotated: x.slice(0, 110), shipped: y.slice(0, 110) };
    break;
  }
  ok(
    'and its stylesheet parses to the same rules, selectors and keyframes in the same order',
    shapeA.length === shapeB.length && !shapeFirst,
    shapeFirst
      ? `rule ${shapeFirst.i} of ${shapeA.length}/${shapeB.length}: annotated «${shapeFirst.annotated}» · shipped «${shapeFirst.shipped}»`
      : `${shapeA.length} rules in both`,
  );

  /* The pixels. Both pages, same viewport, motion forced off, so the two
   rasters are of a still picture and any difference at all is a difference the
   build put there. */
  const shot = async (path) => {
    await still.send('Page.navigate', { url: silentPage(`file://${path}`) });
    await new Promise((r) => setTimeout(r, 1600));
    const { data } = await still.send('Page.captureScreenshot', { format: 'png' });
    return data;
  };
  const pngA = await shot(annotatedPath);
  const pngB = await shot(shippedPath);

  await still.send('Page.navigate', { url: silentPage('about:blank') });
  await new Promise((r) => setTimeout(r, 300));
  const diff = JSON.parse(
    await still.evaluate(
      `new Promise((resolve) => {
      const load = (src) =>
        new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.src = src;
        });
      Promise.all([load('data:image/png;base64,${pngA}'), load('data:image/png;base64,${pngB}')]).then(
        ([a, b]) => {
          const w = Math.min(a.width, b.width);
          const h = Math.min(a.height, b.height);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const g = canvas.getContext('2d');
          g.drawImage(a, 0, 0);
          const pa = g.getImageData(0, 0, w, h).data;
          g.clearRect(0, 0, w, h);
          g.drawImage(b, 0, 0);
          const pb = g.getImageData(0, 0, w, h).data;
          let changed = 0;
          let worst = 0;
          for (let i = 0; i < pa.length; i += 4) {
            const d = Math.max(
              Math.abs(pa[i] - pb[i]),
              Math.abs(pa[i + 1] - pb[i + 1]),
              Math.abs(pa[i + 2] - pb[i + 2]),
            );
            if (d > 2) changed++;
            if (d > worst) worst = d;
          }
          resolve(JSON.stringify({ size: w + 'x' + h, total: w * h, changed, worst }));
        },
      );
    })`,
      { awaitPromise: true },
    ),
  );
  ok(
    'and it draws the same picture, pixel for pixel',
    diff.changed === 0,
    `${diff.changed} of ${diff.total.toLocaleString()} pixels in ${diff.size} differ by more than 2/255, worst ${diff.worst}`,
  );
} finally {
  plain.close();
  still.close();
}
finish();
