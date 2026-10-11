/* Where the birds are and how far off they are: stroke weight and opacity
 * fall with distance, which is why the smallest bird is also the faintest.
 *
 * `dx` and `dy` are how far each one drifts across the sky in still air, over
 * its own period. They used to be one shared 2 units, which passed every check
 * that only asks whether a mark is animated: 2 units over 67 seconds is 0.03
 * units a second, and a bird 20 units wide on a 900-unit card does not visibly
 * move at that rate. Six units over the same minute is still slow enough that
 * you never see it go, and you do come back and find it somewhere else, which
 * is the only way a far bird on a still morning is ever noticed at all.
 *
 * The three distances differ because the three birds are not on one heading.
 * The higher bird is further off and covers less of the picture for the same
 * wind. */
export const birds = [
  { h: 'birdA', cls: 'bird', x: 300, y: 151, w: 1.8, opacity: 0.75, dx: 6.2, dy: -2.4 },
  { h: 'birdB', cls: 'bird b2', x: 356, y: 128, w: 1.6, opacity: 0.6, dx: 5.4, dy: -2.1 },
  { h: 'birdC', cls: 'bird b3', x: 262, y: 187, w: 1.4, opacity: 0.5, dx: 7, dy: -2.9 },
];
