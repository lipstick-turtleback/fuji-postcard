# Change log

What actually changed, in the order it changed, taken from `git log` rather than from memory — regenerate it with `node scripts/changelog.mjs`. 178 commits between 2026-10-09 15:41 and 2026-10-12 10:26. Each entry is the commit's own subject line, unedited, because the rule since the first week was that a commit says what the defect was rather than what the file is called.

## The shape of it

| day        | commits | the page at the end of the day | test scripts | files in `src/art` |
| ---------- | ------- | ------------------------------ | ------------ | ------------------ |
| 2026-10-09 | 53      | 144,471 bytes                  | 3            | 2                  |
| 2026-10-10 | 56      | 208,658 bytes                  | 13           | 47                 |
| 2026-10-11 | 23      | 232,880 bytes                  | 17           | 47                 |
| 2026-10-12 | 46      | 123,607 bytes                  | 18           | 47                 |

The page grew to 232,880 bytes and then halved. Nothing was thrown away: `961745f` split the build into the page a name reaches for and the page a person reads — `public/index.html`, comments and indentation taken out, and `public/index-full.html`, the same document annotated. The shipped page has been about 48% of the annotated one ever since.

The first four commits are one HTML file typed in over an afternoon: `e15e9bb` "Initial commit", `17cbba2` "Create fuji-postcard-qwen-3.8-next.html", `cefe646` "ptogress", `5e529b8` "Art: rebuild the near bank, clip the reflection, fix the blend wash". The split into `src/art`, `src/script`, `src/styles` and a build came at `e3d3e6e`, 18:58 on the first day; `PROJECT.md`, the brief the rest of the work is judged against, came nine hours later at `47c8233`.

## 2026-10-09 — the card, then the rules about the card

- `e15e9bb` 15:41 — Initial commit
- `17cbba2` 15:42 — Create fuji-postcard-qwen-3.8-next.html
- `cefe646` 16:26 — ptogress
- `5e529b8` 18:37 — Art: rebuild the near bank, clip the reflection, fix the blend wash
- `e3d3e6e` 18:58 — Build, lint and deploy: split the page into parts, keep one file
- `05f04c4` 19:03 — Interaction and document fixes
- `76da46e` 19:09 — progress
- `1580cab` 19:09 — Update back.svg
- `4683b6d` 19:14 — Art: age the card, add film grain, fix the tanzaku and the postmark
- `aa95b20` 19:19 — CI, and the crease taken down to a whisper
- `0723ba0` 19:34 — Art: a real far shore, mist that is not a stripe, and the gate in the water
- `9f87703` 19:43 — Art: the mountain gets its fall lines; dead defs are now a check
- `964bd9a` 19:46 — Prettier must not touch the build shell
- `23aecf9` 19:52 — The score becomes data you can test
- `617c685` 19:55 — The export is now covered by a check, not by hope
- `eab61df` 20:00 — Narrow viewports: rows that break between their items, not inside them
- `fb17ddf` 20:04 — The quiet text was not readable
- `f767488` 20:23 — The cherry spray gets flowers instead of stickers
- `294ec8e` 20:23 — The foil was erasing the ink, not laminating over it
- `7632c76` 20:28 — The stamp's mountain gets a snowline, and the postmark gets waves
- `d8f9a95` 20:31 — The boatman is now poling the boat
- `564783c` 20:34 — The ducks float and the heron has a back
- `de09e14` 20:35 — Record why the laminate is soft-light
- `db5811c` 20:42 — The back of the card was left behind when the front was fixed
- `1ce608b` 20:47 — Save the plate now saves what you are looking at
- `9059f64` 20:49 — The README promised an S key that did not exist
- `6672ae0` 20:51 — A promise in the README is now something that has to be true
- `79b8d90` 21:27 — Measure the cost, then give the page a way to pay less
- `dc8574f` 21:33 — The bottom third of the picture was off screen on a laptop
- `404495a` 21:37 — The quality watchdog now decides on the median, and sooner
- `39a16bb` 21:39 — The sun had a sticker edge and a construction line
- `4b568e9` 21:42 — The travel seal was a vector circle
- `9641a05` 22:06 — Less is more: the lake, the corners, and the age
- `0be2344` 22:07 — One switch for the effects, and it starts off
- `e3a6afd` 22:23 — The plate inscription, lettered along the whole bottom edge
- `91c01f1` 22:31 — The line down the left side of the card
- `47c8233` 22:35 — PROJECT.md: the brief
- `152268a` 22:39 — The tone break down the middle of the mountain
- `0441d70` 22:47 — The near bank, redrawn
- `6bf8dc9` 22:52 — The perf harness was reporting "rendering: undefined"
- `750efd1` 22:55 — The cherry branch was a piece of tubing
- `8683560` 22:58 — The cancellation had only half inked
- `af776fb` 23:04 — The torii was standing on the water, not in it
- `162a94c` 23:25 — Every control was below the fold on a laptop
- `fa04883` 23:29 — The back's stamp had no edge at all
- `4c87687` 23:32 — The mist was one flat colour, so it read as a grey smear
- `4fa5db8` 23:36 — Sixteen spokes at exactly 22.5 degrees
- `1149b9e` 23:39 — Three copies of one bird
- `f57dc34` 23:42 — The far tree line was a fence
- `98a00d3` 23:43 — A rule worth writing down
- `602d311` 23:52 — The artwork had no text at all
- `ba55a34` 23:54 — A picture with no name is now a build failure
- `0c450e0` 23:54 — A picture with no name is now a build failure

