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
78/103 s for mist, 22.8–58.9 s for the ten petals falling and 11.2–21.1 s for
the same ten in a gust, 17/23/29 s for ripples, 47/61/39
s for the water — and the new set must too. Periods are primes or near-primes
chosen so that no pair in a group has a common factor; the property test in
phase 4 makes that a fact rather than an intention.

Every cycle is `ease-in-out alternate`. A loop that restarts is a loop; a
cycle that reverses is a breath.

## The catalogue

Each entry states the cause first. Rule 1: if there is no cause, the motion is
deleted, not tuned.

| thing                                  | cause                                      | motion                                                                                                                  | period                                                | default?                          |
| -------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| petals on the water                    | the water under them, and the air over it  | bob 1.6–2.6 u of rise over 1.8–3.4° of tilt, with a 0.6–1.2 u slide; and, separately, a drift of 7–12 u across the lake | bob 11, 13.5, 17.5, 23.5 s; drift 73, 101, 109, 139 s | **yes**                           |
| the boat's hull                        | water                                      | ±0.5 u rise and fall, 0.3° roll                                                                                         | 9.5, 13 s                                             | **yes**                           |
| the boatman                            | he is rowing                               | torso rotates 1.1° about the hips, arms follow                                                                          | 7.5 s                                                 | **yes**                           |
| the ducks                              | water                                      | ±0.4 u bob, no two in phase                                                                                             | 8.3, 11.9 s                                           | **yes**                           |
| the heron                              | it is alive                                | weight shift ±0.3 u                                                                                                     | 37 s                                                  | **yes**                           |
| three places the fish came up          | something under the water                  | a ring spreads from tight to gone, two or three times per period at uneven spacing                                      | 97, 127, 179 s                                        | **yes**                           |
| the birds                              | they are flying                            | drift along their own heading, 6.6, 5.8 and 7.6 u between the extremes of the swing                                     | 67, 89, 113 s                                         | **yes**                           |
| the birds, crossing                    | they are flying, and the wind is up        | the same drift, 34 u over the cycle                                                                                     | 31.9, 43.7, 39 s                                      | no — Enhance                      |
| the far mountain's mirror              | water                                      | brightens and settles, and is slid sideways while it stretches about the waterline: 3.0 u at its far edge               | 39 s of brightness, 47.4 s of shape                   | **yes**                           |
| the gate's reflection                  | water                                      | slid and stretched about the waterline, 3.2 u at the far edge, under the bands the surface lays across it               | 31.6 s                                                | **yes**                           |
| what the ducks leave in it             | water, and two birds floating on the water | slid and stretched about the top of each smear: 1.04 and 0.85 u at the far edge                                         | 32, 34.6 s                                            | **yes**                           |
| where things stand in the water        | the surface is not flat against them       | nine rings and strokes brighten and settle, each between 0.62 and 1 of itself                                           | 15.2, 18.4, 18.6, 19.3, 23.4, 28.4, 29, 29.2, 35.2 s  | **yes**                           |
| the bands across the gate's reflection | the surface itself                         | slide along the water, 2.8 and 2.2 u between the extremes                                                               | 27.6, 32.8 s                                          | **yes**                           |
| reeds and grass                        | wind                                       | sway, 1.2°, one stand as one object                                                                                     | 13.7, 15.1, 16.3, 19.7, 22.7, 29.3 s                  | no — Enhance                      |
| the cherry branch                      | wind off the lake                          | rocks about its root; the far end travels 1.6 u in still air and 3.5 u in a gust, the root nothing                      | 57.5 s; 13.3 s with Enhance                           | **yes**                           |
| the flowers on it                      | the same wind, and the branch flexing      | each swings a shallow arc, 0.16–0.35 u in still air and 0.32–0.7 u in a gust, growing with distance from the root       | 41.6–86.5 s; 10.2–36.2 s with Enhance                 | **yes**                           |
| falling petals                         | wind off the branch                        | a fall of 85–285 u with the wind's set of −78 to +41 u, and a slide of ±6–16 u about that line                          | all ten, 22.8–58.9 s                                  | **yes**; 11.2–21.1 s with Enhance |
| the card's laminate                    | the lamp                                   | foil, glint, grain                                                                                                      | —                                                     | no — Enhance                      |

