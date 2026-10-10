# 富士山 · Light on Paper — what this project is

A short brief you can hand to a person or an agent. It says what the thing is,
what it has to feel like, the rules it may not break, and how to tell whether a
change worked.

---

## The idea in one paragraph

One illustrated postcard — Mount Fuji at dawn, seen from Kawaguchi-ko — drawn
entirely in vectors and lying on a gallery wall under a lamp you can move.
Pick the card up and it tilts; the light on it is computed from where your
pointer is, the way light on a real laminated print actually behaves. Turn it
over and there is the back of a card somebody posted: a message in ink, an
address, a stamp with a cancellation over it, a small drawing of the mountain
in the corner. Press play and about five minutes of music, synthesised live in
the browser, plays under the picture. Save the plate and you get the artwork
out as a clean, standalone SVG.

It is one HTML file. No framework, no runtime dependencies, no network
requests. The artwork is inline SVG, the soundtrack is Web Audio, the paper
grain and the foxing and the lake are generated in the browser. Copy the file
to a USB stick in 2035 and it still works.

## The feeling the whole thing is chasing

**An object, not a web page.** The test for every decision is: would a real
print made a hundred years ago and handled since then have this? A print has
foxing — thousands of small rust specks, and a few large soft blooms where
something wet sat on it for a decade. It has a cut edge that catches light and
an edge that is dirtier than the middle. It has one crease from being folded,
not four. Its lettering sits at the foot of the sheet like a plate inscription,
small and low in contrast, because the picture is the point.

**Weather, not animation.** The mist over the lake breathes on a 78-second and
a 103-second cycle — periods with no common factor, so they are never in step
and the scene never visibly repeats. The amplitude is deliberately below the
threshold of _did that just move_. Anything faster stops being weather and
starts being a widget.

**Restraint as the highest quality.** The lake is nearly empty, because a dawn
lake that still holds almost no marks of its own. What is on the water is what
is _happening_ to the water: the sun's path, and the water moving around the
posts, the hull and the birds. Thirty-odd pale dashes scattered over the
surface as "texture" were deleted, not tuned — texture with no cause reads as
noise. The same rule removed four circles from the corners and a bright line
down the left edge.

> Less is more. Nothing needs to be added for its own sake. Whatever stays has
> to be perfect, and has to have a reason.

## The rules

1. **Every mark has a cause.** If you cannot say what the viewer is seeing a
   _picture of_, delete it. This is the single most productive rule in the
   project; most of the improvements have been subtractions.
2. **Nothing repeats at even intervals.** Regularity reads as made, not as
   seen, and it is the single most common defect in this artwork. The sun's
   rays were sixteen spokes at exactly 22.5°; the birds were one path stamped
   out at three sizes; the far tree line was twenty-four identical isoceles
   triangles sharing one straight baseline. Varying the _size_ of a repeated
   thing is not enough — spacing, proportion and alignment each have to vary
   on their own, and the gaps are what make a cluster legible.
3. **Light is computed, not looped.** The sheen, the specular band and the
   sparkle come from a lighting model driven by pointer position. A CSS
   animation that fakes a highlight is a loop, and loops are detectable.
4. **The effects are opt-in.** One switch — Enhance — carries the holographic
   laminate and its glow, the card's sway, the falling petals, the drifting
   water and the paper grain. It is **off by default**, because one
   `mix-blend-mode` layer over the card roughly halves the frame rate. What
   stays on regardless is the artwork itself: the sun, its bloom, the mist.
   Those are not effects bolted onto the picture.
5. **Nothing may be broken to make something look better.** Flip, export,
   audio, keyboard shortcuts and reduced-motion must all keep working after
   every change, verified rather than assumed.
6. **The exported plate is the full artwork.** A saved `.svg` is always the
   whole drawing, whatever the page is currently rendering.
7. **The page ships with zero dependencies.** The artefact is one
   self-contained file: nothing to fetch, nothing to install, it opens from the
   file system and works on a plane. The checks and the perf harness are plain
   Node over the DevTools protocol. The _toolchain_ may use packages — a
   bundler, a component compiler — provided what they emit is static markup and
   script that stands entirely on its own. A devDependency is allowed; a
   runtime dependency is not, and the bundle is inlined rather than linked.
