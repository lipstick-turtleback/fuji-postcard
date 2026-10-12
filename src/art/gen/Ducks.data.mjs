/* Two ducks in open water, between the gate and the boatman, where the lake
 * is widest. They used to sit hard against the torii's right post, which made
 * them look like part of the gate. Each carries its own period and phase:
 * eight units apart, they would read as one duck and her reflection on any
 * period they shared.
 *
 * 8.5 and 11.5 were the first numbers written down, and they were wrong in a
 * way nothing could see while the ducks were drawn at the origin of the
 * picture by a bug: they are exactly half of two of the ripple crests (17 and
 * 23 seconds), which are a hand's width away. Two marks keeping step at a
 * 2:1 ratio are as countable as two marks on the same period.
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
 * the ring the bird leaves does not: it is water, and it runs 5 and 6 units on
 * periods longer than the bird's 9 and 11. That difference, between a mark
 * attached to a floating body and a mark the body leaves behind, is the reason
 * the two drifts are not one.
 *
 * The drift periods were picked against what the rhythm probe actually finds
 * within a hand's width of these two birds — the bobs at 8.3 and 11.9, the rings
 * at 15.2 and 18.4, a petal's bob at 13.5, the two smears at 32 and 34.6, a
 * petal drifting on 101, and two fish coming up under the surface at 127 and 179
 * — and against one another, because four new clocks went in at once. 133.6,
 * 149.9, 155.3 and 166.9 are what survived. 138.6 is four times the farther
 * smear's 34.6; 151.9 is ten times the ring's 15.2; 160.3 is five times the
 * nearer smear's 32; 161.9 is twelve times that petal's 13.5; 172.9 is five
 * times 34.6 again; 127.6 is within a percent of the fish at 127. */
export const ducks = [
  {
    h: 'duck', x: 392, y: 519, dur: 8.3, delay: -2.5, rise: 1.9, set: 0.8, tilt: 2.2,
    drift: 9, driftDy: 0.8, driftDur: 133.6, driftDelay: -41,
    ring: { d: 'M382 522 h22', dur: 15.2, delay: -6, drift: 5, driftDur: 155.3, driftDelay: -120 },
    refl: { cx: 392, cy: 524, rx: 7.5, ry: 1.7, wob: 0.35, stretch: 0.05, rdur: 32, rdelay: -12 },
  },
  {
    h: 'duck', x: 418, y: 525, sx: 0.84, dur: 11.9, delay: -7, rise: 1.4, set: -0.6, tilt: 1.7,
    drift: 11, driftDy: 1, driftDur: 149.9, driftDelay: -96,
    ring: { d: 'M410 528 h18', dur: 18.4, delay: -14, drift: 6, driftDur: 166.9, driftDelay: -33 },
    refl: { cx: 418, cy: 530, rx: 6.2, ry: 1.4, wob: 0.3, stretch: 0.045, rdur: 34.6, rdelay: -25 },
  },
];