The reeds stay in Enhance. Forty-five of them swaying is the single most
expensive thing on the page, and their motion is the one that reads as "the
card is alive" rather than "the lake is alive".

## A petal on a lake goes somewhere

The brief asked for blossoms falling off the branch and floating on the water.
Four of them were lying on the lake with a bob and nothing else: a petal that
stays in one place for the whole time anybody is looking is not floating, it is
glued to the picture. So each one now also travels — 7 to 12 units over a minute
and a half to two and a half minutes, two of them leftward because the air is not
all going one way — easing back and forth so the return reads as the next gust
rather than a rewind.

The bob needed the same question asked of it. It was 0.4 by 0.5 of a unit, and
it was that for all four petals: half a pixel at the size this card is drawn,
and the same half a pixel on every one of them, so four petals written as
floating were rendered as bolted down and identical. Each now rides its own
swell — 1.6 to 2.6 units of rise, 0.6 to 1.2 units of slide, over 1.8° to 3.4°
of tilt, each on the petal's own period and its own phase. Measured over six
seconds on the page the four move 2.3, 0.7, 1.8 and 1.0 px. That is slow enough
that nobody watches it happen, which is the point of a float; the eye catches it
the way it catches anything that is alive and quiet.

Two groups, not one. The bob belongs to the petal and its shadow; the drift
belongs to the petal, its shadow and the water they are both on. They cannot
share an element: two animations on one element fight over the same `transform`
property and the later one wins outright.

The four drift periods were not picked, they were left over. Everything the page
already moves on — both tiers, seventy-six animated marks — was written out, and a
number was thrown away if it equalled one of those or was an integer multiple of
one of them to within a percent. Four obvious picks are recorded in
`Floaters.data.mjs` as the reason they are not there: 67 and 89 are the far
birds, and the rhythm probe caught them across two hundred units of open sky;
107 and 71 are nine and six times the duck's 11.9 to within a percent; 103 is the
mist; 137 is ten times the nearest reed's 13.7. What survived — 73, 101, 109,
139 — is less elegant and does not keep step with anything.

## The branch lets go, slowly

The petals were the one row the first version of this document put in the
Enhance column, and that was wrong on its own terms. A branch that has dropped
its blossoms, and is dropping them still, is the picture. What is an effect is
the _shower_ — ten petals crossing the card in 13 to 25 seconds, which is a
gust.

The fix at the time was to exempt three of the ten from the calm tier's kill
rule, at 71, 83 and 97 seconds, and let the other seven stand still until the
laminate went on. That is what "three petals falling in still air" meant, and it
is a strange thing to have built: with Enhance off — the way everybody sees the
card — seven of ten petals were painted hanging in mid-air, motionless, forever.
Measured on the page: `animation-name: none` on seven of them, and 0 px of
travel in three seconds. Three petals coming down and seven stuck in the sky is
not a branch letting go, it is a branch with a decoration on it. Falling is what
a petal that has left a branch does; the laminate changes the speed and never
the fact.

So all ten fall on both tiers, at 22.8 to 58.9 seconds in still air and 11.2 to
21.1 in a gust, staggered by negative delays so that none of them is at the top
of its fall when you arrive. The test measures the same ten elements in both
modes — `26.8 43 22.8 37.1 40.9 31.2 47.3 53 57.2 58.9` off,
`12.9 14.9 11.2 17.1 19.2 11.6 14.2 16.1 18.1 21.1` on — and asks, three seconds
apart, that every petal has moved, that no two of the ten headings are the same
heading, and that the ten paths on the page are ten paths — fall, set and slide
read back off the elements themselves, because ten different headings can come
out of one shared path with ten different phases. What has to be ten-to-one is
the triple and not each number in it: two petals standing at the same height
above a flat lake fall the same distance, and that is what a lake is, not a
petal drawn badly.

