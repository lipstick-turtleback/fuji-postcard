# Lessons learned

Not the rules about the picture — [PROJECT.md](../PROJECT.md) holds those. This is
the other file: what the working produced about _how the working goes_, each entry
backed by the thing it cost to learn. The commit numbers point into
[changelog.md](changelog.md).

---

## 1. A number written in a document is a claim, and claims rot

The README has been wrong about its own page at least eight times: it quoted a
stylesheet line the build had stopped writing (`ca70687`), sent readers to a file
that had not existed for months (`9266472`), said the birds crossed 34 units when
they cross 168, described a rule walk the check used to be, and quoted counts that
the page had outgrown twice inside a day (`155d297`, `9d7bb05`).

The fix is never "be careful". Every number the README states is now read back out
of the README by `scripts/check.mjs` and measured against the disk: the paint-order
listing is compared with `src/art/front` in both directions, the quoted `@layer`
list is compared token by token with the one the build writes, the comment blocks
are counted, the script count and the page length are read from the build, the
element count and the node count are compared with what the page has. Three of
those guards fired within one sitting of the artwork changing under them.

**The rule:** if you write a number, write the measurement beside it. A count that
nobody re-measures is a photograph of a past state, and the past stops being true
the afternoon you write it.

## 2. A check that silently matches nothing reports success forever

Four of these, all in one day:

- the front-tree check looked for entries with two spaces before the name;
  `40-mountain.svg` has one, so the check had been comparing eleven entries with
  eleven and never noticing the twelfth was missing;
- the layer guard reported "the built page has no `@layer` statement" — false: the
  annotated build writes `@layer wall, masthead, …` with spaces after the commas,
  and the pattern allowed only `[a-z,]+`;
- the comment guard's JS measure was written so it counted nothing;
- the same guard would have failed on the shipped page, which has no comments to
  count, so it now measures `public/index-full.html` regardless of which file the
  run was asked about.

**The rule:** every lookup in a check has to fail loudly when it finds nothing. The
slow-water check added this sitting prints `nothing found` rather than skipping the
pair. A guard whose selector stopped matching is worse than no guard, because it
buys a green run.

## 3. A check you have not seen fail is a check you have not written

Every guard in the project has been shown to fire by putting the defect back. The
record, this sitting only:

| defect put back                                                                                            | what the check said                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `--rdelay` renamed in the markup                                                                           | `--rdelayX is written and never read`                                                            |
| `--gap-hang` renamed                                                                                       | `read 1 time with no fallback and written nowhere — invalid at computed-value time`              |
| a tree entry renamed; the heading saying "eleven" over twelve entries; `20-cast` written without its slash | both directions fire; `marks 20-cast as a file and on disk it is the other one`                  |
| `print` dropped from the quoted layer list                                                                 | `quotes 9 cascade layers and the build writes 10`                                                |
| `foil` renamed to `foils` in the quote                                                                     | fires at `position 5`                                                                            |
| the comment claim moved 165 → 152                                                                          | fires, with the README's line number                                                             |
| the script claim "eighteen" → "seventeen"                                                                  | `it lists 18`                                                                                    |
| the page length 5,239 → 4,100                                                                              | `the annotated page is 5276 lines`                                                               |
| the node claim 1,134 → 1,131                                                                               | `1134 nodes measured, README.md claims 1131`                                                     |
| `:not(.drift)` taken out of the calm-tier kill rule                                                        | `drift 6:0` — six elements, none animated                                                        |
| the wake's 7-unit counter-drift set to the hull's 16                                                       | `the wake 16.0 u vs the hull 16.0 u`, and the position check reports the three ripples 10 px off |

**The rule:** the negative test is not a formality after the fact. It is the half
of the work that turns "I added a check" into "the check is wired to the thing".

## 4. Two marks keeping step is a defect, because the eye counts pairs

The rhythm rule: two animated marks within 120 artwork units must not share a
period, must not be within 1% of one another's, and neither may be a whole
multiple of the other. It has caught, in order: the wake and a ripple both on 23 s
three units apart; the six crests of the glitter band, which were three pairs of
twins because their periods were assigned by `nth-child(2n)` and `nth-child(3n)`;
fourteen pairs the first time the rule was run with Enhance on, including a bird
crossing the lake on exactly twice the period of the ripple below it.

