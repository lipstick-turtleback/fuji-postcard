#!/usr/bin/env node
/* Nothing in the cast may be the same mark twice.

   The complaint that started the generated parts was that the shore looked
   like one plant copied along it. The fix was thirteen reusable shapes and a
   data file that skews, scales and rotates each placement — and the fix held,
   but nothing kept it. A placement added by copy-paste ten units to the right
   of its twin would have gone in unnoticed, and from the front it reads
   exactly as it did before: a copy.

   So the data is asked a question with a yes/no answer. Two marks of one shape
   that are close together have to be visibly different — a rotation of at
   least 5°, a scale of at least 0.08, a skew of at least 4°, any one of them.
   Two marks of one shape in the same place are a bug whatever their transform
   says. And no two placements anywhere in the cast may share a shape and a
   transform, because that is what a copy-paste leaves behind.

   What this does not do is judge the picture. A reed on the left shore and the
   same reed, at nearly the same scale, on the right shore are 778 units apart
   and nobody has ever noticed; distance is the whole of the rule, and the
   threshold is a hand's width in the artwork's own units.

     node scripts/test-cast.mjs

   No browser: this reads the data the build renders. */
import { birds } from '../src/art/gen/Birds.data.mjs';
import { ducks } from '../src/art/gen/Ducks.data.mjs';
import { rises } from '../src/art/gen/Fish.data.mjs';
import { petals as floaters } from '../src/art/gen/Floaters.data.mjs';
import { herons } from '../src/art/gen/Heron.data.mjs';
import { petals } from '../src/art/gen/Petals.data.mjs';
import { stands } from '../src/art/gen/Plants.data.mjs';

/* Everything the cast places, in one shape: which mark, where, and how it is
   turned. A field that a part does not use is simply absent, and absent means
   the identity transform, which is what the build renders. */
const placed = [
  ...stands.flatMap((s) => s.items.map((p) => ({ group: s.sway || 'static', ...p }))),
  ...birds.map((p) => ({ group: 'bird', ...p })),
  ...ducks.map((p) => ({ group: 'duck', ...p })),
  ...herons.map((p) => ({ group: 'wader', ...p })),
  ...rises.map((p) => ({ group: 'fish', ...p })),
  ...floaters.map((p, i) => ({ group: 'floater', h: `ellipse${i + 1}`, ...p })),
  ...petals.map((p) => ({ group: 'petal', h: `petal${p.n}`, ...p })),
];

const num = (v) => (v === undefined || v === null ? 0 : v);
const scale = (v) => (v === undefined || v === null ? 1 : v);

const problems = [];

/* 1. Two marks of one shape in one place. */
for (let i = 0; i < placed.length; i++)
  for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i],
      b = placed[j];
    if (a.h !== b.h) continue;
    const d = Math.hypot(num(a.x) - num(b.x), num(a.y) - num(b.y));
    if (d < 1)
      problems.push(`${a.h} placed twice in the same spot (${a.x},${a.y}) and (${b.x},${b.y})`);
  }

/* 2. Two marks of one shape within a hand's width that are not visibly
      different. 40 units is about 4% of the plate's width; at that distance a
      shared transform is legible as a copy. */
const NEAR = 40;
for (let i = 0; i < placed.length; i++)
  for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i],
      b = placed[j];
    if (a.h !== b.h) continue;
    const d = Math.hypot(num(a.x) - num(b.x), num(a.y) - num(b.y));
    if (d >= NEAR) continue;
    const dRot = Math.abs(num(a.rot) - num(b.rot));
    const dSkew = Math.abs(num(a.skew) - num(b.skew));
    const dScale = Math.max(
      Math.abs(scale(a.sx) - scale(b.sx)),
      Math.abs(scale(a.sy) - scale(b.sy)),
    );
    if (dRot < 5 && dSkew < 4 && dScale < 0.08)
      problems.push(
        `${a.h} at (${a.x},${a.y}) and (${b.x},${b.y}) are ${d.toFixed(
          1,
        )} units apart with the same transform — rot Δ ${dRot.toFixed(1)}°, scale Δ ${dScale.toFixed(
          2,
        )}, skew Δ ${dSkew.toFixed(1)}`,
      );
  }

/* 3. A shape and a transform used twice anywhere on the card. */
const seen = new Map();
for (const p of placed) {
  if (!p.h) continue;
  const sig = [p.h, num(p.rot), num(p.skew), scale(p.sx), scale(p.sy)].join('|');
  if (seen.has(sig))
    problems.push(
      `${p.h} carries the same transform as the one at (${seen.get(sig).x},${seen.get(sig).y}) — (${p.x},${p.y}) is a copy, not a placement`,
    );
  else seen.set(sig, p);
}

const shapes = new Set(placed.map((p) => p.h).filter(Boolean));
if (problems.length) {
  console.error(`test-cast: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `test-cast: ${placed.length} placements of ${shapes.size} shapes — no mark is the same mark twice`,
);
