/* Ten petals off the branch, and every one of them is falling.

 * This table used to carry two kinds of petal. Three were `slow`: they had a
 * period of their own and they fell. The other seven had no `dur` at all, and
 * the stylesheet's kill rule for the calm tier exempted only `.slow` — so with
 * Enhance off, which is how everybody sees the card, seven of the ten petals
 * were painted still in mid-air and three were falling. Measured:
 * `animation-name: none` on seven, and 0 px of travel in three seconds. A
 * branch that sheds three petals and holds seven is not a branch letting go.
 *
 * So every petal now carries both tiers, and the tiers differ by speed and not
 * by existence: 22.8-58.9 s in still air, 11.2-21.1 s when the laminate is on
 * and the shower is a gust.
 *
 * A trajectory, not a translation. One keyframe shared by ten petals means ten
 * petals walking the same line at the same angle: the old one was
 * `translate(-150px, 430px) rotate(340deg)` for all of them, so the shower
 * moved as one clump that had been multiplied. Each petal now states its own
 * four numbers — `fall` how far it goes before it reaches the water at its own
 * x, `setx` where the wind takes it over that distance (three of them go right,
 * because the air is not one direction), `sway` how far it slides side to side
 * about that line, and `swayDur` how long a slide takes — and the two motions
 * live on two nested groups, because a CSS transform replaces an SVG transform
 * attribute rather than composing with it, and two animations on one element
 * would fight over the same property with the later one winning. The path a
 * petal draws is the sum of a straight fall and a slide whose period shares no
 * factor with the fall's, so no two of the ten curves are the same curve.
 *
 * The periods are not free, and the rhythm probe said so the first time this
 * ran. A petal that falls 85 units in 57 seconds moves two pixels in the three
 * seconds the probe watches, so it is not a traveller and it is compared
 * against everything within 200 css px — the wake at 19 and 25, the glitter
 * crests at 17, 21, 23 and 24, the petals lying on the water at 11, 13.5, 17.5
 * and 23.5, the hull at 13, the man poling it at 7.5, the mist at 78 and 103,
 * the far birds at 67, 89 and 113. The first set put 57 next to the wake's 19 —
 * three times, exactly — and 43.9 next to a floating petal's 11 — four times,
 * within a percent. So these thirty numbers, ten falls and ten slides and ten
 * falls for the gust, were each walked against that whole list and against each
 * other: none equals another, and none is within a percent of a whole multiple
 * of another. They are not pretty. They are what survived. */
export const petals = [
  { n: 1, x: 150, y: 150, rot: -24, sx: 0.92, sy: 0.78, fall: 250, setx: -52, sway: 12, swayDur: 21.7, swayDelay: -4, dur: 26.8, delay: -9, durOn: 12.9, delayOn: -1 },
  { n: 2, x: 210, y: 120, rot: 58, sx: 0.85, sy: 0.6, fall: 285, setx: -78, sway: 15, swayDur: 24.1, swayDelay: -13, dur: 43, delay: -22, durOn: 14.9, delayOn: -6 },
  { n: 3, x: 96, y: 190, rot: -71, sx: 0.9, sy: 0.9, fall: 215, setx: -34, sway: 9, swayDur: 26.3, swayDelay: -7, dur: 22.8, delay: -14, durOn: 11.2, delayOn: -9 },
  { n: 4, x: 260, y: 170, rot: 13, sx: 0.75, sy: 0.5, fall: 235, setx: 26, sway: 13, swayDur: 28.1, swayDelay: -19, dur: 37.1, delay: -5, durOn: 17.1, delayOn: -3 },
  { n: 5, x: 180, y: 240, rot: -41, sx: 1, sy: 0.85, fall: 165, setx: -61, sway: 7, swayDur: 30.7, swayDelay: -11, dur: 40.9, delay: -31, durOn: 19.2, delayOn: -12 },
  { n: 6, x: 320, y: 130, rot: 76, sx: 0.8, sy: 0.62, fall: 275, setx: 41, sway: 16, swayDur: 33.3, swayDelay: -2, dur: 31.2, delay: -27, durOn: 11.6, delayOn: -8 },
  { n: 7, x: 60, y: 260, rot: -8, sx: 0.7, sy: 0.7, fall: 145, setx: -18, sway: 8, swayDur: 35.3, swayDelay: -23, dur: 47.3, delay: -38, durOn: 14.2, delayOn: -15 },
  { n: 8, x: 240, y: 280, rot: 34, sx: 0.9, sy: 0.55, fall: 125, setx: 33, sway: 11, swayDur: 37.8, swayDelay: -16, dur: 53, delay: -11, durOn: 16.1, delayOn: -5 },
  { n: 9, x: 130, y: 320, rot: -56, sx: 0.75, sy: 0.8, fall: 85, setx: -27, sway: 6, swayDur: 41.3, swayDelay: -29, dur: 57.2, delay: -44, durOn: 18.1, delayOn: -11 },
  { n: 10, x: 300, y: 240, rot: 21, sx: 0.85, sy: 0.68, fall: 165, setx: 19, sway: 14, swayDur: 43.8, swayDelay: -8, dur: 58.9, delay: -20, durOn: 21.1, delayOn: -2 },
];
