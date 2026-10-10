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

| thing                      | cause                                          | motion                                                       | period           | default?      |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ---------------- | ------------- |
| petals on the water        | the same water that already ripples under them | vertical bob, ±0.5 u, and a 0.4 u sideways slide             | 11, 17, 19, 23 s | **yes**       |
| the boat's hull            | water                                          | ±0.5 u rise and fall, 0.3° roll                              | 9.5, 13 s        | **yes**       |
| the boatman                | he is rowing                                   | torso rotates 1.1° about the hips, arms follow               | 7.5 s            | **yes**       |
| the ducks                  | water                                          | ±0.4 u bob, no two in phase                                  | 8.5, 11.5 s      | **yes**       |
| the heron                  | it is alive                                    | weight shift ±0.3 u; head turn is a discrete event (phase 3) | 23, 31 s         | **yes**       |
| the birds                  | they are flying                                | drift along their heading, 2 u over the cycle                | 67, 89, 113 s    | **yes**       |
| the far tree line's mirror | water                                          | already `reflBreathe`                                        | 39 s             | yes (already) |
| reeds and grass            | wind                                           | sway, 1.2°                                                   | 19–41 s          | no — Enhance  |
| falling petals             | wind off the branch                            | the full fall                                                | 13–25 s          | no — Enhance  |
| the card's laminate        | the lamp                                       | foil, glint, grain                                           | —                | no — Enhance  |

The reeds stay in Enhance. Forty-five of them swaying is the single most
expensive thing on the page, and their motion is the one that reads as "the
card is alive" rather than "the lake is alive".

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

Discrete, seeded events — the heron turning its head, a fish breaking the
surface, a wing beat — are phase 3, and they need the clock. They are also the
only place where "nothing repeats at even intervals" cannot be satisfied by
choosing prime periods, because an event either happens or it does not. Those
get a seeded timer (the mulberry32 the soundtrack already uses), with the
interval drawn from a range, never a fixed one.

## Budget

Enhance off, 1440 × 1150, measured by `npm run perf`:

- today, measured on the current build (`npm run perf`, pointer on the card,
  Enhance off): mean 18.2 ms, median 16.7 ms, p95 33.3 ms, worst 50 ms,
  22 frames in 240 above 33 ms — about 55 fps
- the gentle set adds roughly 25 animated elements. **Abort criterion: if p95
  goes above 40 ms or the mean above 22 ms, the set is cut back** — starting
  with the birds (largest painted area) and the boatman.

The measurement is taken before phase 2 is committed, not after.

## Phases

1. **The creatures become parts.** The heron, the two ducks, the boat and its
   man, and the three birds move from hand-placed markup into the cast
   (`src/art/front/20-cast/`) and the placement data, each with `dur` and
   `delay` fields. No motion yet. Proved the way the plant migration was
   proved: the set of (mark, transform) pairs in the built page, before and
   after, identical.
2. **The gentle set, on by default.** The six rows marked _yes_ above. The
   exception list in `08-quality.css` grows from four names to ten, and each
   name has to be justified by its cause in the comment beside it. Perf
   measured against the budget in the same commit.
3. **Seeded events.** The clock, only for things that happen rather than
   cycle: the heron's head, a ripple that starts somewhere and dies. Only if
   phase 2 left headroom.
4. **The tests.** `test-motion.mjs` gains three assertions:
   - with Enhance off, the gentle set still has an animation running
     (computed `animation-name` is not `none`) — today the opposite is asserted
     for everything else, and that is correct, but nothing says these must live
   - with `prefers-reduced-motion`, nothing in the scene animates at all
   - no two animated elements in the built page share a duration, and no
     duration in a group is an integer multiple of another in the same group —
     rule 2, checked over time instead of over space

## What this document does not propose

No animation framework, no GSAP, no runtime Svelte, no parallax layers. The
scene is 726 static elements and one lighting loop; the motion it needs is
twenty-five CSS animations with argued-over periods and a data table that says
which one is in phase with what.
