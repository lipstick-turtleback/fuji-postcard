/* Four petals lying on the lake, and the four periods they bob on. None of
 * them shares a factor with the ripples off the boat three units to the right
 * (17, 19, 25 s), which is the only reason they are not simply the nearest
 * primes: the eye compares neighbours, not the whole page. */
export const petals = [
  { x: 238, y: 524, rx: 5, ry: 1.7, w: 13, dur: 11, delay: -2 },
  { x: 412, y: 536, rx: 4.4, ry: 1.5, w: 12, dur: 13.5, delay: -9 },
  { x: 540, y: 520, rx: 3.8, ry: 1.3, w: 11, dur: 17.5, delay: -4 },
  { x: 668, y: 534, rx: 4.6, ry: 1.6, w: 13, dur: 23.5, delay: -15 },
];
