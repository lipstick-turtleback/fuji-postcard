#!/usr/bin/env node
/* SAVE THE PLATE has to hand out the picture that is on the screen.

   The export is its own program: it clones one face, gives it an xmlns and a
   size, and pastes in the subset of the page's CSS it thinks the file needs,
   chosen by a regular expression over the rule text. Every step there can go
   wrong quietly. A clone carries only its own <defs>, so a gradient defined
   in the other face turns the shape black. A class added to a mark without a
   matching entry in that filter loses its styling in the file and keeps it on
   the screen, so the only place the bug exists is in something the visitor
   took home. And a path that the browser forgives in the page is no better
   in the export.

   So this takes the bytes the page actually produces — the Blob handed to the
   download link, caught before it leaves — and runs the same rules over them
   that check.mjs runs over the page, plus two that only exist here: every
   rule the page applies to a class inside that face has to be in the file,
   and the file has to load in a browser as the same number of shapes.

     node scripts/test-export.mjs

   Needs Chrome; skips, like the layout test, when it is not installed. */
import { openPage, silentPage } from './cdp.mjs';
import { comparePng, decodePng, downsample } from './png.mjs';
import { danglingRefs, pathProblems } from './svg-check.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);

const page = await openPage({
  port: 9390,
  userDataDir: '/tmp/fuji-export-test',
  args: ['--force-prefers-reduced-motion'],
});
if (!page) {
  console.log('test-export: no Chrome, or Chrome did not come up - skipped');
  process.exit(0);
}
const { send, evaluate, exceptions, consoleErrors, close } = page;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1150,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: PAGE });
await new Promise((r) => setTimeout(r, 1500));

// the classes the face uses, and every rule on the page that selects them.
// the export is allowed to drop a rule only if no mark in the face asks for it
const classRules = JSON.parse(
  await evaluate(`(() => {
    const out = {};
    for (const name of ['front', 'back']) {
      const svg = document.querySelector('.face.' + name + ' svg');
      const classes = new Set();
      for (const e of svg.querySelectorAll('[class]'))
        for (const c of (e.className.baseVal || '').split(/\\s+/)) if (c) classes.add(c);
      const wanted = [...classes];
      const rules = [];
      const scan = (rs) => {
        for (const r of rs) {
          // selectorText first: a CSSStyleRule has a cssRules list of its own
          // now, for nesting, so testing it first would walk into an empty
          // list and never look at the rule — which is how this check passed
          // over a class whose rule the export really did drop
          if (r.selectorText && wanted.some((c) => new RegExp('\\\\.' + c + '(?![\\\\w-])').test(r.selectorText)))
            rules.push(r.cssText);
          if (r.cssRules) scan(r.cssRules);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          scan(sheet.cssRules);
        } catch {}
      }
      out[name] = { classes: wanted, rules };
    }
    return JSON.stringify(out);
  })()`),
);

const shapeCounts = JSON.parse(
  await evaluate(`(() => {
    const out = {};
    for (const name of ['front', 'back']) {
      const svg = document.querySelector('.face.' + name + ' svg');
      out[name] = {};
      for (const tag of ['text', 'path', 'rect', 'circle', 'g', 'image', 'use'])
        out[name][tag] = svg.querySelectorAll(tag).length;
    }
    return JSON.stringify(out);
  })()`),
);

// catch the Blob the page hands to the download link instead of downloading it
const grab = async () =>
  JSON.parse(
    await evaluate(`(async () => {
      if (!window.__origCreate) {
        window.__origCreate = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (b) => {
          window.__cap = b;
          return window.__origCreate(b);
        };
      }
      window.__cap = null;
      document.getElementById('dl').click();
      if (!window.__cap) return JSON.stringify({ error: 'the save button produced no file' });
      return JSON.stringify({ text: await new Response(window.__cap).text() });
    })()`),
  );

const problems = [];
const exports = {};
const screens = {};
const rects = {};
const diffs = {};

/* The plate has to be the picture. Everything above asks questions of the
   bytes; this asks the only question that matters, which is what the file
   looks like. The face on the card is photographed, the file is opened in a
   browser and photographed at the same size, and the two images are compared
   pixel by pixel. A gradient defined in the other face, a rule scoped to
   `.face` that travels into the file and then matches nothing there, a font
   inherited from an element the export did not copy — none of those show up
   in a shape count, and all of them show up here.

   The laminate is switched off first. It is an effect on the card, not part
   of the artwork, and it is not in the file by design; photographing the face
   with it on would compare a picture against a picture of a picture. */