Two details were wrong before they were fixed. The radius used to be stated in CSS
pixels, which made it change size with the test window — at one point the probe was
comparing the far shore of the lake to the near one and calling them neighbours.
And the ducks' periods, 8.5 and 11.5 s, had survived review for weeks because
nobody had thought to ask what else was nearby: they are exactly half of two of the
ripple crests, 17 and 23 s, which sit a hand's width away.

**The rule:** state the constraint in the artwork's own units, and measure
adjacency rather than assume it. And when picking a number, subtract: the useful
list is not the set of periods that look nice, it is the set that survives being
compared with everything the probe actually finds nearby.

## 5. The waterline rule cuts both ways

A mark that goes _into_ water is seen through water below the surface, and must
dim. A mark that _stands_ in water stops at the surface, is ringed by ripples, and
what continues below it is its reflection. Getting this wrong is the most
productive single defect class in the project:

- the boat sat on the lake instead of in it;
- the torii was standing on the water, not in it;
- the heron had three ripples around its feet and no reflection;
- the boatman's pole was resting on the lake, not in it;
- the back's stamp printed its value outside itself;
- two address rules ran through the little Fuji and it read as a wireframe.

**The rule:** the same sentence produces two opposite requirements, so write the
sentence down and check both halves. Half of these were found by asking the
question in the direction nobody had asked it — a thing with ripples must also have
a reflection, a thing with a reflection must also stop at the surface.

## 6. A printed rule thinner than a device pixel has a phase, not a width

`a line 0.6 units wide does not have a width, it has a phase` and `a printed rule
may fade, but it may not stop` are the same discovery. At the size this card is
drawn, 2.09 device pixels cover one artwork unit, so a rule under one unit is
sampled, not drawn: it appears and disappears with the sub-pixel grid. Two checks
were wrong before this was understood — one was counting samples and calling them
units, another was clipping in a coordinate space that was not the card's.

The corollary is the one that cost the most: **a rule you cannot see is a rule that
is not there.** An attempt to fix the address rules by filling the doodle they
crossed looked right in a screenshot and was wrong; the fix was to stop the rules
short of the drawing.

## 7. CSS and SVG traps this project paid for in full

- **A CSS transform replaces an SVG `transform` attribute outright; it does not
  compose with it.** A mark positioned by the attribute and animated by the
  stylesheet is positioned at the origin of the picture and animated there. The
  ducks bobbed at the origin for as long as they bobbed — and every screenshot
  taken to check them had been taken with motion switched off, which is the part
  worth remembering: the verification method was the reason the defect survived.
- **`animation: revert` does not restore the author value.** It rolls the cascade
  back to the previous origin, which here is the UA sheet, and the UA value of
  `animation` is `none`. The calm tier's exemption had therefore never done
  anything; the mist reported `animation-name: none` with the exemption in place.
- **Two animations on one element fight over one property and the later one
  wins.** Every mark that both bobs and travels is two nested groups, and the
  placement lives on a third.
- **`element.getAnimations()` returns the element's animations _and its
  descendants'_.** Seeking them all to one time corrupts the descendants. Filter
  with `a.effect.target === el`.
- **`currentTime` is measured from the start of the animation's own timeline**,
  which for a negative delay is behind the first iteration. Winding 0 → one period
  samples the wrong window and misses the extremes: the first travel probe read a
  bird drifting 4.7 units where the data says 5.8.

## 8. The conditions of a measurement are part of the measurement

`--disable-gpu` measures a different page. A pixel-stable render needs
`--force-prefers-reduced-motion`. The perf script spent a while measuring a page
nobody runs on, and the README quoted it (`e7d7ee5`). Photographing the whole page
invented a seam that is not in the room. A region crop mapped through one face
photographs whichever face is showing. A frame probe checked the laptop rather than
the page.