8. **Sound is never imposed.** Nothing starts the piece but the Play button
   and `M`, and the audio graph is not built until one of them is used. A
   page that makes sound at someone who did not ask for music has decided
   something about them that is not its business. Tests load the page with
   `?silent`, which runs the real graph with the output closed.

## How it is put together

`public/index.html` is a generated artefact and is committed on purpose, so the
repo can be opened with no build step. It is concatenated from parts by
`scripts/build.mjs`:

| Part                       | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `src/template.html`        | the shell, with whole-line markers `@CSS@`, `@SVG_FRONT@`, … |
| `src/art/front/`           | the picture in twelve fragments, sorted into paint order     |
| `src/art/back.svg`         | the other side: message, address, stamp, cancellation        |
| `src/art/gen/`             | parts rendered at build time from a component and its data   |
| `src/styles/*.css`         | nine numbered files, applied in sorted order                 |
| `src/script/card.js`       | tilt, lighting model, flip, export, Enhance                  |
| `src/script/soundtrack.js` | the whole score as data, plus a small Web Audio engine       |

Front and back deliberately duplicate their stamps and edge wear. A cross-file
`<use>` would make the export produce a broken single SVG.

## How change is verified here

This is the part that makes the rest of it work. Screenshots lie, so the
project built tools to stop being fooled:

- **`npm run check`** — structural checks on the built file: XML comments that
  would break the export, animation classes the export would silently drop,
  keyboard shortcuts advertised by a `<kbd>` or the README but not handled by
  any code, ids defined and never used, and path data whose commands run out of
  arguments.
- **`npm run test`** — check, plus the score imported as the module it is
  (80 bars, ten phrases, 305 notes, 4.85 min), plus a contrast check on the ink
  against the paper, plus the lettering measured against the gilded frame in
  user units, plus the buttons and shortcuts driven over CDP and their effects
  read back, plus the stylesheet asked whether every selector matches something
  on the page and every animation names keyframes that exist, plus Biome and
  Prettier.
- **`npm run perf`** — a zero-dependency Chrome DevTools Protocol harness that
  puts the pointer on the card so the lighting model actually runs, then
  samples `requestAnimationFrame` intervals. Screenshots cannot tell you any of
  this, and `--virtual-time-budget` lies about it.
- **Headless renders at 2× and 4×, always with
  `--force-prefers-reduced-motion`** — without it, roughly a third of headless
  renders drop composited tiles and you spend an afternoon chasing a bug that
  only exists in the screenshot machinery.

The habits that keep paying off:

- **Negative-test every new check** by deliberately breaking the thing it is
  supposed to catch. A check that passes on a broken page is worse than none.
- **Keep a control render** when diagnosing a visual discrepancy.
- **Measure geometry in the artwork's own units.** The gilded frame rules and
  the glint that rides one of them were drawn straight through the plate
  inscription for the whole life of the inscription. At the size people look at
  the card that is four pixels of faint type, and no screenshot at any zoom was
  going to make it a fact. `scripts/test-plate.mjs` compares every `<text>` box
  with every rule band and reports the clearance in user units.
- **A test that skips half of what it measures is worse than no test**, because
  it reports a pass. The plate test named the front's gilded rules in its
  selectors, so the back — a plain double rule with different names, drawn
  through its own caption — produced no rules and was skipped in silence. Select
  by what a thing is, not by what it was called, and print how many of each the
  test actually looked at. The counts caught a second instance the same week: a
  check that asked every CSS rule whether it had a `cssRules` list before asking
  whether it had a selector — a style rule has one now, for nesting — so it
  descended into every rule, examined none of them, and reported a pass.
