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

| Interaction                  | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move the pointer**         | the card tilts in 3D and the laminate is re-lit by a real lighting model — sheen, specular band and sparkle are computed from the lamp, not looped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **`F`** or click the card    | turn it over: the back is a real postcard, addressed and stamped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **`S`** or Save the plate    | serialises the face you are looking at out of the DOM and downloads it as a standalone `.svg`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **`M`** or Play              | a ~5-minute soundtrack: koto-ish plucks on the D hirajōshi scale, a lake drone, a dotted-eighth delay. **Nothing plays until you ask** — no autostart, and `?silent` runs the whole piece with the output closed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Enhance on/off**           | the effects switch, **off by default**. On adds the holographic laminate and its glow, the card's sway, a faster shower, the reeds, the birds' crossing and the paper grain — about 2.4× the frame rate. Off leaves the lake: the mist, the glitter band's six crests each on its own clock, the wake, the boat and the man poling it, two ducks, a heron, four petals lying on the water, three birds in the far sky, ten petals coming down off the branch, slowly, the branch itself swaying with every blossom on it swinging its own way, three places where something came up under the surface, and the water's own mirrors — the mountain, the gate, what the ducks leave — with the rings where the posts and the heron stand in it and the bands the surface lays across the gate |
| **`prefers-reduced-motion`** | every animation is off, and the card stops moving entirely — `.face svg *` with `!important`, not a list of names, so the promise cannot go stale and does not lapse when Enhance is switched on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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
  styles/              nine files, in an order the build states rather than
                       sorts: wall masthead card console foil motion narrow
                       quality height
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
  register-svelte.mjs  teach Node to read a .svelte file, for the build only
  check.mjs            validate the built page without a browser
  cdp.mjs              the DevTools client the browser tests share
  checks.mjs           the collect-and-report shape the browser tests share
  svg-check.mjs        the path-data and dangling-<use> rules two checks share
  run-tests.mjs        the suite itself: every test script, two lanes, one verdict
  test-build.mjs       prove the shipped page is the same document, stylesheet and picture
  test-score.mjs       verify the composition as data
  test-contrast.mjs    keep the palette above WCAG AA
  test-layout.mjs      drive headless Chrome at real window sizes
  test-plate.mjs       keep the lettering and the placed marks off the rules
  test-ink.mjs         measure the type's contrast, and that printed rules run
  test-cast.mjs        no mark in the cast is the same mark twice
  test-visible.mjs     hide every placed mark in turn and see whether the page notices
  test-export.mjs      check the .svg the save button hands out, and photograph it
  png.mjs              enough of a PNG decoder to compare two of them
  pdf.mjs              enough of a PDF reader to count sheets and measure paper
  test-interactions.mjs drive the buttons and shortcuts and read what happened
  test-motion.mjs      hold the page to its reduced-motion promise
  test-nojs.mjs        load the page with script switched off and see what is left
  test-degrade.mjs     take a feature away before the page runs and load it anyway
  test-keys.mjs        the page driven with Tab, Enter, Space and the arrows
  test-print.mjs       what comes out of a printer, and how big the sheet is
  test-css.mjs         no rule selects nothing, no animation names nothing
  test-sound.mjs       the soundtrack, on a page nobody has touched
  perf.mjs             measure frame times over CDP
  look.mjs             photograph one mark, big, for the questions pixels answer
  serve.mjs            dependency-free static server
public/
  index.html           the built page, comments taken out — the one a host serves
  index-full.html      the same page with the reasoning written beside every mark