The second question is the one that mattered. All ten petals used to share one
keyframe, `translate(-150px, 430px) rotate(340deg)`, so the shower was one path
multiplied ten times: the same distance, the same angle, the same lean. Each
petal now states its own fall, its own set — where the wind takes it over that
distance, and three of them go right, because the air is not one direction — and
its own slide about that line, on a slide period of its own. The path is the sum
of a fall and a slide whose periods share no factor, so the ten curves are ten
curves.

Those periods are not free. A petal that falls 85 units in 57 seconds moves two
units in the three seconds the rhythm probe watches, so it is not a traveller and
it is compared against everything within 120 units — the wake, the glitter
crests, the petals lying on the water, the hull, the man poling it, the mist, the
far birds. The first set put 57 next to the wake's 19, three times exactly, and
43.8 next to a floating petal's 11, four times within a percent; both were
flagged. The thirty numbers in the data — ten falls, ten slides, ten falls for
the gust — were each walked against that whole list and against each other.

Each petal carries both numbers from its placement data:

```
--dur: 26.8s; --delay: -9s; --dur-on: 12.9s; --delay-on: -1s; --fall: 250px; --setx: -52px
```

and one rule in the stylesheet chooses the tier. The data states both; the
stylesheet decides. That is what keeps two intensities of one motion from
becoming two sets of markup — and it replaced ten `.p1` … `.p10` rules that
hard-coded the same numbers in a different file from the petals themselves.

## The branch itself is in the wind

The petals come off a branch, and until this the branch was the one part of the
scene bolted to the sky. With the laminate on, the reeds bend, the birds cross,
the hull rocks harder and the shower runs three times faster — and the branch the
shower is coming off does not move. That is the same kind of lie as a petal
hanging in mid-air: the cause is present in the picture and the effect is missing
from one of the things it acts on.

It rocks about its root, not its middle. The branch enters the card at (-10, 26)
and is held there by the rest of the tree, which is off the picture; a rotation
about that point moves the far end and leaves the root where it is, which is what
a branch does and what a rotation about the middle of its own box does not. At
0.18° the far end travels 1.6 units; at the gust's 0.4° it travels 3.5.

And no two flowers move together, because a branch is not a bar. The swing runs
out along it: everything further from the root arrives later and wider, so the
amplitude grows with distance — 0.16 units at the first blossom and 0.35 at the
tip in still air, 0.32 and 0.7 in a gust — and the period does the same, 41.6 s
near the root to 86.5 s at the end, or 10.2 to 36.2 when the wind is up. Each
flower's own path is a shallow arc rather than a straight line, because that is
the shape the end of a flexing branch draws.

The thirty periods — fifteen in still air and fifteen in the gust — were the
expensive part, and the rhythm probe priced them on the first run. A flower that
swings two thirds of a unit is not a traveller — the probe's threshold is 10 units
in three seconds — so it is compared against what sits near it. When these were
picked the radius was 200 css px, which at this viewport is most of the card, and
the list it produced was the whole page: the fish rings at 97, 127 and 179 s, the
petals drifting on the water at 73, 101, 109 and 139 s, the birds at 31.9, 43.7 and
39 with the laminate on and 67, 89 and 113 with it off, the clouds at 46, 62 and 38,
the mist at 78 and 103, the ten falling petals at 22.8 to 58.9. The first set put
19.4 s under the fish's 97 — five times exactly — and 17.9 s under 179, ten times.
Both were flagged, and every period was then re-walked against that whole list and
against the other fourteen. The radius is 120 units now, so the list a new mark has
to survive is shorter than the one these survived; nothing had to be re-picked,
because a period clean against everything is clean against anything nearby.

The branch and its flowers move on both tiers, and that is the same correction the
petals got one commit earlier. They went in as a gust-tier motion — killed by the
calm rule, exempt from nothing — which was the right answer to the wrong question:
the wind that lifts a branch is the wind that lets a petal go, and in still air a
branch still sways, by a fifth of a degree rather than half one. The laminate
changes how hard and never whether. A check counts them in both modes: 16 of 16
animating with Enhance off and the same 16 with it on, each flower carrying its
own amplitude, tilt, period and phase, and every one of the sixteen periods
longer in still air than in the gust.

