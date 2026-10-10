# 富士山 · Light on Paper

A single illustrated postcard — Mount Fuji at dawn as seen from Kawaguchi-ko —
drawn entirely in vectors, on a gallery wall, under a lamp you can move.

It is one HTML file. No framework, no runtime dependencies, no network
requests: the artwork is inline SVG, the soundtrack is synthesised live with
the Web Audio API, and the paper grain, the holographic foil and the lake are
all generated in the browser. Save the file anywhere and open it offline and
it behaves the same.

[PROJECT.md](PROJECT.md) is the brief — what the thing is for, the rules it may
not break, and how change is verified here.

**Live:** <https://fuji-postcard.vercel.app> _(replace with your own URL after the first deploy)_

---

## What it does

| Interaction                  | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move the pointer**         | the card tilts in 3D and the laminate is re-lit by a real lighting model — sheen, specular band and sparkle are computed from the lamp, not looped                                                                                                                                                                                                                                                                                                                                                         |
| **`F`** or click the card    | turn it over: the back is a real postcard, addressed and stamped                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **`S`** or Save the plate    | serialises the face you are looking at out of the DOM and downloads it as a standalone `.svg`                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`M`** or Play              | a ~5-minute soundtrack: koto-ish plucks on the D hirajōshi scale, a lake drone, a dotted-eighth delay. **Nothing plays until you ask** — no autostart, and `?silent` runs the whole piece with the output closed                                                                                                                                                                                                                                                                                           |
| **Enhance on/off**           | the effects switch, **off by default**. On adds the holographic laminate and its glow, the card's sway, the ten-petal shower, the reeds, the birds' crossing and the paper grain — about 2.3× the frame rate. Off leaves the lake: the mist, the glitter band and its crests, the wake, the boat and the man poling it, two ducks, a heron, four petals lying on the water, three birds in the far sky, three petals still coming down, slowly, and three places where something came up under the surface |
| **`prefers-reduced-motion`** | every animation is off, and the card stops moving entirely — `.face svg *`, not a list of names, so the promise cannot go stale                                                                                                                                                                                                                                                                                                                                                                            |

See [docs/motion.md](docs/motion.md) for what moves in the scene, how far, how slowly, and why each of those things moves at all.

## The repository

The page is one file because that is the point — but one 4,100-line file is
impossible to review. So the source is split into parts, and the single file is
the build artefact. The parts are real: the JavaScript is ES modules bundled by
rollup into one inlined IIFE per entry, not two files dropped into two script
tags sharing a global scope. Rollup rather than esbuild because it prints the
source as it was written — all 86 of the comments that explain why the audio
does what it does survive into the artefact (counted both sides: 86 in
`src/script/`, 86 in the two bundles in the page), and this project's reasoning
lives in those comments. The page still ships with no runtime dependency of any
kind.

```
src/
  template.html        the shell: head, wall, card, controls, footer
  styles/              01-wall 02-masthead 03-card 04-console 05-foil 06-motion
  art/
    front/             the picture in twelve ordered fragments (see below)
    back.svg           the addressed side: stamp, cancellation, address block
    gen/               parts the build renders: Plants Ducks Heron Birds
                       Floaters Petals Fish, each with its data, plus place.mjs
  script/
    card.js            tilt, flip, foil lighting, SVG export
    soundtrack.js      the transport: the bar clock, the meter, the Play button
    sound/
      score.mjs        the composition as data: tempo, scale, eighty bars
      graph.mjs        the signal path, built only when a person asks
      voices.mjs       the pluck, the drone, the lake
scripts/
  build.mjs            bundle the JS, render the generated parts, fill the slots
  check.mjs            validate the built page without a browser
  cdp.mjs              the DevTools client the browser tests share
  checks.mjs           the collect-and-report shape the browser tests share
  test-score.mjs       verify the composition as data
  test-contrast.mjs    keep the palette above WCAG AA
  test-layout.mjs      drive headless Chrome at real window sizes
  test-plate.mjs       keep the lettering off the frame rules
  test-ink.mjs         measure the contrast of the type printed on the card
  test-export.mjs      check the .svg the save button hands out
  test-interactions.mjs drive the buttons and shortcuts and read what happened
  test-motion.mjs      hold the page to its reduced-motion promise
  test-css.mjs         no rule selects nothing, no animation names nothing
  test-sound.mjs       the soundtrack, on a page nobody has touched
  perf.mjs             measure frame times over CDP
  serve.mjs            dependency-free static server
public/
  index.html           the built page (committed, so it can be opened directly)
```