```

`src/` is the truth. Both files under `public/` are generated, in one run, from one
string, and both are committed: the repo stays openable with a double-click, and
`npm run check` fails if either has drifted from `src/`. `index-full.html` is the
artwork with its argument — 152 markup comments, 55 CSS comment blocks and 17 KB
of JS comments. `index.html` is the same page with all of that taken out, the
indentation trimmed, and the stylesheet and the two bundles put through esbuild's
minifier: 122 KB rather than 251. The names are the point — a static host answers
`/` with `index.html`, so the file every visitor downloads is the small one and no
rewrite rule is needed to make that true. `test-build.mjs` proves the smaller one
is the same document (1,125 nodes walked and compared), the same stylesheet (294
rules, selectors, keyframes and all) and the same picture (0 of 1,657,150 pixels
differ).

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

### The stylesheet's order is written down

Nine CSS files, and the build reads them in an order it writes into the page:
each file becomes a cascade layer, and the first line of the stylesheet is
`@layer wall, masthead, card, console, foil, motion, narrow, quality, height;`.
Before that the order was a directory listing sorted by name, which is a real
order but not a chosen one — `.card` is styled in `03-card.css` and again in
`05-foil.css`, and a file named `07-foo.css` would have landed between motion
and quality without anyone deciding it. A stylesheet in the directory that is
not in the build's list fails the build instead of sorting itself in.

One consequence of layers is worth knowing before reaching for them:
`!important` reverses layer order, so between two important declarations the
_earlier_ layer wins. The page has exactly two — the reduced-motion promise and
the Enhance-off kill rule — and both set `animation: none`, so the reversal
changes nothing here.

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

The other direction is a build error too. The build pulls components by looking
for markers in the page, so a file in `src/art/gen/` that no marker asks for is
dead source that looks alive — an unwired stand of reeds draws nowhere, and the
page is one file narrower than anybody thinks. It now fails the build with the
file named and the line to add.

A third direction is the one that actually bit. `check.mjs` walks the markup
carrying what `fill` and `stroke` mean at each depth, and reports any shape that
has neither — because both are inherited, and a group that says `fill="none"`
says it for every descendant that does not name its own. The bent reed's head and
the seeded tuft's two seeds set `stroke="none"` inside groups that set
`fill="none"`, so between the two attributes they painted nothing: the reed's
stem ended in a bare point with a short curve of tip floating above the gap where
its head should have been, and the plant the file calls _a tuft that has gone to
seed_ had no seed on it. The geometry was right, the comment was right, and the
ink was not. Shapes inside a `clipPath` or a `mask` are not ink and are left
alone.

The split is then verifiable in a way a rewrite is not: `npm run build` after
moving the ranges must leave `git diff public/index.html` empty. It did. The
only diff the fragments themselves introduce is the twelve orientation
comments above.

### Working on one mark at a time

The picture is already in pieces you can work on separately: eleven fragments in
paint order, twenty marks in the cast, seven data tables that say where each
copy of a mark stands. Three things make them less independent than they look.
Paint order is the picture, so a fragment's name is part of its drawing and
moving one is a redraw, not a refactor. No fragment may `<use>` anything in
another, because the exported plate has to be one file. And every mark is
judged against its neighbours — a reed that is right on the bank is wrong
against the snowcap.

`node scripts/look.mjs` is how one of them gets looked at. It loads the page
with motion held off, so two runs agree pixel for pixel, and photographs one
element at a chosen zoom:

```
node scripts/look.mjs                          the whole front, at 2×
node scripts/look.mjs 'use[href="#heron"]' 16  the heron, at 16×
node scripts/look.mjs --back                   the other face
node scripts/look.mjs --box=330,120,240,150 5  a region of the plate, at 5×
```

The size comes back in css px and in the artwork's own units, because a css px
changes when the window does and a unit does not. A crop of an element carries a
margin of its own, since a mark's neighbours are what give it its meaning; a
crop named by `--box` gets none, because the whole point of naming a region is
that the next crop of it lands on the same rectangle. That is what makes a
before-and-after honest: the snow cap's own box grew ten units taller the day
its snowline was redrawn, and the two crops could not be compared at all.

Six marks were found wrong this way and fixed: the heron's folded wing, an
almond of lighter ink that hung 4 units below the belly and 4 units past the
back edge, so the silhouette read as two birds, one sagging under the other; the
boatman, sitting 3.5 units above his own boat with two straight chords for
sides; the torii, lit on the inner edge of each post because the shading was
mirrored with the gate while the sun at (620, 206) was not; the snowline, five
round scallops of nearly equal depth; the little Fuji doodled on the back, whose
summit was a needle and whose snow cap stood outside the slopes it was capping —
corners at ±9 units, where the slopes at that height are at ±7.9; and the real
Fuji's apex, four straight chords turning 58° in a single two-unit step at the one
place everybody looks, with its crater drawn as a plate lying 20 units below the
notch. The wing and the snow cap are guarded by `test-visible.mjs` walking the
outline of any detail marked `data-on` and failing if any of it falls outside the
shape it belongs to, whether that shape is a mark in the cast placed by a `<use>`
or a path drawn in place. The apex is guarded by the same script walking the
mountain's outline two units at a time and failing any step that turns harder
than 30°: the crater's lip survives that at 24.5°, the old chords did not at
58.3°. The rest are recorded in the comments beside the paths that were wrong.

## Commands

```bash
npm run build      # src/ → public/index.html and public/index-full.html
npm run dev        # build, then serve on http://localhost:5173
npm run check      # fail if the built file is stale, then validate it
npm run lint       # biome over the JS (scripts/ and src/script/)
npm run fmt        # prettier over CSS, JSON and Markdown
npm test           # build + check + every test in scripts/ + biome + prettier
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

