#!/usr/bin/env node
/* Verify the composition without listening to it.

   The score lives inside the soundtrack IIFE, so it cannot be imported.
   It can, however, be lifted out and evaluated on its own: the region
   between the two sentinels below is plain data and plain arithmetic —
   no DOM, no Web Audio — so it runs in a bare vm context.

   What this catches is the kind of mistake that is silent in the browser
   and only ever heard: a step index off the end of the scale, a note that
   starts past the end of its bar, two notes of the same voice overlapping,
   a phrase that is not eight bars, a piece that is not the length the
   README claims.

     node scripts/test-score.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'script', 'soundtrack.js'), 'utf8');

const START = 'const BPM = 66;';
const END = 'const NBARS = BARS.length;';
const a = src.indexOf(START);
const b = src.indexOf(END);
if (a < 0 || b < 0) {
  console.error('test-score: sentinels not found in soundtrack.js — the score region moved');
  process.exit(1);
}

const box = { SCALE: null, BARS: null, PHRASES: null };
const context = vm.createContext(box);
vm.runInContext(
  `${src.slice(a, b + END.length)}\nObject.assign(this, { BPM, BEAT, BAR, SCALE, TOUCH, PHRASES, BARS, NBARS });`,
  context,
);

const { BPM, BAR, SCALE, TOUCH, PHRASES, BARS, NBARS } = box;
const problems = [];
const fail = (m) => problems.push(m);

/* ---- the form ---------------------------------------------------------- */
if (NBARS !== 80) fail(`${NBARS} bars, expected 80`);
if (PHRASES.length !== 10) fail(`${PHRASES.length} phrases, expected 10`);
for (const [i, ph] of PHRASES.entries())
  if (ph.bars.length !== 8) fail(`phrase ${i + 1} has ${ph.bars.length} bars, expected 8`);

const minutes = (NBARS * BAR) / 60;
if (minutes < 4.5 || minutes > 5.5) fail(`the piece runs ${minutes.toFixed(1)} min, expected ~4.8`);

/* ---- the scale is D hirajōshi ------------------------------------------ */
const HIRAJOSHI = new Set([0, 3, 5, 7, 10]); // D F G A C, in semitones from D
for (let i = 1; i < SCALE.length; i++)
  if (SCALE[i] <= SCALE[i - 1]) fail(`SCALE is not ascending at index ${i}`);
for (const m of SCALE)
  if (!HIRAJOSHI.has((((m - 38) % 12) + 12) % 12)) fail(`midi ${m} is not in D hirajōshi`);

/* ---- every note token is legal and fits its bar ------------------------ */
const steps = new Set(SCALE.map((_, i) => i));
let notes = 0;
for (const [i, bar] of BARS.entries()) {
  let prev = -1;
  for (const n of bar.notes) {
    notes++;
    if (!(n.m >= 0)) fail(`bar ${i + 1}: step "${n.m}" is not in the scale`);
    if (!(n.g > 0)) fail(`bar ${i + 1}: unknown touch`);
    if (n.b < 0 || n.b >= 4) fail(`bar ${i + 1}: note starts at beat ${n.b}, outside 0..4`);
    if (n.d <= 0) fail(`bar ${i + 1}: note has zero length`);
    // a plucked note rings on past the bar line — that is the point of the
    // instrument — but it must not be scheduled so late that it lands in
    // the middle of the bar after next
    if (n.b + n.d > 8) fail(`bar ${i + 1}: note rings for ${n.d} beats, too long`);
    // one plucked voice: it cannot be in two places at once
    if (n.b < prev) fail(`bar ${i + 1}: notes are out of time order`);
    if (n.b < prev + 1e-9) fail(`bar ${i + 1}: two notes of the same voice overlap`);
    prev = n.b;
  }
}

/* ---- it is through-composed, not a loop -------------------------------- */
const distinct = new Set(PHRASES.flatMap((ph) => ph.bars)).size;
if (distinct < 70) fail(`only ${distinct} distinct bars out of ${NBARS} — it is looping`);

/* ---- the raw tokens parse exactly as the builder reads them ------------ */
for (const ph of PHRASES)
  for (const line of ph.bars)
    for (const tok of line ? line.split(' ') : []) {
      const f = tok.split('.');
      if (f.length !== 4) fail(`token "${tok}" is not step.beat.len.touch`);
      if (!steps.has(+f[0])) fail(`token "${tok}": step ${f[0]} is out of range`);
      if (!Number.isInteger(+f[1]) || !Number.isInteger(+f[2]))
        fail(`token "${tok}": beat and length must be whole half-beats`);
      if (!(f[3] in TOUCH)) fail(`token "${tok}": unknown touch "${f[3]}"`);
    }

if (problems.length) {
  console.error(`test-score: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `test-score: ${NBARS} bars · ${PHRASES.length} phrases · ${notes} notes · ` +
    `${distinct} distinct · ${minutes.toFixed(2)} min at ${BPM} bpm — no problems`,
);