## 2026-10-10 — the scene is rebuilt, and the checks arrive

- `7ccc354` 00:05 — One ray, travelling the whole width of the plate
- `ef4cb07` 00:06 — Merge branch 'main' of https://github.com/lipstick-turtleback/fuji-postcard
- `a7219d3` 00:18 — The frame glint was running the wrong way, and off nothing
- `ab79c1f` 00:20 — The gate was standing where you could almost step to it
- `9ae1a7a` 00:26 — The boat sat in frozen water - and the mist exemption was dead code
- `0bb8bef` 00:28 — The middle of the shore was an omission
- `6070eba` 00:36 — The dirt was all one size and one strength
- `c294642` 00:37 — README perf numbers, refreshed
- `59dd134` 00:44 — The summit was the hardest-edged thing on the card
- `0b58a8c` 00:47 — The sun's rays were ruler-drawn stripes
- `b5127ec` 00:50 — The lake's far shore was one straight line for 900 units
- `b179c28` 00:54 — The stamp was the newest thing on a hundred-year-old card
- `1260cae` 00:57 — The title strip was new paper on an old card
- `8c7f892` 00:59 — Thirty-one copies of one tuft
- `f1ae026` 01:03 — Petals that never turned, and a lake on a progress bar
- `1780191` 01:06 — The largest empty area on the card was doing nothing
- `18727a4` 01:17 — The air-mail border was freshly printed - and the back is free
- `f8484b0` 01:22 — The blossoms were five-fold rosettes
- `6dc57b6` 01:24 — The back's postmark was two perfect circles
- `7d066ff` 10:34 — The gilded frame was drawn through the plate inscription
- `6770404` 10:41 — Rule 5 had no test: the page is now driven, not clicked
- `23086ea` 11:24 — progress
- `2071e31` 11:24 — Update README.md
- `dfa3e03` 11:26 — What the two silent failures taught the tooling
- `3623a1b` 11:57 — The drone was arriving out of nowhere, two seconds late
- `5245bd1` 12:04 — Rule 2 applies to the score too, and now it is measured
- `89966eb` 12:17 — The plate test had never measured the back, and the back had the same bug
- `4ede22f` 12:43 — The card's faintest type was 2.19:1 against its paper, and nothing measured that
- `07cd188` 13:01 — Nobody ever read the file the save button hands out
- `452c8d2` 13:29 — Nothing starts the music but the button, and no test makes sound
- `e3e4481` 16:27 — The front face is twelve fragments in paint order, and the build proves it
- `6bd4e89` 16:47 — Three browser questions, three files
- `e5c2e12` 16:56 — The cast is one file per mark, and the shore draws from ten plants not five
- `0af8234` 17:24 — The JS is bundled now, not glued into a shared global scope
- `61b01ba` 17:37 — The shore's 45 placements are a component and a table, not 45 typed transforms
- `9a7e406` 17:41 — docs/motion.md: the plan for motion the viewer never sees happen
- `d61c12c` 17:53 — The creatures are parts now: three birds, two ducks, a heron, a boatman
- `8dd48d4` 18:29 — The lake moves when nobody switches it on
- `2cf8001` 18:39 — Three petals come down in still air; the other seven wait for the gust
- `7b6bf71` 18:40 — docs/motion.md: the slow petals in the budget table, measured
- `3f91f80` 18:48 — The score is a module, so the score test is an import
- `6741366` 18:54 — The soundtrack is four modules, and the IIFE that held them is gone
- `328e697` 19:02 — test-css: a stylesheet cannot be seen to be dead
- `5dbf592` 19:34 — Three places on the lake where something came up — and what photographing them found
- `0ada526` 19:38 — test-motion: every mark stays where the picture puts it
- `9d61711` 20:09 — The exported plate is now photographed and compared to the card
- `a462a82` 20:16 — Reduced motion held until someone switched Enhance on
- `1482296` 20:39 — The cascade order is now a list the build keeps, not a directory listing
- `cefbb92` 20:52 — Fourteen pairs were keeping step in the tier nobody compared
- `68f3891` 21:05 — The page's frame probe measured the machine once, then never again
- `5972ed0` 21:06 — The budget table now has both tiers, from one run
- `5e84ccd` 21:11 — test-plate now measures the fonts the page does not have
- `6d604b6` 21:29 — A reed was the same reed twice, and another was standing in the margin
- `b34fc84` 21:42 — test-plate now asks what is painted on top of a letter, not only what touches one
- `4d0840c` 21:55 — The page without script had never been loaded
- `1e245f9` 22:16 — A fish was ringing on dry land, under the shore, forever