The same run then looks at the repo, because two of the ways this project fails
are not in the page at all. Every `test-*.mjs` in `scripts/` has to appear in
the `npm test` chain, and every script the chain names has to be on disk. A
browser test that is written and never run is a check in exactly the way a
stylesheet rule with no element to select is a check: it reports nothing, the
page looks fine, and the thing it was written for goes back to being unverified
— one of these tests sat in `scripts/` for a whole session, passing when it was
run by hand and saying nothing to anybody afterwards. And every file in
`scripts/` has to appear in the listing above, which is how anyone finds out it
is there.

The tests run two at a time. `scripts/run-tests.mjs` takes the seventeen scripts
and drives them in two lanes, which is a measured answer rather than a guess: two
lanes give 204 seconds of work in 116 seconds of wall and every test still takes
the time it takes alone, while four lanes give 660 seconds of work in 403 seconds
of wall, because each test is a Chrome with its own renderer threads and they are
all asking for the same cores. Before the runner the suite was a chain of `&&` in
`package.json`: 3 minutes 54 seconds of wall against 35 seconds of work, the
machine sitting idle while a headless browser waited for a page to settle. Two
tests had to move first — test-build and test-layout were both on port 9377,
test-css and test-ink both on 9389 — which was invisible in a serial suite and a
"port is already serving a Chrome" failure the moment it was not. The chain rule
still holds with a runner in the middle: a test may be reached through the
runner's list, and that list is checked against the directory in both directions.

### Performance, measured

`npm run perf` drives headless Chrome over the DevTools protocol — Node ships a
WebSocket client, so there is no dependency — puts the pointer on the card so
the lighting model is actually running, and samples `requestAnimationFrame`
intervals. Screenshots cannot tell you any of this, and `--virtual-time-budget`
lies about it because virtual time fast-forwards the clock.

The numbers on this machine, 4-second samples of 240 frames, both tiers in one
run:

| Rendering                 | mean    | median  | p95     | worst | frames over 33 ms |
| ------------------------- | ------- | ------- | ------- | ----- | ----------------- |
| Enhance on                | 40.6 ms | 33.4 ms | 50.1 ms | 83 ms | 237 / 240         |
| Enhance off (the default) | 16.6 ms | 16.7 ms | 16.8 ms | 17 ms | 0 / 240           |

The laminate is the whole cost, and the shape of the cost is worth knowing
before anyone tries to optimise it: `mix-blend-mode` has to read the backdrop,
so a single blended layer anywhere inside the card forces the whole 1880×1270
subtree to be re-composited every frame. Removing four of the five foil layers
changes nothing. Freezing the gradients changes nothing. Holding the card still
changes nothing. Only the presence or absence of the blend matters. The paper
grain and the drifting water are nearly free by comparison — about 2 ms each — and the rule was
confirmed a second time from the other direction: seven hand-drawn foxing
blooms cost 19.6 ms with `mix-blend-mode: multiply` and 18.1 ms without it
(both measured against the page of that day, whose quiet baseline was 18.1 ms
before the gentle set), which is the entire difference between a comfortable
55 fps and 42 late frames out of 240.

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
is remembered — except where the browser will not allow it: private mode,
cookies blocked and a sandboxed frame all make `localStorage` throw the moment
it is touched, and there the choice holds for the visit and is simply not
carried to the next one. The exported `.svg` is unaffected — a saved plate is
always the full artwork.

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

The same walk now asks about the other thing a rule carries. The gilded
inscription rule ends at each side in a small filled lozenge, and a lozenge is
the one printed mark small enough that a scene mark touching it stops reading as
two things: a reed whose root landed on the left one read, for as long as anyone
looked at it, as a grey diamond growing out of the bank with a stalk for a stem.
Nothing had been drawn wrong — the plant had been planted where the print was. So
every placed mark is now walked as the points it actually draws, through its own
transform and its own placement, and asked whether any of them falls inside a
terminal. Boxes will not do this: the reed leans, so the wide part of its box
sits 40 units above the ground it touches. The reed now stands 10 units right of
the lozenge, and the eight terminals on the front are clear.