await evaluate(`document.querySelector('.foil').style.display = 'none'`);
await new Promise((r) => setTimeout(r, 200));
for (const face of ['front', 'back']) {
  // the export is the face you are looking at, so the face has to be turned
  // over before the second file is asked for
  if (face === 'back') {
    await evaluate(`document.getElementById('flip').click()`);
    await new Promise((r) => setTimeout(r, 1600));
  }
  const got = await grab();
  if (got.error) {
    problems.push(`${face}: ${got.error}`);
    continue;
  }
  exports[face] = got.text;
  const svg = got.text;

  const rect = JSON.parse(
    await evaluate(
      `JSON.stringify(document.querySelector('.face.${face} svg').getBoundingClientRect())`,
    ),
  );
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    // at the page's own scale, not zoomed in: a clipped screenshot of a
    // composited layer is resampled, and the resampling, not the artwork, is
    // what dominates the difference at 1.28×
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 },
  });
  screens[face] = Buffer.from(shot.data, 'base64');
  rects[face] = rect;

  if (!svg.startsWith('<?xml'))
    problems.push(`${face}: the file does not start with an XML declaration`);
  const root = /<svg\b[^>]*>/.exec(svg);
  if (!root) problems.push(`${face}: no <svg> root`);
  else {
    for (const attr of ['xmlns=', 'viewBox=', 'width=', 'height='])
      if (!root[0].includes(attr))
        problems.push(`${face}: the root <svg> has no ${attr.slice(0, -1)}`);
  }
  if (!/<title\b/.test(svg)) problems.push(`${face}: the exported plate has no <title>`);
  if (!/<desc\b/.test(svg)) problems.push(`${face}: the exported plate has no <desc>`);

  for (const p of pathProblems(svg)) problems.push(`${face}: ${p.message} (offset ${p.index})`);
  for (const r of danglingRefs(svg)) problems.push(`${face}: ${r.message} (offset ${r.index})`);

  for (const rule of classRules[face].rules)
    if (!svg.includes(rule))
      problems.push(`${face}: the file drops a rule its own marks ask for — ${rule.slice(0, 90)}`);

  const counts = {};
  for (const tag of ['text', 'path', 'rect', 'circle', 'g', 'image', 'use']) {
    const want = shapeCounts[face][tag];
    const have = (svg.match(new RegExp(`<${tag}[\\s>/]`, 'g')) || []).length;
    counts[tag] = have;
    if (have !== want)
      problems.push(`${face}: the file has ${have} <${tag}>, the screen has ${want}`);
  }
}

// and the file has to open: a browser that cannot parse it says so, and this
// is the only place anyone reads what it says
for (const [face, svg] of Object.entries(exports)) {
  const before = exceptions.length + consoleErrors.length;
  const url = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 900));
  // The plate carries its animation rules and runs them when it is opened;
  // the page was photographed with motion forced off. Comparing those two
  // would compare a picture against a picture of a picture mid-turn — the ray
  // field alone is 17% of the pixels out. So the file is put into the same
  // rest state the page is in before either is photographed.
  await evaluate(`(() => {
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = '* { animation: none !important }';
    document.documentElement.appendChild(st);
    return 1;
  })()`);
  await new Promise((r) => setTimeout(r, 300));
  const loaded = JSON.parse(
    await evaluate(`JSON.stringify({
      root: document.documentElement.tagName,
      shapes: document.querySelectorAll('*').length,
      painted: document.querySelectorAll('path,rect,circle,text').length,
    })`),
  );
  if (loaded.root !== 'svg')
    problems.push(`${face}: the file opens as <${loaded.root}>, not <svg>`);
  if (loaded.painted < 50) problems.push(`${face}: the file paints only ${loaded.painted} marks`);
  const raised = exceptions.length + consoleErrors.length - before;
  if (raised)
    problems.push(
      `${face}: a browser opening the file complains ${raised} time(s): ${(exceptions.at(-1) || consoleErrors.at(-1) || '').slice(0, 160)}`,
    );

  // the same file, photographed. the exported plate is 1800×1200, so the
  // viewport is made that size and the clip is scaled down to the 1200×800
  // the face on the card was photographed at
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1800,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 400));
  const file = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 1800, height: 1200, scale: rects[face].width / 1800 },
  });
  const diff = comparePng(
    downsample(decodePng(screens[face]), 4),
    downsample(decodePng(Buffer.from(file.data, 'base64')), 4),
    24,
  );
  if (diff.error) problems.push(`${face}: cannot compare the plate — ${diff.error}`);
  else {
    diffs[face] = diff;
    if (diff.pctOver > 1)
      problems.push(
        `${face}: the plate differs from the card — ${diff.pctOver}% of pixels by more than 24/255, worst ${diff.worst} at ${diff.worstAt}`,
      );
  }
}

if (exceptions.length)
  problems.push(`${exceptions.length} page exception(s): ${exceptions.join(' | ')}`);

close();

if (problems.length) {
  console.error(`test-export: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `test-export: both faces exported — ${exports.front.length} + ${exports.back.length} bytes, ` +
    `${classRules.front.rules.length}/${classRules.back.rules.length} class rules and matching shape counts intact, ` +
    `both open clean, and the plates are the pictures: front ${diffs.front?.pctDiffering}% of pixels ` +
    `differ by any amount and ${diffs.front?.pctOver}% by more than 24/255 (worst ${diffs.front?.worst}), ` +
    `back ${diffs.back?.pctDiffering}% / ${diffs.back?.pctOver}% (worst ${diffs.back?.worst})`,
);