## 2026-10-11 — the back of the card, the small typographies, the documents

- `f1a1ed3` 14:22 — Why test-visible measures the cast and not the whole drawing
- `7c4a2be` 14:43 — The page had never been operated without a pointer
- `b99f69e` 14:53 — The volume slider is now measured at the speakers' end, not its own
- `6a98efd` 15:27 — A petal on a lake goes somewhere
- `ffc1fe2` 15:43 — The meter was drawing bars, not measuring sound
- `0a82e34` 15:54 — The build now refuses art source it never uses
- `91d391f` 16:09 — Printing this page used to give you the gallery
- `de47662` 16:55 — A test nobody runs is a test that does not exist
- `155d297` 17:00 — The docs were quoting numbers the page had outgrown
- `0e04441` 17:19 — The print tier of the page without script had never been printed
- `3ac3d3a` 17:20 — The frame probe's test was checking the laptop, not the page
- `d5f5b77` 17:45 — The heron's wing was a second bird sagging under the first
- `611a08a` 18:33 — The boatman sat three and a half units above the boat
- `a1c64d5` 18:48 — The gate was lit from the middle of itself
- `eb25c9a` 19:04 — The snowline was a doily with varying widths
- `df17f1e` 19:07 — A crop named by number, so before and after land on the same rectangle
- `4f6bbfc` 20:52 — the doodle on the back: a needle summit, and snow outside its own slopes
- `7fbc77a` 20:56 — seven of ten petals were painted hanging in mid-air, forever
- `52071a2` 21:30 — the branch the shower comes off was the one part of the scene bolted to the sky
- `087da11` 21:52 — the apex of the whole composition was four straight chords
- `429bb00` 23:22 — the branch and its blossoms sway in still air now
- `8c6ea50` 23:23 — the build now writes a shipped page with the reasoning taken out
- `e1310cd` 23:32 — the three birds were animated and going nowhere