The same test then found the same bug on the face nobody had measured. Its rule
list was a pair of selectors naming the front's gilded frame, and the back's
frame is a plain double rule with different names, so the back produced no rules
and was skipped without a word. It also mapped boxes through the back's matrix,
which is mirrored — `a` is negative — so the boxes came out inside-out. The rule
set is now found by what a rule is: a stroked, unfilled outline, or a straight
mark with no rise, running most of the way across the plate. 42 bands on the
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

The same screenshot then walks the plate's **printed rules** end to end. The
gilded frame is a gradient at .55, and where it crossed a pale cherry blossom the
gilt alone was barely a line: the frame read as four segments meeting at corners
rather than one line the picture passes behind. It is drawn as ink under the gilt
now — the same two rects, a dark line a little wider than the gold, because a
printed rule has an edge and those two shoulders are what carry it across a
bright ground. The check walks each rule once per unit and compares the pixel
under it with the pixels just off each side, in the same frame; a rule that comes
within 20 of colour of _both_ grounds for twelve consecutive units has stopped,
not faded. Either side, not both averaged: where a rule crosses the edge of
another mark the two sides are not the same ground at all, and averaging them
invents a ground the rule was never drawn on. Which marks count is said by the
artwork: they carry `class="print-rule"` where they are drawn. Guessing was tried
first, and it cannot tell a printed rule from a line that lies across two grounds
on purpose — the branch's dark underside is quiet against the branch for half its
length because that is what an underside is, and the lake's edge is hidden where
the reeds stand in front of it because that is what an edge behind things is. The
whole plate was walked unscoped once the metric had been fixed, to see whether
the tag was still doing work: it is. A snow finger on the mountain's flank goes
quiet for 48 units, the lake's edge for 13, the branch's underside for 68, and
every one of those is the mark working as drawn. The measure is a colour
distance, not a contrast ratio: the frame's rule over the mountain's mauve slope
is 1.20:1 in luminance and plainly there, gold against mauve, and a
luminance-only check reports a defect that does not exist. Turning the title
strip's inner rule off reports `stops for 255 units … 0 of colour from its own
ground, against 12 over the rest of it`, at [63, 507] — card coordinates, so the
report names a place on the plate rather than a place inside a rotated group.

It is still a pixel measurement, and a pixel measurement has a size below which
it stops meaning anything. Run at a 360 px window on a 1× screen the plate is
0.37 device px per unit, so a 1-unit printed rule is a third of a pixel, and the
walk reports that the frame's inner rule `stops for 312 units` — true of that
screen, and nothing to do with the drawing: below one pixel of width what the
sampler finds depends on where the line's centre falls between two pixel
centres, its phase rather than its ink. So the plate's scale is a precondition
the check states instead of an assumption it makes: a rule thinner than one
device pixel is not walked, and the failure says what the card would have to be
for the walk to mean what it says (`900 css px wide at 1×` for a 1-unit rule).
The passing line names the scale it walked at. 15 rules walked at 2.09 device px
per unit; the longest quiet stretch on the card today is 0.7 of a unit.

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
output line now (42 on the front, 0 on the back, which carries no classes),
and giving a mark a class the export filter drops fails the test.

The browser tests ask the questions that need a browser, each with its own
Chrome and its own page, because the answers depend on what has happened to the
page before the question:

- `scripts/test-interactions.mjs` makes the page do the things it promises and
  reads back what happened: the pointer walks the glint ray and tilts the card,
  `F` turns it over, `S` downloads the face that is showing (caught by wrapping
  `HTMLAnchorElement.prototype.click`), Enhance and the volume slider respond,
  and no page exception is thrown. It also throttles the CPU eight times over
  CDP and waits: the page is supposed to notice the frame rate and turn its own
  expensive mode off. What is asserted is the page's rule and not the speed of
  the machine — the laminate stays if the median the page measured is at or
  under the threshold and goes if it is over — because the old version assumed
  the unthrottled pass would be fast, and on a loaded laptop the page dropped
  the laminate correctly, the check called that a defect, and the drop set the
  page's override flag so the throttled pass never probed at all and read back
  the previous window's number. The slow pass therefore runs on a freshly loaded
  page with storage cleared, and a third check requires that `data-probe` is
  gone while a new window is open: the recorded median belongs to the period
  that produced it. It also collects the errors the browser
  itself raises while parsing the page — a malformed path is one of those, and
  it appears there and nowhere else.
- `scripts/test-motion.mjs` holds the page to both of its motion promises.
  Under `--force-prefers-reduced-motion` it wraps `requestAnimationFrame` and
  fails if a settled page asks for frames — it asks for none — and it fails if
  anything inside a face still has an animation running, including after the
  laminate is switched on: Enhance's rules are more specific than the
  reduced-motion rule, and a media query carries no weight of its own. With motion allowed it
  fails if the lake has been switched off along with the laminate, and it
  samples every animated mark twice three seconds apart to check rule 2 over
  time: no two nearby marks may share a period or be whole multiples of one
  another — in either tier, because the second tier's periods were chosen by
  hand and had never been compared to each other. And it asks where each mark is in the still page and in the living
  one, because a mark that has been moved to the origin of the picture by a
  stylesheet transform looks exactly like a mark that was never drawn.
- `scripts/test-export.mjs` photographs the plate. The face on the card is
  captured, the file the Save button produced is opened in a browser and
  captured at the same size, and the two images are compared — averaged down
  4×4 first, because two rasterisers of the same vector artwork disagree along
  every edge and that disagreement is not what the check is for. Clean, the
  front differs by 0.19% of pixels and the back by 0.55%; delete one gradient
  from the file and it is 18.8%. The laminate is switched off for the
  comparison, and the file is put into the same rest state the page is in —
  the plate carries its animation rules and runs them, and comparing a still
  page to a turning file is 17% ray field and nothing else. The photograph
  cannot see a motion that is missing, because both pictures are still, so the
  twenty animation names the page's stylesheet declares for marks on the face
  are also looked for in the file's own stylesheet. The export decides what
  travels by matching rule text against a hand-kept list of class names, which
  is exactly the kind of list that falls behind.
- `scripts/test-cast.mjs` reads the data the build places and asks one question
  with a yes/no answer: is any mark the same mark twice? Two placements of one
  shape within 40 units have to differ visibly — by rotation, by scale, by skew
  — and no two placements anywhere may share a shape and a transform. It found a
  reed on the right shore 38 units from its twin with 2° and 0.07 of scale
  between them.
- `scripts/test-visible.mjs` renders the page, hides one placed mark, renders the
  patch where it lives, and compares. A mark that changes no pixels is a mark
  that is not there, whatever the data says. The question is asked at the middle
  of every animation's period with all of them paused — and, for anything that
  fails, again at fifty points across the period, because a ring that spreads
  across the lake takes four seconds out of ninety-seven and sampling at tenths
  steps straight over it. It found a fish whose ring was spreading under the
  near shore, on dry washi, twice a minute and a quarter, forever.
  It also walks every detail that says whose shape it belongs to with a
  `data-on` attribute: the outline of the detail is sampled, each point is
  carried into the shape's own coordinates, and the shape is asked whether the
  point is inside its fill. Two kinds of shape answer — a mark in the cast,
  placed by one `<use>`, where the walk has to undo the translate, the mirror and
  the scale; and a shape drawn in place, where the two elements' own CTMs are
  enough. The heron's folded wing — one almond of a slightly lighter ink — failed
  it by 4 units below the belly and 4 units past the back, which is not a wing on
  a bird but a second bird sagging under the first. The snow cap on the little
  Fuji doodled on the back failed it by 10 of 40 points, its lower corners
  standing outside the slopes it was capping. Every other check passed both: the
  marks are visible, in the right place, and the right colour.
- `scripts/test-plate.mjs` measures every `<text>` on a face against every rule
  on that face, in the artwork's own units, and it measures it twice: once in
  the fonts the page names, once with all of them taken away. Every font the
  page names — Iowan Old Style, Hiragino Mincho ProN, Yu Mincho, Songti SC — is
  a macOS font, and how wide a line of lettering is belongs to the font, not to
  the page. Under the generic serif the back's widest line grows from 263 to
  292 units and still clears the rule. The same pass measures the placed marks
  against the edge of the plate, because the picture runs to that edge and the
  border prints over it: a mark past the border is standing in the blank margin,
  and a mark past the edge is a plant sliced in half by the card. It found a reed
  at x 892–912 on a plate 900 units wide. It also asks, of the cast alone,
  whether anything is painted on top of a letter — paint order, not just
  overlapping boxes, because a petal behind the title box is the picture and the
  same petal in front of it is a smudge across a glyph. Renaming the cherry
  fragment so it paints after the print fragment makes it fire. And it asks
  whether a placed mark is drawn inside one of the rule terminals — the lozenges
  the inscription rule ends in — by walking each mark as the points its paths
  actually draw rather than as a box: putting the reed's root back on the left
  lozenge reports `#reedC M0 0 C1 -12 1 is drawn at [110,543] inside the terminal`.