`src/` is the truth. `public/index.html` is generated, and it is committed on
purpose: the repo stays openable with a double-click, and `npm run check`
fails if it has drifted from `src/`.

### The front is twelve fragments, in paint order

```
src/art/front/
  00-open.svg     the <svg>, its title, its description
  10-paint.svg    every gradient, filter and mask the picture is printed with
  20-cast.svg     the marks drawn once and placed by hand: tufts, reeds,
                  a heron, a duck, a blossom, a bud
  30-sky.svg      sky, sun, its rays, high clouds
  40-mountain.svg the ridges and the mountain, each ridge lighter than the last
  50-lake.svg     far shore, mist, low clouds, birds, the water and its mirrors
  60-shore.svg    torii, boat, bank, stones, driftwood, ducks, heron, grass
  70-cherry.svg   the branch and the petals coming off it
  80-print.svg    title strip, stamp, cancellation, plate inscription
  90-age.svg      foxing, soiling, grain, vignette
  95-frame.svg    the gilded rules, outside the clip
  99-close.svg    the </svg>
```

The build concatenates the directory in sorted order, and the sort order _is_
the drawing: in SVG a later element is a nearer one, so the file list is not
bookkeeping, it is the scene. That is also why the layers are fragments of one
`<svg>` rather than six stacked ones. The scene references 48 ids defined in
its own `<defs>` — the clips, the gradients, the mist and cloud filters — and
places the cast 60-odd times; id scope does not cross an `<svg>` boundary, so
separate layers would mean 48 duplicated paint servers, and SAVE THE PLATE
clones exactly one `<svg>`.

### Some of the scene is generated, from a component

Forty-five plant placements were forty-five hand-typed transforms. That is the
part of a drawing nobody re-reads, and it is where the repetition crept in: the
same five marks, mostly unrotated, rooted on three straight lines. So the
placements are data — `src/art/gen/Plants.data.mjs`, where each entry says
where a plant roots, how far it leans and whether it is taller than it is wide
— and `Plants.svelte` turns that data into `<use>` elements. The fragment that
used to hold the markup now holds one line:

```
          @GEN:Plants@
```

The build renders the component at build time and inlines the result. **Nothing
Svelte ships**: no runtime, no hydration markers (the build strips them),
nothing to fetch. The page is the same static SVG, and `<use>` is still the
mechanism, because that is what SVG's own instancing is for. What the component
buys is the ability to say a thing once, and to argue about the data instead of
the markup.

The migration was checked, not trusted: every placement in the built page was
compared, as a set of (mark, transform) pairs, against the hand-written block
it replaced. 45 before, 45 after, identical. And a placement that points at a
mark which does not exist fails the build — `check.mjs` resolves every
`url(#x)` and `href="#x"` against the ids the page declares, so renaming a mark
is a build error, not a plant that quietly stops drawing.

The split is then verifiable in a way a rewrite is not: `npm run build` after
moving the ranges must leave `git diff public/index.html` empty. It did. The
only diff the fragments themselves introduce is the twelve orientation
comments above.

## Commands

```bash
npm run build      # src/ → public/index.html (rollup bundles the JS)
npm run dev        # build, then serve on http://localhost:5173
npm run check      # fail if the built file is stale, then validate it
npm run lint       # biome over the JS (scripts/ and src/script/)
npm run fmt        # prettier over CSS, JSON and Markdown
npm test           # build + check + score + contrast + layout + plate + interactions + lint + format
npm run perf       # real frame times in headless Chrome over CDP, no dependencies
```

`npm run check` is the interesting one. Browsers are forgiving about exactly
the mistakes that break this page: an HTML comment closed with the two
characters that end a C comment silently swallows every filter defined after
it, and the artwork just stops rendering. The checker reports the line —
unterminated and malformed comments, unbalanced tags, duplicate `id`s,
references to ids that do not exist, ids that nothing references, and any
external `src`/`href`/`url()`, which would break the offline property (and the
SVG export) outright. It also cross-checks the export: every class the page
animates has to be matched by the filter in `card.js` that decides which CSS
rules get inlined into the downloaded `.svg`, or the plate you save is a still
image and nothing tells you. And every `d` in the file has to be a path: a
cubic written with two control points where it wants three does not fail, it
stops the parser at that command and the shape closes itself with a straight
line. Both stamps on this card carry the same little mountain, and both carried
the same broken curve — a pale shard across its right shoulder, and one line in
the console that nobody was reading.

