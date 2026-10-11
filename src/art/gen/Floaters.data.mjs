/* Four petals lying on the lake.

 * Each has two motions, and they are written apart on purpose. `dur`/`delay`
 * are the bob: the petal and the short shadow under it rising and falling
 * against a surface that is moving. `drift`/`driftDur`/`driftDelay` are the
 * petal going somewhere: a blossom that has come down on a lake and stays in
 * one place for the whole time anybody is looking is not floating, it is
 * stuck. The travel is a hand's width over a minute or more, in whatever
 * direction the air happens to be going, which is why two of them go left.

 * The four drift periods are 73, 101, 109 and 139. They are not primes picked
 * out of a list; they are what survived a subtraction. The page already moves
 * on both tiers — 78 and 103 (the mist), 67, 89 and 113 (the far birds at
 * rest), 39 (the reflection), 61 (the open water), 17, 19, 21, 23, 24, 25, 29
 * and 31 (the crests), 13 (the hull), 7.5 (the man poling), 37 (the heron),
 * 97, 127 and 179 (the fish), 71, 83 and 97 (the petals still falling), 8.3
 * and 11.9 (the ducks), 11, 13.5, 17.5 and 23.5 (the bob these same four
 * petals already carry) — and with the laminate on, 46, 62 and 38 (the
 * clouds), 150 (the rays), 9 (the glow), 31.9, 43.7 and 39 (the birds
 * crossing), 6.5 (the hull again), and the plants' sway at 13.7, 15.1, 16.3,
 * 19.7, 22.7 and 29.3. A period is no good if it equals one of those or is an
 * integer multiple of one of them to within a percent, because the eye
 * compares neighbours and the rhythm probe compares them at a distance.
 *
 * Four of the picks that looked obvious are here as the reason they are not:
 * 67 and 89 are the birds, and the probe caught them across two hundred units
 * of open sky and water; 107 and 71 are nine and six times the duck's 11.9 to
 * within a percent; 103 is the mist; 137 is ten times the nearest reed's
 * 13.7. What is left is less elegant and works. */
export const petals = [
  { x: 238, y: 524, rx: 5, ry: 1.7, w: 13, dur: 11, delay: -2, drift: 9, driftDy: 1.5, driftDur: 73, driftDelay: -23 },
  { x: 412, y: 536, rx: 4.4, ry: 1.5, w: 12, dur: 13.5, delay: -9, drift: -7, driftDy: -1, driftDur: 101, driftDelay: -51 },
  { x: 540, y: 520, rx: 3.8, ry: 1.3, w: 11, dur: 17.5, delay: -4, drift: 12, driftDy: 2, driftDur: 109, driftDelay: -8 },
  { x: 668, y: 534, rx: 4.6, ry: 1.6, w: 13, dur: 23.5, delay: -15, drift: -10, driftDy: -1.5, driftDur: 139, driftDelay: -66 },
];