- `scripts/test-nojs.mjs` switches script execution off and loads the page. The
  artwork is in the markup and the motion is opt-in, so the picture is there
  whole; what cannot work is the row of controls, so they are not allowed to look
  like they do — no underline, no pointer, no key hints, and a line that says
  what is the case. The same measurements are then taken with script running and
  every one must differ, or the test is measuring the layout rather than the tier.
  The tier is then printed: the face that comes out has to be the front — the
  attribute that picks the other one is written by a `beforeprint` handler that
  never runs here — with none of the screen furniture on it, on one 148 × 100 mm
  sheet.
- `scripts/test-degrade.mjs` takes a feature away before the page's own script
  runs and loads the page anyway. Two of the page's dependencies are not in every
  browser — Web Audio, and `localStorage`, which throws on touch in private mode
  and with cookies blocked — and both have a fallback written beside them. A
  fallback is the tier most likely to be wrong and the only tier nobody visits,
  so it is visited deliberately: with no `AudioContext`, `#sound` must have no
  client rects at all rather than a Play button that does nothing, and the flip,
  Enhance and the save must still work and throw nothing; with storage that
  throws, the card must still turn over — the picture is in the markup, so
  measuring it again would measure the layout rather than the tier, and the
  guarded read sits 54 lines into a file whose first line already set the `.js`
  class, so only something the script does at the end proves it got that far.
  Deleting the `display: none` branch, or either `try`/`catch`, makes it fire.
  The third fallback, a resize listener standing in for `ResizeObserver`, is not
  checked: the measurement feeds one ratio, the card's aspect ratio is fixed at
  3:2, and no window size changes anything a check could see.
