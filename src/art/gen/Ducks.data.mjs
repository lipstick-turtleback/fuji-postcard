/* Two ducks in open water, between the gate and the boatman, where the lake
 * is widest. They used to sit hard against the torii's right post, which made
 * them look like part of the gate. Each carries its own period and phase: eight
 * units apart, they would read as one duck and her reflection on any period they
 * shared.
 *
 * 8.5 and 11.5 were the first numbers written down, and they were wrong in a
 * way nothing could see while the ducks were drawn at the origin of the picture
 * by a bug: they are exactly half of two of the ripple crests (17 and 23
 * seconds), which are a hand's width away. Two marks keeping step at a 2:1 ratio
 * are as countable as two marks on the same period.
 *
 * `rise`/`set`/`tilt` is the swell passing under the bird. The bob used to be
 * 0.2 by 0.4 of a unit, the same for both ducks — under half a pixel at the size
 * the card is drawn, so two birds written as floating were rendered as bolted
 * down, which is the defect the petals on the water were fixed for and these
 * were left behind. The nearer bird rides the bigger swell. The farther one's
 * numbers are smaller in roughly the ratio of its scale, because the bob lives
 * on the group and the scale lives on the placement attribute, and a CSS
 * transform does not compose with an attribute: the depth has to be carried in
 * the numbers themselves.
 *
 * `drift`/`driftDur`/`driftDelay` is the duck going somewhere, on the same
 * keyframe the petals lying on the water use. A duck that sits at one point for
 * the whole time anybody is looking is not swimming, it is a bracket. The smear
 * the water keeps of it rides in the same group, because a floating body whose
 * reflection stayed behind would be the first wrong thing anybody noticed — and
 * the ring the bird leaves does not: it is water, and it travels less than the
 * bird that made it. That difference, between a mark attached to a floating body
 * and a mark the body leaves behind, is the reason the two drifts are not one.
 *
 * The two birds used to swim 9 and 11 units down the lake over 133.6 and 149.9
 * seconds. That is 0.07 of a CSS pixel a second: four pixels in a minute, and
 * the birds were invisible in motion however carefully the periods had been
 * chosen. They now cover 18 and 24 units — about their own body length, which is
 * the measure a swimming duck is actually judged by — in 57.9 and 46.8 seconds,
 * and the rings they leave run 12 and 16 units on the longer clocks of 84.1 and
 * 95.6, so the water stays behind the bird that made it.
 *
 * The farther bird has also moved 22 units right, from 418 to 440. Both birds
 * face right and both now travel right, and at the old spacing the nearer one
 * could only have gone eight units before it was sitting inside the farther
 * one's body: a duck's own width is 21 units and their bodies were 8 apart. The
 * gap is 12 units at the closest they ever come, which is what it takes for two
 * birds to swim the same way without bumping.
 *
 * The bird's own shape was redrawn. The mark was an egg with a ball on the end
 * and a wedge for a bill: no breast, no stern, no waterline, and the bottom of
 * the body as round as the top, which is how a duck looks only when it is
 * sitting on a table. The new outline is cut flat along the bottom where the lake
 * hides it, takes its full curve at the breast, and finishes in a tail cocked
 * above the back line. The head is drawn into the neck rather than being a second
 * circle, because two overlapping round shapes leave a pinch where a bird has one
 * line from bill to back.
 *
 * The smear each bird leaves is no longer one ellipse. A reflection on water is a
 * shape breaking up, and the boat has always been drawn that way — three widths,
 * the farthest the narrowest — while the ducks, the two smallest moving things on
 * the lake, each had a single solid oval that read as a second bird lying under
 * the first. The nearer bird now has three pieces and the farther two, and the
 * small pieces are tossed further than the wide one, which is what a small piece
 * of a broken image does on a moving surface. Each bird's wake is two shallow
 * arcs instead of one straight rule: a straight line among curved water marks
 * reads as something printed, and the only straight lines on this card are the
 * address rules on the back. */
export const ducks = [
  {
    h: 'duck', x: 392, y: 519, dur: 7.2, delay: -2.5, rise: 2.1, set: 0.9, tilt: 2.4,
    drift: 18, driftDy: 1.2, driftDur: 57.9, driftDelay: -18,
    ring: { d: 'M380 525 q11 1.2 22 0', d2: 'M384 529.5 q8 0.9 16 0', dur: 15.2, delay: -6, dur2: 19.6, delay2: -11, drift: 12, driftDur: 84.1, driftDelay: -30 },
    refl: [
      { cx: 392, cy: 519, rx: 9, ry: 1.5, wob: 0.35, stretch: 0.05, rdur: 30.2, rdelay: -12 },
      { cx: 386.5, cy: 523, rx: 3.6, ry: 1.1, wob: 0.62, stretch: 0.06, rdur: 33.4, rdelay: -21 },
      { cx: 397, cy: 523.6, rx: 3, ry: 1, wob: 0.68, stretch: 0.05, rdur: 37.1, rdelay: -5 },
    ],
  },
  {
    h: 'duck', x: 440, y: 525, sx: 0.84, dur: 10.3, delay: -6, rise: 1.6, set: -0.7, tilt: 1.9,
    drift: 24, driftDy: 1.4, driftDur: 46.8, driftDelay: -12,
    ring: { d: 'M432 529 q9 1 18 0', d2: 'M436 531.5 q6 0.7 12 0', dur: 18.4, delay: -14, dur2: 16.2, delay2: -3, drift: 16, driftDur: 95.6, driftDelay: -44 },
    refl: [
      { cx: 440, cy: 524.5, rx: 7, ry: 1.3, wob: 0.42, stretch: 0.045, rdur: 41.5, rdelay: -25 },
      { cx: 444.5, cy: 527.5, rx: 3.4, ry: 1, wob: 0.66, stretch: 0.05, rdur: 48.9, rdelay: -9 },
    ],
  },
];