## 2026-10-12 — the page is halved, the suite is parallelised, the lake is set moving

- `961745f` 00:03 — the smaller page is the one a name reaches for
- `a49caf2` 00:19 — the lake was glass everywhere except where the boat was
- `2b3a645` 00:59 — four rules that had nothing to select
- `b22a7b8` 01:22 — the glitter band was one clock, and it is six
- `7191dec` 01:36 — the page was asked to hold still, and now it is measured
- `deea465` 02:12 — a reed was rooted in the rule's lozenge, and the two read as one thing
- `6ef1f6d` 02:21 — the stones were given three things and the log was given none
- `f9d778c` 02:44 — the document said the birds crossed 34 units; they cross 168
- `a03048e` 03:00 — the frame's rule stopped existing wherever the picture was pale
- `56ed751` 03:37 — a printed rule may fade, but it may not stop — and now something measures it
- `5201c21` 03:50 — the air-mail border stopped halfway along the edge it belongs to
- `9d5e255` 04:02 — the boat sat on the lake instead of in it
- `c5d33e6` 04:14 — a line 0.6 units wide does not have a width, it has a phase
- `65f42b0` 04:22 — the sun's crests were the only hard-edged thing on a lake made of soft ones
- `502f1fd` 04:44 — the bent reed's head, and the seeds on the seeded tuft, painted nothing
- `755999d` 04:51 — the wall was painted twice, and one colour in the palette was never painted at all
- `1f27e88` 04:59 — the rule check was clipping in a coordinate space that was not the card's
- `728ba82` 05:05 — the documents had been quoting a page that stopped existing a few commits ago
- `26fc92b` 05:18 — the postmark's ring stopped existing on the half of it that falls on the sky
- `e9909b9` 05:30 — the rule walk was counting samples, and calling them units
- `7f81cc2` 05:35 — the README was describing the rule walk the check used to be
- `8918823` 06:04 — the suite spent 3m54s of wall clock doing 35 seconds of work
- `e107521` 06:16 — the heron had three ripples around its feet and no reflection
- `c2ad347` 06:29 — photographing the whole page invented a seam that is not in the room
- `510eea4` 06:38 — a printed rule under one device pixel is not ink, it is a phase
- `e7d7ee5` 06:47 — the perf script measured a page nobody runs on, and the README quoted it
- `3b4e32e` 06:58 — a region crop is mapped through one face and photographs whichever is showing
- `747cb81` 07:04 — the back's stamp printed its value outside itself
- `716b175` 07:13 — two claims about the wall were written in comments and measured by nothing
- `9d7bb05` 07:19 — the documents were quoting a page that had grown by six marks
- `247fd8c` 07:23 — the port collision that forced the runner can now be found by the build
- `53f1685` 07:44 — the postcard's words were decoration as far as the markup was concerned
- `b5c2f00` 07:49 — "port N is already serving a Chrome" was sometimes a web server
- `b1394d4` 07:59 — the card's caption was announced four times over, and its Japanese had no language
- `79cc595` 08:13 — two address rules ran through the little Fuji and it read as a wireframe
- `96cfa96` 08:18 — the boatman's pole was resting on the lake, not in it
- `fa5c855` 08:20 — the waterline rule, written down because it cuts both ways
- `ed8da31` 08:26 — every custom property on the page now has a writer and a reader
- `9266472` 08:40 — the README sent readers to a file that had not existed for months
- `ca70687` 08:44 — the README quoted a stylesheet line the build had stopped writing
- `7843f1c` 08:51 — three counts in the README had drifted, and now something re-measures them
- `5903ba6` 09:54 — the README's own numbers are now re-measured, not remembered
- `d4e1829` 10:17 — the boat crosses the lake, the ducks swim off, and the water is slower
- `37af8f6` 10:20 — a custom property nothing writes
- `8984f24` 10:25 — the water a body disturbs must travel less than the body
- `ce007c8` 10:26 — the motion document now names the neighbours it was measured against