- `scripts/test-print.mjs` asks the page in print media what is actually on the
  paper, and asks Chrome for the paper itself. The wall, the studio's name, the
  title, the plinth label and every control have to be gone; the card has to lie
  flat even though the frame loop is writing a tilt into it every frame; the sheet
  has to come back one page at 148 × 100 mm, which is the 3:2 the artwork was
  drawn in; and after turning the card over, the face that prints has to be the
  back, on one sheet as well. The sheet itself is measured by
  `scripts/pdf.mjs` — enough of a PDF to count the pages and read the MediaBox —
  which this test and the one without script now share, because a PDF's page tree
  sits wherever the writer put it and reading the header finds nothing.
- `scripts/test-keys.mjs` drives the page with Tab, Enter, Space and the arrow
  keys and reads back what happened: which element has focus, what its focus ring
  is drawn with, what the card's angle is, what the slider's value is. Every
  control has to be reachable, has to show where it is, and has to do with Enter
  what it does with a click.
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
told to start, whether the melody keeps its place, and whether the five bars
beside the Play button are measuring the sound or remembering a shape — they are
read twelve times while the piece runs, and no column may sit pinned at the top
while another never leaves the floor. That is how both
soundtrack bugs were reproduced, and both are now asserted. The volume slider is
measured at the same level: the master gain — found as the node that feeds the
compressor, not the one at the speakers, because the one at the speakers is the
`?silent` gate and is deliberately closed — reads 0.303 at 55, 0.000 at 0 and
0.550 at 100. A slider whose fill tracks its value while the gain never changes is
the easiest lie on a page to tell.

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

No server, no environment variables, no rewrite rules — and that last one is why
the build writes two files. A static host answers the root of `public/` with
`index.html`, so the file at that name is the one every visitor downloads, and
the build puts the page with its comments taken out there: 119 KB rather than the
239 KB of the annotated `index-full.html`. A rewrite sending `/` somewhere else
would be one more thing that can quietly stop being true, so `test-build.mjs`
asserts the opposite instead — that `outputDirectory` is `public`, that nothing
rewrites `/`, and that the file named `index.html` is the smaller of the two.

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
