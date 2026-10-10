/* Ten petals off the branch.

 * `durOn`/`delayOn` are the shower: with the laminate on, ten petals fall in
 * 13-25 seconds, which is a gust and an event. `dur`/`delay` belong to the
 * three marked slow, and they are what falls when nobody has switched
 * anything on — the same petals, in still air, at a fifth of the speed. The
 * stylesheet picks the tier; the data only states both.
 *
 * The three slow ones are 71, 83 and 97 seconds: primes, none a multiple of
 * another, and none of them in step with the water they land near. */
export const petals = [
  { n: 1, x: 150, y: 150, rot: -24, sx: 0.92, sy: 0.78, durOn: 15, delayOn: -1 },
  { n: 2, x: 210, y: 120, rot: 58, sx: 0.85, sy: 0.6, durOn: 19, delayOn: -6, dur: 71, delay: -23, slow: true },
  { n: 3, x: 96, y: 190, rot: -71, sx: 0.9, sy: 0.9, durOn: 13, delayOn: -9 },
  { n: 4, x: 260, y: 170, rot: 13, sx: 0.75, sy: 0.5, durOn: 21, delayOn: -3 },
  { n: 5, x: 180, y: 240, rot: -41, sx: 1, sy: 0.85, durOn: 17, delayOn: -12 },
  { n: 6, x: 320, y: 130, rot: 76, sx: 0.8, sy: 0.62, durOn: 23, delayOn: -8, dur: 83, delay: -51, slow: true },
  { n: 7, x: 60, y: 260, rot: -8, sx: 0.7, sy: 0.7, durOn: 14, delayOn: -15, dur: 97, delay: -70, slow: true },
  { n: 8, x: 240, y: 280, rot: 34, sx: 0.9, sy: 0.55, durOn: 20, delayOn: -5 },
  { n: 9, x: 130, y: 320, rot: -56, sx: 0.75, sy: 0.8, durOn: 16, delayOn: -11 },
  { n: 10, x: 300, y: 240, rot: 21, sx: 0.85, sy: 0.68, durOn: 25, delayOn: -2 },
];