### Performance, measured

`npm run perf` drives headless Chrome over the DevTools protocol — Node ships a
WebSocket client, so there is no dependency — puts the pointer on the card so
the lighting model is actually running, and samples `requestAnimationFrame`
intervals. Screenshots cannot tell you any of this, and `--virtual-time-budget`
lies about it because virtual time fast-forwards the clock.

The numbers on this machine, 4-second samples:

| Rendering                 | mean    | median  | frames over 33 ms |
| ------------------------- | ------- | ------- | ----------------- |
| Enhance on                | 38.9 ms | 33.4 ms | 239 / 240         |
| Enhance off (the default) | 18.1 ms | 16.7 ms | 20 / 240          |

The laminate is the whole cost, and the shape of the cost is worth knowing
before anyone tries to optimise it: `mix-blend-mode` has to read the backdrop,
so a single blended layer anywhere inside the card forces the whole 1880×1270
subtree to be re-composited every frame. Removing four of the five foil layers
changes nothing. Freezing the gradients changes nothing. Holding the card still
changes nothing. Only the presence or absence of the blend matters. The paper
grain and the drifting water are nearly free by comparison — about 2 ms each — and the rule was
confirmed a second time from the other direction: seven hand-drawn foxing
blooms cost 19.6 ms with `mix-blend-mode: multiply` and 18.1 ms without it,
which is the entire difference between a comfortable 55 fps and 42 late frames
out of 240.

The rule has a boundary, and measuring it found the boundary wrong. The back of
the card carries a full-bleed `multiply` rect of its own, and with the card
flipped it runs at **16.6 ms mean, 16.7 ms median, 0 of 240 late frames — a
locked 60**. A blended layer forces the subtree to re-composite, but on the back
there is almost nothing animating to re-composite. The front's 18 ms is its
mist, ripples, wake and petals, not its foil. Blend cost is a function of what
else is moving, so "is the blend expensive" is the wrong question; "what is
moving underneath it" is the right one.
but they are what stand between 45 fps and a locked 60, so Enhance carries them
too.

So Enhance is the effects switch, and it starts off. Turn it on and the page
samples its own frame intervals for a second and, if the **median** gap is over
24 ms — a typical frame missing a 60 Hz vsync — turns it back off and says so in
the button: `Enhance off · smooth`. The median rather than the mean or the share
of late frames, because the distribution is bimodal and both of those fire on a
perfectly usable 45 fps page. Switch it on a second time and the page stops
second-guessing you — two clicks is a decision, not an accident. The decision
lands about 1.5 s after navigation, and `<html data-probe>` records what the page
measured, so "why is this off on my machine" has an answer. Whatever you choose
is remembered. The exported `.svg` is unaffected — a saved plate is always the
full artwork.

`npm run test` also runs `scripts/test-score.mjs`, which lifts the score out
of the soundtrack IIFE and evaluates it as plain data — no DOM, no Web Audio.
It checks the form (80 bars, ten eight-bar phrases, ~4 min 50 s), that every
pitch is in D hirajōshi, that no note starts outside its bar or overlaps
another note of the same voice, that at least 70 of the 80 bars are
distinct, and that no bar comes back at a distance it comes back at every
other time — rule 2 applies to what you hear as much as to what you see, and
a listener can count an interval just as well as an eye. No phrase is a copy
of another phrase.
Those are mistakes you can only hear, and by the time you hear them you have
listened to four and a half minutes.

`scripts/test-layout.mjs` drives a real headless Chrome over CDP at seven
window sizes and fails if the card is not fully in view, the page scrolls
sideways, the plate drifts off 3:2, or any control is not completely inside the
viewport. It exists because on a 1180×900 laptop window every button on the page
sat 101 px below the fold while the card was in it, and the page looked like a
page that simply needed scrolling. A caption and a colophon may scroll; the
controls may not. If Chrome is not installed the test says so and passes — a
missing browser is not a broken page.