**The rule:** a number carries its viewport, its device pixel ratio, its tier
(Enhance on or off), its motion preference, and whether the GPU is real. Without
those it is not a measurement, it is a rumour.

## 9. Tooling habits that saved or cost time

- The file-reading tool renders one extra space of indentation inside code blocks.
  Anchors built from what it shows miss four times a sitting. Subtract one, or
  print the line with `repr`.
- `cat -A` does not exist on macOS; `python3 -c "print(repr(line))"` always does.
- Prettier must not touch the build shell (`964bd9a`): the shell carries whole-line
  markers, and a formatter that re-indents them or adds a `;` breaks the build.
  `src/art` is prettier-ignored and owned by biome; `fmt` covers CSS, md and json.
- Scratch files in `/tmp` collide with earlier ones, and the write tool refuses to
  overwrite a file it has not read. Fresh names, every time.
- Ports are partitioned per test and the collision is now found by the build
  (`247fd8c`), because "port N is already serving a Chrome" turned out to be a web
  server some mornings (`b5c2f00`).
- A directory is not a file: `touch src/art/front/20-cast` on a directory does
  nothing, silently.

## 10. Restraint has to be recorded, or it is redone

One sitting was spent examining every drawable in the scene at 10× and 14×. Most
were judged fine and left alone: the sky's banding at 10×, the sun's rays, the
ducks, the stones, the doodle on the back, the room's wall and pool and seigaiha
and grain, the far-shore trees, the snowline domes, the back's crease and foxing,
the torii's base (the posts stop at the surface, there are ripples, and there is a
dim red reflection — all correct), the heron at 14×. Work rejected as not worth
doing: a tagging guard for printed rules (three legitimate untagged rects exist),
`vector-effect="non-scaling-stroke"`, a `--live` flag for the crop tool, trimming
the test sleeps (they total 8.4 s — the suite's runtime is work, not waiting), and
extending the rhythm rule to animation delays (same-period pairs are already
caught).

**The rule:** write down what you decided not to change and why. The next pass
spends the same effort rediscovering it otherwise, and the record is what makes
"leave it" a decision rather than a miss.

## 11. Cost is a property of the picture

One blended layer over the card costs about 20 ms a frame. The page measures
itself — median over a window, auto-off above 24 ms — and the decision moved from a
mean to a median, sooner, because a mean is dragged by the first frames of a cold
page (`404495a`). Measured: GPU with Enhance on 16.6 ms mean and 0 of 240 late
frames; software with Enhance on 40.2 ms and 239 of 240; the calm tier 16.7 ms and
1 of 240. Dropping three full-card turbulence filters from the calm tier is the
difference between a rendering that drops a third of its frames and one that does
not — 22.4 ms → 16.7 ms, 83/240 → 1/180.

`Measure the cost, then give the page a way to pay less` (`79b8d90`) is the commit
that set the pattern. Every effect added since has been measured in the tier it
will actually run in: the six drift groups added this sitting cost nothing
measurable, because a translate on a group that carries no filter is the cheapest
motion the page has.

## 12. One verified fix per commit, and the commit has to be self-consistent

178 commits, each a sentence about a defect rather than a file name. This sitting
ended with two commits that had to be separated — a set of documentation guards and
a change to the artwork — because the guards quote counts that the artwork changes.
The split was made by stashing the artwork, putting the counts back to the values
the pre-animation page really has, rebuilding, re-running the checks against that
state, committing, and only then restoring the artwork and re-measuring. A commit
that only passes in combination with a later one is not a commit; it is half a
change with a green tick on it.

## 13. When the check and the picture disagree, find out which one is wrong

The branch check used to assert that the branch and its flowers held still, and it
was written when they did — one commit before they began to move in the gust tier.
A check that contradicts the picture is not a guard, it is a photograph of an old
decision.

The opposite case is the same trap pointing the other way: a check fires, the
screenshot looks fine, and the check is right. Filling the little Fuji's body so
the address rules would not cross it looked correct and was wrong; the rules were
shortened instead.

**The rule:** treat a failing check as information about the picture in both
directions. Ask what the check believed when it was written, and ask what the
screenshot was taken with switched off.
