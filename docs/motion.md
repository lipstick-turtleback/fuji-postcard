# The gentle motion of the scene

A plan, not a changelog. Nothing here is implemented until the phase that
implements it is done and measured.

## The principle

Motion belongs to the thing, not to the effect bolted onto it.

The lake breathes whether or not the viewer turned the laminate on. The mist
drifts, the surface ripples, the wake spreads — those four already stay running
with Enhance off, because they are what the picture _is_: `08-quality.css`
stops every other animation in the SVG and names them as the exceptions.

Everything else that moves today is a property of the card as an object: the
foil, the sway of the card, the falling petals, the grain. That is the right
split. But the split was drawn before the scene had creatures in it, and it
left an inconsistency the eye notices even when it cannot say why:

- the water animates; the petals floating on it do not
- the boat's wake animates; the boat does not
- three birds are painted in a sky the clouds are crossing
- a heron stands at the water's edge and has not drawn a breath in a century

This document is the plan for the motion that closes those four gaps, and for
keeping it slow enough that nobody ever sees it move.

## What "gentle" means, in numbers

Amplitude and period, in the artwork's own units (the card is 900 × 600):

| distance from the eye           | travel        | rotation | period   |
| ------------------------------- | ------------- | -------- | -------- |
| far (clouds, birds, ridges)     | 1–3 units     | none     | 60–140 s |
| middle (Fuji's mist, the lake)  | 1–2 units     | none     | 40–110 s |
| near (bank, reeds, boat, ducks) | 0.4–1.2 units | ≤ 1.2°   | 8–30 s   |

Nothing in the default set moves more than 1.2 units or turns more than 1.2°
per cycle. A viewer who notices that something moved has seen a defect, not a
success.

Rule 2 applies to time as much as to space: **no two animated things in a
group may share a period, and no period may be a multiple of another in the
same group.** The existing set already obeys this — 46/62/38 s for clouds,
78/103 s for mist, 13–25 s for the ten petals, 17/23/29 s for ripples, 47/61/39
s for the water — and the new set must too. Periods are primes or near-primes
chosen so that no pair in a group has a common factor; the property test in
phase 4 makes that a fact rather than an intention.

Every cycle is `ease-in-out alternate`. A loop that restarts is a loop; a
cycle that reverses is a breath.

## The catalogue

Each entry states the cause first. Rule 1: if there is no cause, the motion is
deleted, not tuned.

| thing                         | cause                                          | motion                                                                             | period                               | default?                                |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| petals on the water           | the same water that already ripples under them | vertical bob, ±0.5 u, and a 0.4 u sideways slide                                   | 11, 17, 19, 23 s                     | **yes**                                 |
| the boat's hull               | water                                          | ±0.5 u rise and fall, 0.3° roll                                                    | 9.5, 13 s                            | **yes**                                 |
| the boatman                   | he is rowing                                   | torso rotates 1.1° about the hips, arms follow                                     | 7.5 s                                | **yes**                                 |
| the ducks                     | water                                          | ±0.4 u bob, no two in phase                                                        | 8.3, 11.9 s                          | **yes**                                 |
| the heron                     | it is alive                                    | weight shift ±0.3 u                                                                | 37 s                                 | **yes**                                 |
| three places the fish came up | something under the water                      | a ring spreads from tight to gone, two or three times per period at uneven spacing | 97, 127, 179 s                       | **yes**                                 |
| the birds                     | they are flying                                | drift along their heading, 2 u over the cycle                                      | 67, 89, 113 s                        | **yes**                                 |
| the birds, crossing           | they are flying, and the wind is up            | the same drift, 34 u over the cycle                                                | 31.9, 43.7, 39 s                     | no — Enhance                            |
| the far tree line's mirror    | water                                          | already `reflBreathe`                                                              | 39 s                                 | yes (already)                           |
| reeds and grass               | wind                                           | sway, 1.2°, one stand as one object                                                | 13.7, 15.1, 16.3, 19.7, 22.7, 29.3 s | no — Enhance                            |
| falling petals                | wind off the branch                            | the fall itself                                                                    | 3 of 10 at 71, 83, 97 s              | **yes**; all 10 at 13–25 s with Enhance |
| the card's laminate           | the lamp                                       | foil, glint, grain                                                                 | —                                    | no — Enhance                            |

The reeds stay in Enhance. Forty-five of them swaying is the single most
expensive thing on the page, and their motion is the one that reads as "the
card is alive" rather than "the lake is alive".

## The branch lets go, slowly

The petals were the one row the first version of this document put in the
Enhance column, and that was wrong on its own terms. A branch that has dropped
its blossoms, and is dropping them still, is the picture. What is an effect is
the _shower_ — ten petals crossing the card in 13 to 25 seconds, which is a
gust.

So the same ten petals carry two periods. Three of them, spaced along the
branch, fall in still air at 71, 83 and 97 seconds: primes, none a multiple of
another, staggered by negative delays so that none of them is at the top of its
fall when you arrive. With the laminate on, all ten fall at 13 to 25 seconds.
The test measures the same three elements in both modes — `71s 83s 97s` off,
`19s 23s 14s` on.

Each petal carries both numbers from its placement data:

```
--dur: 71s; --delay: -23s; --dur-on: 19s; --delay-on: -6s
```

and one rule in the stylesheet chooses the tier. The data states both; the
stylesheet decides. That is what keeps two intensities of one motion from
becoming two sets of markup — and it replaced ten `.p1` … `.p10` rules that
hard-coded the same numbers in a different file from the petals themselves.

## Mechanism

**Phase and period are data, not markup.** The placement components already
emit `style="animation-delay:-5s"`; they will take `dur` and `delay` per
instance and write them as custom properties:

```svelte
<g style={`animation-duration:${s.dur}s; animation-delay:${s.delay}s`}>
```

so the CSS says _how_ a thing moves and the data says _when this one_ moves.
That is the whole reason the placements became components: a phase written in
the scene file is a magic number; a phase in the data table is a choice that
can be argued with.

No JavaScript clock for any of this. A CSS animation on an SVG transform is
composited and costs nothing per frame in the main thread; a rAF loop that
writes 25 transforms every frame is exactly the cost the perf harness exists to
catch. The page's one rAF loop stays what it is: pointer-driven lighting.

Discrete events — the heron turning its head, a fish breaking the surface, a
wing beat — were supposed to need the clock, and the plan said so. The fish
were built without one, and the cheaper answer turned out to be the better
one: a keyframes block that holds the surface still for most of its period and
lets the ring spread two or three times at uneven distances through it. The
gaps between risings differ from each other and from the period, so nothing a
viewer can count is countable; and because it is CSS, it costs nothing per
frame, it survives the reduced-motion rule like everything else, and it
travels into the exported plate, which a JavaScript timer never would.

A seeded timer is still the right answer for an event that must not merely look
irregular but actually differ between visits. It is not needed for anything on
the page today, so nothing has one.

## Budget

Enhance off, 1440 × 1150, measured by `npm run perf`:

|                                   | mean    | median  | p95     | worst | late frames |
| --------------------------------- | ------- | ------- | ------- | ----- | ----------- |
| before the gentle set             | 18.2 ms | 16.7 ms | 33.3 ms | 50 ms | 22/240      |
| with it (19 more animated marks)  | 18.4 ms | 16.7 ms | 33.3 ms | 33 ms | 25/240      |
| with the slow petals as well (22) | 18.3 ms | 16.7 ms | 33.4 ms | 33 ms | 24/240      |
| with the fish as well (25)        | 18.4 ms | 16.7 ms | 33.3 ms | 33 ms | 25/240      |
| the page today, Enhance off       | 16.7 ms | 16.7 ms | 16.7 ms | 33 ms | 1/240       |
| the page today, Enhance on        | 39.8 ms | 33.4 ms | 50.1 ms | 83 ms | 238/240     |

The last two rows are one run of `npm run perf`, which now measures both tiers
back to back; the rows above them are the history of the comparison, each
measured on the page of its own day. The quiet tier has got cheaper since
those rows were written — a 16.7 ms median with one late frame in 240 — and
the expensive one has not moved, because the laminate is the same single
blended layer it always was.

`npm run perf` now measures both tiers in one run, and the second row is the
answer to a question the table had never asked: what happens when somebody
switches the laminate on. Software rasterisation — headless Chrome with
`--disable-gpu`, which is what the harness always uses — puts that tier at
25 fps, over the criterion by itself. It is not a defect, it is the situation
the page's own frame probe exists for: with the same 33 ms median, the page
measures the machine, turns Enhance off by itself, and says so in the button
label and the live region. `test-interactions.mjs` throttles the CPU eight
times over CDP and asserts that it does, and asserts that an unthrottled page
is left alone.

The criterion was p95 under 40 ms and mean under 22 ms. Both hold, and the
worst frame got better. Nineteen more moving things cost 0.2 ms of mean frame
time because they are composited transforms on small groups, not repaints: the
page's cost is in its filters, which is why Enhance switches those off and the
picture's own motion was never the expensive part.

## What the measurements found on the way

Four things that were already wrong, each found by a check rather than by
looking:

- **`.water-a` was animating nothing.** The stylesheet had a rule and keyframes
  for a slow sideways drift of a water band; no element in the scene had that
  class. Dead code in a stylesheet has exactly this shape — it cannot be seen
  to do nothing. It is gone, and the comment that said "three slow drifts" now
  says two and a breath, which is what the lake has.
- **The wake and a ripple were keeping step.** Both on 23 s, three units apart
  at the hull.
- **The six crests of the glitter band were three pairs of twins.** Their
  periods came from `nth-child(2n)` and `nth-child(3n)`, which hands the same
  duration to rows that are twenty-five units apart and one glance apart. Each
  crest now has its own period: 17, 23, 29, 19, 25, 31 s.
- **The ducks, the heron and the fish were not on the lake.** A CSS transform
  does not compose with a `transform` attribute, it replaces it, so a mark
  positioned by the attribute and animated by the stylesheet is positioned at
  the origin of the picture and animated there. All three had been bobbing in
  the top-left corner of the card, under the shore, since the day they started
  bobbing. Nothing saw it because every screenshot and every geometry test runs
  with motion switched off — reduced motion is the only way to get two renders
  that agree pixel for pixel — and the bug lived in the half of the page nobody
  photographs. The fix is the shape the birds and the petals already had: a
  group carries the placement, the animation is applied to the group, never to
  the element that holds the placement. `test-motion.mjs` now asserts that no
  element in a face both carries a `transform` attribute and has an animation
  running on it.

  The bug had a second half. Once the ducks were where they are supposed to be,
  they were a hand's width from the ripple crests, and their periods — 8.5 and
  11.5 s, the first numbers written down — turned out to be exact halves of two
  of the crests, 17 and 23 s. The rhythm check failed on marks that had never
  been near enough to compare.

The rule those three break is rule 2, and the check that catches them is
`test-motion.mjs`: every animated mark in a face is sampled twice three seconds
apart, and any two that stay put, are under 200 px across and within 200 px of
each other must not share a period or be whole multiples of one another. Two
exclusions, both claims about the picture rather than conveniences: a mark
wider than 200 px is a surface — mist, the glitter path, the ray field — and a
surface is not anybody's neighbour; and a mark that travels more than 8 px in
three seconds is passing through, so its period is a duration of passage and
not a step the eye can compare.

The check runs in both tiers, and only started running in both when the excuse
for not doing so turned out to be false. It used to stop at Enhance off, on the
grounds that the reeds sway in stands and the check would mistake a stand for a
pair of neighbours. But a stand is one element — one group, one animation — so
the check was already comparing stands to one another, which is exactly what
should be compared. Running it with the laminate on found fourteen pairs
keeping step: three stands of reeds sharing 13 s and 17 s within 60 px of each
other, a bird crossing the lake on exactly twice the period of the ripple under
it, a hull rocking at half a reed's period. Six stands and two bird crossings
were renumbered; the rest state of the page is 9.4 million pixels identical
before and after.

## Phases

1. **The creatures become parts.** Done. The birds became marks in the cast
   (`birdA`, `birdB`, `birdC`) placed from `Birds.data.mjs`; the ducks and the
   heron became `Ducks.data.mjs` and `Heron.data.mjs`; the man inside the boat
   became a group of his own. Proved by pixels: with reduced motion the page
   renders identically run to run (0 differing pixels in 9.4 million), and
   before against after 2,019 pixels differ, all of them anti-aliased stroke
   edges on the three birds, none by more than 2/255 — what Chrome does when it
   rasterises `<use>` content instead of an inline path.
2. **The gentle set, on by default.** Done. The exception list in
   `08-quality.css` grew from four names to thirteen, and the reduced-motion
   block stopped naming things at all: `.face svg *` holds still, which is the
   promise, and cannot go stale the way a list does. Periods and phases for the
   placed creatures live in their data files; the boat's and the man's stay in
   CSS, because the boat is one drawing and not a placement.
3. **Seeded events.** Not started. The clock is still only for lighting.
4. **The tests.** Three of the four assertions are in `test-motion.mjs`, which
   went from 4 checks to 12. The fourth — that the exported plate carries the
   gentle set — turned out to be a build-time property, and `check.mjs` now
   enforces it: every class that animates must survive the export filter in
   `card.js`. That check found and fixed its own bug on the way: it read CSS
   comments as selectors, so a sentence mentioning `50-lake.svg` became a class
   named `.svg`.

## What this document does not propose

No animation framework, no GSAP, no runtime Svelte, no parallax layers. The
scene is 726 static elements and one lighting loop; the motion it needs is
thirty-odd CSS animations with argued-over periods and a data table that says
which one is in phase with what.