- **Measure the pixels, not the hex.** The artwork's type sat at 2.19:1 against
  its paper while the palette looked quiet and correct, because the ink is a
  gradient, the paper is a gradient, and a group faded for the sake of one mark
  fades every mark inside it. `scripts/test-ink.mjs` reads the colour that
  arrives at the screen. A group opacity cannot be undone from inside the group:
  when one mark needs to be stronger than its neighbours, it leaves them.
- **A mark that paints nothing is a failure, not a skip.** The first version of
  the ink measurement ignored any text with no ink in its box, reasoning that a
  turned-away face cannot be measured. That is exactly how type that had been
  translated twice — and was off the plate — reported as fine.
- **A split must change no bytes.** The front face went from one 1,461-line
  file to twelve fragments in a directory, and the only thing that proved the
  move was a move was `git diff public/index.html` coming back empty. Paint
  order is the picture, so the fragment names sort into the drawing; a split
  that reorders is a redraw wearing a refactor's clothes.
- **A stylesheet cannot be seen to be dead.** A rule whose class no longer
  exists costs nothing and changes nothing, so the page looks exactly as it
  should: `.water-a` drifted a band of water sideways over 47 seconds for as
  long as anyone can remember, and no element in the scene had that class. The
  same failure one level up is an `animation` naming a `@keyframes` block that
  was never written. `scripts/test-css.mjs` asks both questions of the built
  page, and only of the _subject_ of each selector — whether the laminate
  happens to be on when the test runs is not the bird's business.
- **A promise nobody can test is a promise that quietly breaks.** Flip,
  export, the shortcuts and reduced-motion are rule 5, and the only thing
  enforcing them was somebody remembering to click the buttons. They are
  driven over CDP now, and the settled page is caught asking for frames.
- **Assert on the thing, not on its indicator.** `aria-pressed="false"` says
  what the play button believes; the number of oscillators the page creates says
  what the audio is doing. They disagreed — the button read Play while a bar was
  being written — and only the second one is the music.
- **A scheduler is only correct while the page is given time.** Starve it for
  five seconds, the way a background tab or a wake from sleep does, and guards
  that look sufficient for notes (`if (t > now)`) say nothing about a voice that
  takes two seconds to rise. The test blocks the main thread and fails if
  anything is scheduled behind the audio clock.
- **Read page exceptions over CDP, not just pixels.** A `ReferenceError` during
  startup once left a page that looked completely fine while tilt, flip, export
  and every shortcut were dead. The same channel carries the errors the browser
  raises while it parses the page, which is the only place a malformed path
  says anything at all.
- **Diagnose by subtraction.** The line down the left edge was found by
  rendering the page with one suspect hidden at a time and diffing the column
  profile against the baseline. Only two elements moved it; guessing would have
  taken a week.
- **Measure the thing you actually care about.** The frame-time distribution is
  bimodal — a frame lands on a vsync boundary or misses it — so the mean and
  "share of late frames" are both wrong statistics. The median is the one that
  fires on a genuinely bad page and not on a comfortable 45 fps one.

## The standing goal

Keep polishing. Each finished step gets its own commit, with a message that
says what was wrong, why it was wrong, what was changed, and the measurement
that shows it changed. Prefer deleting to adding. When something looks wrong,
find the cause before touching it.

## The short version, as a prompt

> Make a single self-contained HTML file: one illustrated postcard of Mount
> Fuji at dawn from Kawaguchi-ko, drawn entirely in inline SVG, lying on a
> gallery wall under a lamp the pointer moves. The card tilts in 3D and its
> holographic laminate is re-lit by a real lighting model, not an animation.
> It has a printed back — message, address, stamp, cancellation — reachable by
> flipping it. A ~5-minute soundtrack is synthesised live with Web Audio. The
> paper is a hundred years old: foxing, a cut edge, one crease, and lettering
> along the bottom edge like a fine print. Everything expensive is opt-in and
> off by default. No dependencies, no network requests, one file. Restraint is
> the quality bar: every mark must have a cause, nothing may repeat at even
> intervals, motion must be weather rather than animation, and when in doubt
> delete. Verify with headless renders, structural checks, a CDP perf harness
> and page exceptions — never by looking at one screenshot and hoping.
