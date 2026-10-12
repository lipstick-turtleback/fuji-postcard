/* Four petals lying on the lake.

 * Each has two motions, and they are written apart on purpose. `dur`/`delay`
 * are the bob: the petal and the short shadow under it rising and falling
 * against a surface that is moving, by `rise` units and over `tilt` degrees,
 * and carried `set` units along as it does. `drift`/`driftDur`/`driftDelay` are
 * the petal going somewhere: a blossom that has come down on a lake and stays
 * in one place for the whole time anybody is looking is not floating, it is
 * stuck.
 *
 * The numbers used to be right about distance and wrong about time, and the
 * page looked like nothing was moving. The four petals travelled 9, 7, 12 and
 * 10 units — a hand's width, plenty — over 73, 101, 109 and 139 seconds, which
 * is 0.07 to 0.13 of a CSS pixel a second at the size this card is drawn: four
 * to eight pixels in a minute of watching. The comment beside the keyframe used
 * to say the period was "longer than anybody will watch" as if that were a
 * virtue. It is not. Motion below the rate the eye can pick up is not gentle,
 * it is absent, and the only thing the long period bought was a number nobody
 * could see. What matters is not how far a petal goes or how long it takes but
 * how fast it goes, and a floating thing should move at a few tenths of a
 * pixel a second — slow enough to be calm, quick enough to be seen.
 *
 * So the distances are the same order and the periods are a third of what they
 * were. The four now run 0.27 to 0.49 units a second: 16 units in 38.2 s, 14 in
 * 43, 14 in 51.9, 16 in 32.5. The bobs, which were 11 to 23.5 s, are 5.5 to 8.8
 * — a petal that rises and falls twice in fifteen seconds is a petal on water,
 * and one that takes twenty-three is a petal glued to a board.
 *
 * The periods are still not free picks. The page moves on both tiers — the mist
 * at 78 and 103, the far birds at rest at 67, 89 and 113, the reflection at 39,
 * the open water at 61, the crests at 17, 19, 21, 23, 24, 25, 29 and 31, the
 * man poling at 7.5, the heron at 37, the fish at 97, 127 and 179, the ten
 * petals falling at 23 to 59 and their slides at 21.7 to 43.9, the plants' sway
 * at 13.7 to 29.3 — and the rhythm probe compares any two marks within a hand's
 * width of each other: they may not share a period, come within one percent of
 * one, or stand at a whole multiple. Four drifts, four bobs and four water
 * lines went in at once, so they were picked against each other as well as
 * against everything already on the page, and each new clock is kept eight
 * percent away from every other new clock in its own family even where the
 * distance would have allowed a share. The tightest of the results is the nearer
 * duck's drift, which lands 1.3 percent away from a neighbour, and the wake's at
 * 3.8; the roomiest is the first petal's bob at 66 percent. None of them is a
 * whole multiple of anything within reach, which is the part a list of primes
 * cannot buy you.
 *
 * The four water lines the comment above has been promising since the petals
 * were first timed are now drawn: two shallow arcs above each petal, on their
 * own drift group, going the same way the petal goes but at four fifths of its
 * distance and on a longer clock. A petal alone on a flat lake is a sticker; the
 * arcs say the surface under it is water and that the petal is the slowest thing
 * in its own little patch of it. They are siblings of the petal's drift group,
 * never children of the bobbing one, because the water a petal disturbs does not
 * rise and fall with the petal — it is left behind. */
export const petals = [
  {
    x: 238, y: 524, rx: 5, ry: 1.7, w: 13,
    dur: 5.5, delay: -2, rise: 2.2, set: 0.9, tilt: 3,
    drift: 16, driftDy: 1.5, driftDur: 38.2, driftDelay: -11,
    line: { dx: 11, dy: 1.2, dur: 46, delay: -14, w: 20, ys: [519, 515] },
  },
  {
    x: 412, y: 536, rx: 4.4, ry: 1.5, w: 12,
    dur: 6, delay: -3.5, rise: 1.9, set: -0.7, tilt: 2.2,
    drift: -14, driftDy: -1, driftDur: 43, driftDelay: -20,
    line: { dx: -10, dy: -0.8, dur: 54.1, delay: -27, w: 19, ys: [531, 527] },
  },
  {
    x: 540, y: 520, rx: 3.8, ry: 1.3, w: 11,
    dur: 8.8, delay: -4, rise: 2.6, set: 1.2, tilt: 3.4,
    drift: 14, driftDy: 2, driftDur: 51.9, driftDelay: -6,
    line: { dx: 10, dy: 1.6, dur: 71, delay: -19, w: 17, ys: [515, 511] },
  },
  {
    x: 668, y: 534, rx: 4.6, ry: 1.6, w: 13,
    dur: 6.6, delay: -5, rise: 1.8, set: -0.8, tilt: 1.8,
    drift: -16, driftDy: -1.5, driftDur: 32.5, driftDelay: -9,
    line: { dx: -12, dy: -1.2, dur: 81.3, delay: -33, w: 20, ys: [529, 525] },
  },
];