`scripts/test-plate.mjs` measures the lettering against the rules of the frame,
in the artwork's own user units, and fails if a rule crosses a letter or comes
within a unit of one. The plate inscription had been set at y=588, below both
frame rules at 579 and 586, so both rules and the bright glint that rides the
outer one were drawn straight through `KAWAGUCHI-KO · JAPAN`. Every screenshot
of the card was taken at a size where that is four pixels, and the type is
deliberately faint, so it survived. The frame is what makes the card a plate, so
the type moved: its baseline now rests 5 units above the inner rule, and the
closest letter box — the ink shadow, which is set 1.2 units lower — sits 1.5
units clear of it.

The same test then found the same bug on the face nobody had measured. Its rule
list was a pair of selectors naming the front's gilded frame, and the back's
frame is a plain double rule with different names, so the back produced no rules
and was skipped without a word. It also mapped boxes through the back's matrix,
which is mirrored — `a` is negative — so the boxes came out inside-out. The rule
set is now found by what a rule is: a stroked, unfilled outline, or a straight
mark with no rise, running most of the way across the plate. 34 bands on the
front, 16 on the back. The back's `PAR AVION · BY AIR MAIL` was sitting at
y=571 with the inner rule at 569 printed through the middle of the word and the
outer rule 0.4 units under it; it now rests above the border, 2.29 units clear.

`scripts/test-ink.mjs` measures the contrast of the type printed on the card,
which `test-contrast.mjs` never covered — that one reads CSS custom properties,
and the artwork's ink is a gradient over paper that is itself a gradient, foxed,
grained and vignetted, under group opacities. It takes one screenshot per face
and reads the pixels: the background for a mark is the median of the ring of
paper just outside it, in the same frame, because two screenshots of this page
are never identical — the mist and the water are moving. The ink is the pixel
inside the box that differs from that background most, which is the most
generous reading a mark can be given. The floor is WCAG's large-print 3:1, not
the 4.5:1 the chrome is held to: this is a hundred-year-old card and some of its
marks are meant to be weak strikes, but none of them is meant to be gone.

It found three on the back — the air-mail caption at 2.19:1, the postmark's date
at 2.37:1, `CORRESPONDENCE CARD · 郵便はがき` at 2.98:1 — all of them faint
because a whole group had been faded for the sake of the marks inside it. A
group opacity cannot be undone from inside, so the type left the groups: the
stripes and rings keep their .55 and .45, the letters now sit at .78 and .72,
and the three measure 3.24, 3.36 and 3.75. It also caught a bug in itself. The
first version skipped a mark that painted nothing, on the grounds that the
turned-away face cannot be measured; that is how a postmark whose type had been
translated twice — and was off the plate — passed. A mark on the face being
looked at that paints nothing is now a failure. 43 marks measured.

`scripts/test-export.mjs` checks the file SAVE THE PLATE hands out. The export
is its own program — it clones one face, gives it an xmlns and a size, and
pastes in the subset of the page's CSS that a regular expression thinks the
file needs — and every step there can fail in a way the page never shows. It
catches the Blob the page produces and runs the same path-data and id rules
over those bytes that `check.mjs` runs over the page (both now live in
`scripts/svg-check.mjs`), then adds two that only exist here: every rule the
page applies to a class inside that face has to be in the file, and the file
has to open in a browser as the same number of shapes it came from. The first
version of the class check looked at nothing, because it asked every rule
whether it had a `cssRules` list before asking whether it had a selector — and
a style rule has one now, for nesting, so every rule was descended into and
none was examined. It printed a pass. The count of rules examined is in the
output line now (34 on the front, 0 on the back, which carries no classes),
and giving a mark a class the export filter drops fails the test.

Four browser tests ask the questions that need a browser, each with its own
Chrome and its own page, because the answers depend on what has happened to the
page before the question:

- `scripts/test-interactions.mjs` makes the page do the things it promises and
  reads back what happened: the pointer walks the glint ray and tilts the card,
  `F` turns it over, `S` downloads the face that is showing (caught by wrapping
  `HTMLAnchorElement.prototype.click`), Enhance and the volume slider respond,
  and no page exception is thrown. It also collects the errors the browser
  itself raises while parsing the page — a malformed path is one of those, and
  it appears there and nowhere else.