## Three birds that were not going anywhere

The birds have drifted since the beginning: `drift-far`, 67, 89 and 113 seconds,
and the catalogue said so, and `WANT` in the motion test counted 3 of 3 animating
with Enhance off, and the rhythm probe was satisfied that they were not keeping
step with anything. Every one of those statements was true about a drift of
**2 units**. Two units over 67 seconds is 0.03 units a second; a gull 20 units
wide on a 900-unit card is 2.3% of the picture, and it does not visibly move at
that rate. The birds were animated in the same sense that a photograph of a bird
is animated.

This is the same failure the petals lying on the water were, one tier over, and
it is worth naming because the checks all passed. A mark can be exempt, counted,
unsynchronised and still stationary for anybody looking. The fix is not a bigger
number for its own sake: six to seven units over a minute is 0.1 units a second,
which is still far too slow to watch and fast enough that the bird is somewhere
else when you look back, and that is the whole of how a distant bird on a still
morning is ever noticed.

The distances are now data — `dx` and `dy` in `Birds.data.mjs`, one pair per
bird — because three birds in a sky are not one bird moved three times, and the
check reads them off the elements: three distinct (period, phase, distance)
triples, and every distance at least 4 units from the start of the swing to its
end. Measured on the page, the three birds travel 6.6, 5.8 and 7.6 units.

## The lake was glass everywhere except where it wasn't

The water had motion in the places the boat was. The glitter band slid, the wake
breathed, three ripples set off from the paddle at 17, 21 and 24 seconds, the hull
bobbed, the ducks bobbed, ten petals lay drifting and bobbing. Everywhere else it
was a painting of a lake: the gate stood mirrored under itself without moving, the
mountain's mirror only changed its brightness, the two smears the ducks left were
painted on, and the rings drawn where the posts stand in the water and where a
heron is standing — marks whose entire reason for existing is that the surface is
not flat against a thing in it — were held still.

That is the same shape as the birds' defect one tier over: the marks were drawn,
counted, and never asked whether they actually move.

**The cause, per mark.** A reflection is the surface's doing, so the surface
decides what it looks like: it slides the image sideways a little and pulls it
longer and shorter about the waterline. Where something stands in the water the
surface is not flat against it, and the rings and strokes there brighten and
settle. The two pale bands laid across the gate's reflection are the surface
itself, so they slide, and the reflection moves under them — which is the pair
reading as water rather than as a red gate with a red smear below it.

**The mechanism, per mark.** The transform goes on a group wrapped around the
mirrored mark, never on the mirrored mark itself: a CSS transform _replaces_ a
transform attribute, and the mirror is an attribute — `scale(1 -0.5)` about the
waterline for the gate, `matrix(1 0 0 -0.46 0 590)` for the mountain. The mask
stays on the outer group, so the water's bands hold still while the reflection
moves under them, which is the order of things. The origin is `50% 0%` of the
mark's own box, and for every one of these marks the top of its box is the
waterline, so the reflection is hinged where it touches the water and the free end
is what travels.

The rings breathe between 0.62 and 1 of themselves, not between 0.22 and 0.46 like
the boat's ripples. Those four paths were drawn at the strength they are meant to
have; a shimmer that dims a picture that was already right is a defect wearing the
costume of an improvement.

**The periods, and what the first pick got wrong.** Fifteen new periods, and the
probe rejected the first set three times: 33.5 s was exactly half the nearest
bird's 67, 22.6 s a fifth of another bird's 113, 26.5 s half a petal's 53. The
search had been run against a list of the calm tier's durations assembled by hand
from the marks the probe _exempts_ — and the probe exempts a mark when it is a
traveller at the moment it looks, which a petal is only sometimes. The honest
constraint set is not a curated list: it is every duration on the page, in both
tiers, measured — 96 of them, because the water marks have no gust variants and so
are compared against the gust tier's crowded low end as well (19.5 s collided with
the boat's 6.5, 26.5 with the branch's 13.3, 31.5 with a blossom's 15.7). Re-picked
against the measured union, all fifteen are clean in both tiers, and the probe says
so at both settings.

