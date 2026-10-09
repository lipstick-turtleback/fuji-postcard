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
| **`S`** or Save the plate    | serialises the live SVG out of the DOM and downloads it as a standalone `.svg`                                                                     |
| **`M`** or Play              | a ~5-minute soundtrack: koto-ish plucks on the D hirajōshi scale, a lake drone, a dotted-eighth delay                                              |
| **Laminate on/off**          | toggles the foil layer                                                                                                                             |
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
npm test           # build + check + lint
```

`npm run check` is the interesting one. Browsers are forgiving about exactly
the mistakes that break this page: an HTML comment closed with the two
characters that end a C comment silently swallows every filter defined after
it, and the artwork just stops rendering. The checker reports the line —
unterminated and malformed comments, unbalanced tags, duplicate `id`s,
references to ids that do not exist, and any external `src`/`href`/`url()`,
which would break the offline property (and the SVG export) outright.

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
