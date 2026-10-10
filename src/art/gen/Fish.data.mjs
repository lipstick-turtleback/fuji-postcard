/* Where the fish are, and how long they take.

 * The periods are 97, 127 and 179 seconds: primes, none a multiple of another,
 * none of them sharing a factor with anything else on the water (the crests
 * are 17, 19, 21, 23, 24, 25, 29 and 31; the wake 19 and 25; the hull 13).
 * 131 was the number written down first, and it is 11 times the duck's 11.9 s
 * period, which is a countable relationship between a fish and a bird.
 * The negative delays put each one partway through its own period when the
 * page opens, so nobody arrives at a lake where everything starts together.
 *
 * What happens *inside* each period is in the keyframes, not here: the surface
 * holds still for most of it and the ring spreads two or three times at uneven
 * distances through it.
 *
 * The middle fish was at y 548, which is the shore. The ring spread twice a
 * minute and a quarter across a band of dry washi, and nothing in the picture
 * changed: the near shore is painted over the lake, and the mark was under it.
 * It is at y 522 now, in the water between the gate's right post and the ducks,
 * where the ring has something to move on. */
export const rises = [
  { h: 'fish', k: 'rise-a', x: 150, y: 468, sx: 1, sy: 1, dur: 97, delay: -31 },
  { h: 'fish', k: 'rise-b', x: 300, y: 522, sx: 1.25, sy: 1, rot: -4, dur: 127, delay: -74 },
  { h: 'fish', k: 'rise-c', x: 498, y: 478, sx: 0.85, sy: 1, rot: 3, dur: 179, delay: -12 },
];