**The check.** Four mirrors, four different (period, phase, amplitude) triples, and
the excursion measured at each mirror's own far edge — 3.0, 3.2, 1.04 and 0.85
units — rather than as a percentage of stretch, because the mountain's mirror is 138
units deep and the gate's is 55, and it is the distance that has to be enough.

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

|                                   | mean    | median  | p95     | worst  | late frames |
| --------------------------------- | ------- | ------- | ------- | ------ | ----------- |
| before the gentle set             | 18.2 ms | 16.7 ms | 33.3 ms | 50 ms  | 22/240      |
| with it (19 more animated marks)  | 18.4 ms | 16.7 ms | 33.3 ms | 33 ms  | 25/240      |
| with the slow petals as well (22) | 18.3 ms | 16.7 ms | 33.4 ms | 33 ms  | 24/240      |
| with the fish as well (25)        | 18.4 ms | 16.7 ms | 33.3 ms | 33 ms  | 25/240      |
| the petals drifting as well (29)  | 16.6 ms | 16.7 ms | 16.7 ms | 17 ms  | 0/240       |
| the page before the water (65)    | 16.8 ms | 16.7 ms | 16.8 ms | 67 ms  | 1/240       |
| the page today, Enhance off (80)  | 16.7 ms | 16.7 ms | 16.8 ms | 33 ms  | 1/240       |
| the page today, Enhance on (91)   | 40.7 ms | 33.4 ms | 50.1 ms | 117 ms | 239/240     |

Fifteen marks went into the quiet tier with the water and nothing moved: the
tier's cost is the card's own filters, not the number of animations, and the
water's are opacity on a stroke and a transform on a group. The 67 ms worst frame
in the row above it was noise, and the 117 ms in the Enhance row is noise too —
the same 239 late frames in both.

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
  duration to rows that are twenty-five units apart and one glance apart. The
  fix — six primes, one per row — was written as seven rules that counted, and by
  the time it was written the rows had been folded into one group: the class sat
  on the group, the group was nth-child(2) of the water, and the four rules after
  it selected nothing at all. The band breathes as one thing at one period, and
  the page carried four rules and a paragraph of care about an empty set. They are
  gone; the band's period is written on the group in the markup, and the boat's
  three crests are named rather than counted. The dead-rule check missed them
  because it strips pseudo-classes off a selector before asking whether anything
  matches, and nth-child is a pseudo-class. It does not strip position any more,
  and these four are how that was shown to matter.
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
apart, and any two that stay put, are under 200 units across and within 120 units
of each other must not share a period, come within 1% of one another's, or be whole
multiples of one another. Two exclusions, both claims about the picture rather than
conveniences: a mark wider than 200 units is a surface — mist, the glitter path,
the ray field — and a surface is not anybody's neighbour; and a mark that travels
more than 10 units in three seconds is passing through, so its period is a duration
of passage and not a step the eye can compare.

The distances are stated in units of the artwork and converted through the
viewport's own scale. They used to be stated in CSS pixels, which made the radius a
function of the test window: at the viewport the harness uses, 200 px is 600 units,
and the probe was comparing one shore of the lake to the other. That became visible
the day the third rule went in — a ring at the foot of a post on the left at 29.2 s
and an arc at a heron's legs on the right at 29 s were reported as keeping step, 491
units apart, on opposite sides of a 900-unit picture. The radius is 120 units now, a
hand's width on the card, and widening it back to the old reach reports four such
pairs.

The third rule is the 1%: two periods less than 1% apart are one period for anybody
watching. The check used to allow anything that was neither exactly equal nor an
exact multiple, so 27.6 s and 27.7 s passed — a band sliding across the surface and
a ring brightening at the foot of a post, 50 units apart, on one clock. Two of the
water's marks were moved off that, and setting one back makes the check say exactly
what it found: `band (27.6s) and ring (27.8s) are within 1% of a period, 50 units
apart`.

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
scene is 915 static elements across the two faces — 791 on the front, 124 on
the back — and one lighting loop; the motion it needs is thirty-odd CSS
animations with argued-over periods and a data table that says which one is in
phase with what.
