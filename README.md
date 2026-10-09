# 富士山 · Light on Paper

A single illustrated postcard — Mount Fuji at dawn as seen from Kawaguchi-ko —
drawn entirely in vectors, on a gallery wall, under a lamp you can move.

It is one HTML file. No framework, no runtime dependencies, no network
requests: the artwork is inline SVG, the soundtrack is synthesised live with
the Web Audio API, and the paper grain, the holographic foil and the lake are
all generated in the browser. Save the file anywhere and open it offline and
it behaves the same.

**Live:** <https://fuji-postcard.vercel.app> _(replace with your own URL after the first deploy)_

---

## What it does

| Interaction                  | What happens                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move the pointer**         | the card tilts in 3D and the laminate is re-lit by a real lighting model — sheen, specular band and sparkle are computed from the lamp, not looped |
| **`F`** or click the card    | turn it over: the back is a real postcard, addressed and stamped                                                                                   |
| **`S`** or Save the plate    | serialises the face you are looking at out of the DOM and downloads it as a standalone `.svg`                                                      |
| **`M`** or Play              | a ~5-minute soundtrack: koto-ish plucks on the D hirajōshi scale, a lake drone, a dotted-eighth delay                                              |
| **Laminate on/off**          | the quality switch. Off is the calm rendering: no foil, no sway, no drifting water, no paper grain — about 2.3× the frame rate                     |
| **`prefers-reduced-motion`** | every animation is off, and the card stops moving entirely                                                                                         |

## The repository

The page is one file because that is the point — but one 2,300-line file is
impossible to review. So the source is split, and the single file is the
build artefact:

```
src/
  template.html        the shell: head, wall, card, controls, footer
  styles/              01-wall 02-masthead 03-card 04-console 05-foil 06-motion
  art/
    front.svg          the picture: sky, sun, Fuji, lake, torii, bank
    back.svg           the addressed side: stamp, cancellation, address block
  script/
    card.js            tilt, flip, foil lighting, SVG export
    soundtrack.js      the score and the synthesis chain
scripts/
  build.mjs            concatenate the parts into public/index.html
  check.mjs            validate the built page without a browser
  test-score.mjs       verify the composition as data
  test-contrast.mjs    keep the palette above WCAG AA
  serve.mjs            dependency-free static server
public/
  index.html           the built page (committed, so it can be opened directly)
```

`src/` is the truth. `public/index.html` is generated, and it is committed on
purpose: the repo stays openable with a double-click, and `npm run check`
fails if it has drifted from `src/`.

## Commands

```bash
npm run build      # src/ → public/index.html
npm run dev        # build, then serve on http://localhost:5173
npm run check      # fail if the built file is stale, then validate it
npm run lint       # biome over the JS (scripts/ and src/script/)
npm run fmt        # prettier over CSS, JSON and Markdown
npm test           # build + check + score + contrast + lint + format check
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
image and nothing tells you.

### Performance, measured

`npm run perf` drives headless Chrome over the DevTools protocol — Node ships a
WebSocket client, so there is no dependency — puts the pointer on the card so
the lighting model is actually running, and samples `requestAnimationFrame`
intervals. Screenshots cannot tell you any of this, and `--virtual-time-budget`
lies about it because virtual time fast-forwards the clock.

The numbers on this machine, 4-second samples:

| Rendering                    | mean    | median  | frames over 33 ms |
| ---------------------------- | ------- | ------- | ----------------- |
| full — laminate, sway, grain | 38.4 ms | 33.4 ms | 237 / 240         |
| calm — none of the above     | 16.7 ms | 16.7 ms | 0 / 240           |

The laminate is the whole cost, and the shape of the cost is worth knowing
before anyone tries to optimise it: `mix-blend-mode` has to read the backdrop,
so a single blended layer anywhere inside the card forces the whole 1880×1270
subtree to be re-composited every frame. Removing four of the five foil layers
changes nothing. Freezing the gradients changes nothing. Holding the card still
changes nothing. Only the presence or absence of the blend matters. The paper
grain, the foxing and the drifting water are nearly free by comparison — about
2 ms each — but they are what stands between the calm rendering and a locked
60 fps, so calm mode drops them too.

So the laminate is the quality switch, and the page picks for you: it samples
its own frame times for the first couple of seconds and, if more than a fifth
of them missed vsync, drops to the calm rendering and says so in the button.
Your own choice wins and is remembered. The exported `.svg` is unaffected — a
saved plate is always the full artwork.

`npm run test` also runs `scripts/test-score.mjs`, which lifts the score out
of the soundtrack IIFE and evaluates it as plain data — no DOM, no Web Audio.
It checks the form (80 bars, ten eight-bar phrases, ~4 min 50 s), that every
pitch is in D hirajōshi, that no note starts outside its bar or overlaps
another note of the same voice, and that at least 70 of the 80 bars are
distinct, which is what "through-composed" has to mean if it means anything.
Those are mistakes you can only hear, and by the time you hear them you have
listened to four and a half minutes.

Headless Chrome cannot verify the audio itself: its `AudioContext` clock never
advances, so nothing scheduled is ever rendered. What is verified is that the
graph builds, the context resumes, the play button toggles, and the scheduler
is bounded.

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
