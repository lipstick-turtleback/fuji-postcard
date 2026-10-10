#!/usr/bin/env node
/* Verify the composition without listening to it.

   The score is a module — src/script/sound/score.mjs — so this file imports
   it and asks it questions. It used to have to cut the score out of the
   soundtrack's IIFE, between two string sentinels, and evaluate the fragment
   in a bare vm, because that was the only way to reach data that lived inside
   a function. A test written that way breaks when a comment moves, and it
   tests a copy of the score rather than the one the page runs.

   What this catches is the kind of mistake that is silent in the browser and
   only ever heard: a step index off the end of the scale, a note that starts
   past the end of its bar, two notes of the same voice overlapping, a phrase
   that is not eight bars, a piece that is not the length the README claims.

     node scripts/test-score.mjs
 */
import { BAR, BARS, BPM, NBARS, PHRASES, SCALE, TOUCH } from '../src/script/sound/score.mjs';

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

/* Rule 2 belongs to the audio as much as to the light. A bar that comes
   back at the same distance every time is a loop a listener can count, and
   the countability is what makes it a loop rather than a piece. */
const where = new Map();
for (const [i, b] of BARS.entries()) {
  const k = b.notes.map((n) => `${n.m}.${n.b}`).join(' ');
  if (!k) continue;
  if (!where.has(k)) where.set(k, []);
  where.get(k).push(i);
}
for (const [k, v] of where) {
  if (v.length < 3) continue;
  const gaps = new Set(v.slice(1).map((x, j) => x - v[j]));
  if (gaps.size === 1)
    fail(`the bar "${k}" recurs at bars ${v.join(', ')} — every ${[...gaps][0]} bars`);
}
const seenPhrase = new Set();
for (const [i, ph] of PHRASES.entries()) {
  const k = ph.bars.join('|');
  if (seenPhrase.has(k)) fail(`phrase ${i + 1} is a copy of an earlier phrase`);
  seenPhrase.add(k);
}

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
