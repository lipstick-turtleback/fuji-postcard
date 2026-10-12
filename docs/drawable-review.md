# Reviewing one drawable

A prompt for judging a single object on the card — a duck, the boat, the gate, a
bird, a stand of reeds — and turning the judgement into edits. It exists because
"looks good" is not reviewable: every one of the defects this project fixed was
found by measuring something, and none of them was found by looking at the whole
card once.

Run it through the runner, which photographs the object and hands back the
numbers along with the picture:

```
node scripts/review.mjs duck --selector '#duck' --zoom 8
node scripts/review.mjs boat --box 588,462,86,70 --zoom 6
node scripts/review.mjs gate --box 160,300,140,240 --zoom 4 --back
```

Motion is parked at a fixed phase so two runs of the same command give the same
picture; `--live` leaves it running.

## The prompt

> Review the drawable named **`<name>`** on the attached photograph, taken at
> `<zoom>×` of a region `<x>,<y>,<w>,<h>` units of a 900×600 card rendered at
> `<k>` CSS pixels per unit. The measured facts below were taken from the live
> page, not from the source.
>
> Score it out of 100 against the nine criteria, then list the issues. **Every
> issue must carry a number** — units, device pixels, a contrast ratio, a stroke
> width, seconds, units-per-second — and must name the one edit that fixes it and
> the one measurement that shows it is fixed. An issue without a number is a
> preference; leave it out. Do not propose an issue that would undo something
> listed under KEEP.

## The criteria

| #   | criterion                           |  wt | what is actually being asked                                                                                                                                                    |
| --- | ----------------------------------- | --: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Silhouette and read                 |  18 | At card scale, is it unmistakably the thing? Is the outline doing the work — a breast, a stern, a waterline, a bill — or is it a blob with parts stuck on it?                   |
| 2   | Contact and gravity                 |  14 | Is it cut by the surface it floats or stands on? Where is it hinged when it rocks, and is that where the thing causing the motion touches it?                                   |
| 3   | Depth and scale                     |  10 | Is its size right for where it sits? Does the depth show in the numbers when a CSS transform cannot carry the scale? Is it in front of what should be behind it?                |
| 4   | Line and form                       |  12 | Are the stroke weights deliberate? Any accidental straight line among curved marks, any shape with no area, any two primitives overlapping where one line should run?           |
| 5   | Light and material                  |   8 | One light source across the card; the underside quieter than the top; the fill from the palette, not a colour invented beside it.                                               |
| 6   | What it reflects and what it leaves |  10 | Is the mirror broken the way the other mirrors are broken? Does the wake lag behind the body that made it, and does the reflection ride with it instead?                        |
| 7   | Motion                              |  12 | If it should move, does it — and at a rate the eye can pick up, not merely a period? Is the amplitude comparable to its neighbours, and does it keep step with nothing near it? |
| 8   | Composition and collision           |   8 | Does it cross a printed rule, a stamp box, a caption, or another mark it has no business touching? Is the space around it doing anything?                                       |
| 9   | Wear and legibility                 |   8 | Does it survive the paper: the grain, the crease, the foxing, and the contrast floor the page holds for its type and its rules?                                                 |
|     |                                     | 100 |                                                                                                                                                                                 |

**Bands.** 90 and above: leave it alone, it is doing its job. 75–89: sound, with
small things worth taking. 60–74: there is a real defect in it. Below 60: fix it
before anything else on the card gets attention.

## The answer, in this shape

```
DRAWABLE: <name>      SCORE: nn/100      BAND: <band>
CROP: <path> at <n>×   SCALE: <k> css px per unit

 1  silhouette and read              n/18   <one line of measured evidence>
 2  contact and gravity              n/14   …
 …
 9  wear and legibility               n/8

ISSUES, worst first — each one edit, each one checkable:
 1. [blocker|major|minor] <what is wrong> — <the number that shows it> —
    fix: <the edit, in the file it belongs to> — verify: <the crop or the test>

KEEP: <what is right and must not be improved away>
```

## How to use the answers

One issue per commit, verified the way the issue says to verify it. A new check
that passes is not evidence until it has been shown to fail: put the defect back
and watch it fire. The scores are not the point — the ranked list is; a drawable
scoring 91 with three named issues is in better shape than one scoring 74 with
none, because the first one knows what it still has to do.