- `scripts/test-motion.mjs` holds the page to both of its motion promises.
  Under `--force-prefers-reduced-motion` it wraps `requestAnimationFrame` and
  fails if a settled page asks for frames — it asks for none — and it fails if
  anything inside a face still has an animation running. With motion allowed it
  fails if the lake has been switched off along with the laminate, and it
  samples every animated mark twice three seconds apart to check rule 2 over
  time: no two nearby marks may share a period or be whole multiples of one
  another.
- `scripts/test-css.mjs` asks whether the stylesheet is telling the truth about
  the page: every selector must match something that exists, and every
  `animation` must name a `@keyframes` block that exists. A stylesheet cannot
  be seen to be dead, which is how a rule drifting a water band sideways for
  47 seconds survived years of nobody having an element with that class.
- `scripts/test-sound.mjs` gets a page nothing has touched, which is the only
  place its bug was visible.

Rule 5 of the brief says none of this may break, and until now the only thing
enforcing that was somebody remembering to click the buttons.

Headless Chrome will not let anyone _hear_ the soundtrack, but with
`--autoplay-policy=no-user-gesture-required` its `AudioContext` clock runs, so
the graph can be measured instead: how many nodes it creates, when each was
told to start, and whether the melody keeps its place. That is how both
soundtrack bugs were reproduced, and both are now asserted.

The page answers to `?silent`: the piece is built, the clock runs, the meter
moves, and the last gain before the speakers is closed, so nothing reaches the
room. Every harness loads the page that way, and so can you. It is there
because a test run presses Play and presses M on a real browser, and a browser
on a desk has speakers — four test passes a minute is a room full of koto. The
output is gated rather than the graph skipped, because a soundtrack that was
never built is not the soundtrack being tested. Chrome is also launched with
`--mute-audio`; the query parameter is the part that works in a real browser.

And the page no longer starts the music itself. It used to: if the browser
allowed it the piece began on load, and failing that the first click or
keypress anywhere began it. A preview reload, a harness, or a permissive
autoplay policy made sound at people who had not asked for any, and picking the
card up — the first thing anyone does — counted as permission. The Play button
and `M` are the only ways in now, and the audio graph is not built until one of
them is used. The interaction test runs with autoplay allowed, which is the
condition the old code autostarted under, and its first assertion is that
nothing is playing: `aria-pressed false, audio nodes 0`.

The first bug was reported, not measured: _the music restarts by itself_. It
did — a gesture on the play button was not treated as a gesture, so the
ordinary sequence, press Play, press Play again to stop it, then pick the card
up, threw the whole piece back from bar 1. The test drives exactly that order
on a page nothing has touched, and counts audio nodes rather than trusting what
the button says: 27 → 27 now, 27 → 54 then. A button reading Play while the
scheduler writes another bar is the difference between an indicator and a fact.

The second only shows up when the page stops getting time — a background tab, a
long collection, a wake from sleep. The test blocks the main thread for five
seconds with the music running and then asks whether anything was told to start
behind the audio clock. One thing had been: the drone, whose gain was ordered
to rise from silence at a moment two seconds gone, so it arrived two thirds
swelled, out of nowhere, and fell away again. It is the one sound on this page
that reads as a beginning, and it was arriving without one. The notes already
guarded themselves; the drone is now anchored to where the clock actually is.

## Deploying to Vercel

The project is already configured (`vercel.json`): `npm run build` runs, and
`public/` is served as a static site.

```bash
npx vercel        # preview
npx vercel --prod # production
```

No server, no environment variables, no rewrite rules.

## A note on the artwork

Everything is drawn, not photographed: the seigaiha wave pattern on the wall
tiles on a 64 px lattice whose fan centres sit so that an arc cut at one edge
is finished by its twin at the opposite edge; the paper fibre and the foil
sparkle are `feTurbulence` fields with the filter region pinned to exactly the
tile box, because the default region crops the tile and shows a seam; the
mountain's reflection is the mountain itself, mirrored and clipped _inside_
the mirrored space so the reflected snow cannot spill outside the reflected
body; and the water is three slow drifts that are deliberately never in step.

The laminate over the artwork is `soft-light`, not `color-dodge`. Dodge
divides the backdrop by its complement, so a saturated band over dark ink
does not tint it — it erases it, and the branch went from `#3a2a2c` to a
khaki no laminate could account for. The control was the same artwork
rendered with the foil hidden.
