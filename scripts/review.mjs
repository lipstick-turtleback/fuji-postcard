#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
/* One drawable, photographed and measured, with the review prompt printed around
 * it. See docs/drawable-review.md for the rubric this feeds.
 *
 *   node scripts/review.mjs duck --selector '.duck' --zoom 8
 *   node scripts/review.mjs boat --box 588,462,86,70 --zoom 6
 *   node scripts/review.mjs gate --box 160,300,140,240 --zoom 4 --back
 *
 * Motion is parked at a fixed fraction of every animation's own period, so two
 * runs of the same command photograph the same picture; --live leaves it running.
 * A selector that lands inside <defs> is followed to the <use> sites that draw
 * it, because a mark defined in the cast has no place on the card until it is
 * used, and reviewing the definition instead of the drawing is how a duck that
 * is 21 units wide on the page gets reviewed as a path with no width at all.
 */
import { openPage, silentPage } from './cdp.mjs';

const argv = process.argv.slice(2);
const NAMED = ['--selector', '--box', '--zoom', '--out'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !NAMED.includes(argv[i - 1]));
const name = positional[0];
const flag = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  if (hit) return hit.slice(k.length + 3);
  const i = argv.indexOf(`--${k}`);
  if (i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return d;
};
const has = (k) => argv.includes(`--${k}`);

if (!name || (!flag('selector') && !flag('box'))) {
  console.error(
    'usage: node scripts/review.mjs <name> (--selector sel | --box x,y,w,h) [--zoom n] [--back] [--live] [--out path]',
  );
  process.exit(2);
}

const zoom = parseFloat(flag('zoom', '6'));
const out = flag('out', `/tmp/review-${name}.png`);
const face = has('back') ? '.face.back' : '.face.front';
const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);

const page = await openPage({ port: 9412, userDataDir: '/tmp/fuji-review' });
await page.send('Page.enable');
await page.send('Emulation.setDeviceMetricsOverride', {
  width: 1400,
  height: 900,
  deviceScaleFactor: 2,
  mobile: false,
});
await page.send('Page.navigate', { url: PAGE });
await new Promise((r) => setTimeout(r, 2200));

if (!has('live')) {
  await page.evaluate(`(() => {
    for (const a of document.getAnimations()) {
      if (!a.effect) continue;
      const d = a.effect.getTiming().duration;
      if (typeof d !== 'number' || !d) continue;
      a.pause();
      a.currentTime = 0.3 * d;
    }
  })()`);
}

const facts = JSON.parse(
  await page.evaluate(`(() => {
    const svg = document.querySelector(${JSON.stringify(face)} + ' svg');
    const box = svg.getBoundingClientRect();
    const k = box.width / svg.viewBox.baseVal.width;
    const units = (r) => ({ x: (r.x - box.x) / k, y: (r.y - box.y) / k, w: r.width / k, h: r.height / k });

    // Resolve the target to the elements that actually draw it.
    const sel = ${JSON.stringify(flag('selector', ''))};
    let els = sel ? [...document.querySelectorAll(${JSON.stringify(face)} + ' ' + sel)] : [];
    els = els.filter((e) => !e.closest('defs'));
    if (sel && !els.length) {
      const id = sel.replace(/^#/, '');
      if (document.getElementById(id)) els = [...document.querySelectorAll('use[href="#' + id + '"]')];
    }
    const boxArg = ${JSON.stringify(flag('box', ''))};
    let region;
    if (boxArg) {
      const [x, y, w, h] = boxArg.split(',').map(Number);
      region = { x, y, w, h };
    } else if (els.length) {
      const rs = els.map((e) => e.getBoundingClientRect());
      const u = units({
        x: Math.min(...rs.map((r) => r.x)),
        y: Math.min(...rs.map((r) => r.y)),
        width: Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.x)),
        height: Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.y)),
      });
      region = { x: u.x - 2, y: u.y - 2, w: u.w + 4, h: u.h + 4 };
    } else {
      return JSON.stringify({ error: 'nothing matched' });
    }

    const centre = { x: region.x + region.w / 2, y: region.y + region.h / 2 };
    // The group the drawable lives in, or — when the target was given as a
    // region rather than a selector — everything whose centre falls in it.
    const inside = (e) => {
      const r = e.getBoundingClientRect();
      const cx = (r.x + r.width / 2 - box.x) / k;
      const cy = (r.y + r.height / 2 - box.y) / k;
      return cx >= region.x && cx <= region.x + region.w && cy >= region.y && cy <= region.y + region.h;
    };
    const holder = els.length ? els[0].closest('g') || els[0] : null;
    const subtree = holder ? [...holder.querySelectorAll('*')] : [...document.querySelectorAll(${JSON.stringify(face)} + ' svg *')].filter(inside);
    const shapes = subtree.filter((e) => /^(path|circle|ellipse|rect|line|polygon|polyline|use)$/.test(e.tagName));
    const fills = new Map();
    for (const s of shapes) {
      const cs = getComputedStyle(s);
      const key = [cs.fill, cs.stroke, cs.strokeWidth, cs.opacity, cs.strokeOpacity].join(' / ');
      fills.set(key, (fills.get(key) || 0) + 1);
    }
    // A shape with no area is only a defect if nothing is drawn along it: a
    // horizontal ripple is a line with a zero-height box and is exactly what it
    // claims to be.
    const flat = shapes
      .filter((s) => {
        if (!('getBBox' in s)) return false;
        const b = s.getBBox();
        if (b.width && b.height) return false;
        const cs = getComputedStyle(s);
        return cs.stroke === 'none' || cs.strokeWidth === '0px';
      })
      .map((s) => s.tagName + (s.getAttribute('class') ? '.' + s.getAttribute('class') : ''));

    // Every animated mark in the region, with the rate it actually moves at.
    const moving = [];
    for (const el of document.querySelectorAll(${JSON.stringify(face)} + ' svg *')) {
      const cs = getComputedStyle(el);
      if (cs.animationName === 'none' || cs.animationDuration === '0s') continue;
      const own = el.getAnimations().filter((a) => a.effect && a.effect.target === el);
      if (!own.length) continue;
      const dur = parseFloat(cs.animationDuration);
      const xs = [];
      const ys = [];
      const keep = own.map((a) => a.currentTime);
      for (let j = 0; j <= 24; j++) {
        for (const a of own) a.currentTime = (j / 24) * 2 * dur * 1000;
        const r = el.getBoundingClientRect();
        xs.push(r.x);
        ys.push(r.y);
      }
      for (const [i, a] of own.entries()) a.currentTime = keep[i];
      const span = (a) => (Math.max(...a) - Math.min(...a)) / k;
      const u = Math.hypot(span(xs), span(ys));
      const r = el.getBoundingClientRect();
      const c = { x: (r.x + r.width / 2 - box.x) / k, y: (r.y + r.height / 2 - box.y) / k };
      moving.push({
        cls: (el.getAttribute('class') || el.tagName) + '',
        name: cs.animationName,
        dur,
        delay: cs.animationDelay,
        u: +u.toFixed(2),
        perSec: +(u / dur).toFixed(3),
        pxSec: +((u * k) / dur).toFixed(3),
        inRegion: c.x >= region.x && c.x <= region.x + region.w && c.y >= region.y && c.y <= region.y + region.h,
        dist: Math.round(Math.hypot(c.x - centre.x, c.y - centre.y)),
      });
    }
    return JSON.stringify({
      k: +k.toFixed(3),
      region,
      drawn: els.length,
      shapes: shapes.length,
      fills: [...fills.entries()].sort((a, b) => b[1] - a[1]),
      flat,
      mine: moving.filter((m) => m.inRegion),
      near: moving.filter((m) => !m.inRegion && m.dist <= 120).sort((a, b) => a.dist - b.dist).slice(0, 10),
    });
  })()`),
);

if (facts.error) {
  console.error(`review: ${facts.error}`);
  process.exit(1);
}

const c = JSON.parse(
  await page.evaluate(
    `(() => { const s = document.querySelector(${JSON.stringify(face)} + ' svg'); const b = s.getBoundingClientRect(); const k = b.width / s.viewBox.baseVal.width; return JSON.stringify({ x: b.x + ${facts.region.x} * k, y: b.y + ${facts.region.y} * k, width: ${facts.region.w} * k, height: ${facts.region.h} * k }); })()`,
  ),
);
const shot = await page.send('Page.captureScreenshot', {
  format: 'png',
  clip: { ...c, scale: zoom },
  captureBeyondViewport: true,
});
writeFileSync(out, Buffer.from(shot.data, 'base64'));
await page.close();

const line = (m) =>
  `    ${m.cls.padEnd(16)} ${m.name.padEnd(16)} ${String(m.dur).padStart(6)}s  delay ${m.delay.padStart(6)}  travel ${String(m.u).padStart(6)} u  ${String(m.perSec).padStart(6)} u/s  ${String(m.pxSec).padStart(6)} css px/s  ${m.dist} u away`;

console.log(`review: ${name} — ${out}`);
console.log(
  `  region ${facts.region.x.toFixed(0)},${facts.region.y.toFixed(0)} ${facts.region.w.toFixed(0)}×${facts.region.h.toFixed(0)} u at ${zoom}× · ${facts.k} css px per unit · ${facts.drawn} drawn instance(s) · ${facts.shapes} shapes`,
);
console.log('  paints:');
for (const [k, n] of facts.fills.slice(0, 6)) console.log(`    ${String(n).padStart(3)} × ${k}`);
if (facts.flat.length) console.log(`  shapes with no area: ${facts.flat.join(', ')}`);
console.log('  moving inside the region:');
for (const m of facts.mine) console.log(line(m));
if (!facts.mine.length) console.log('    nothing — this drawable does not move at all');
console.log('  animated marks within 120 u (the rhythm rule compares these):');
for (const m of facts.near) console.log(line(m));
