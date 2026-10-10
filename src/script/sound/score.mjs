/* The score, on its own.

   Everything the music *is* — the tempo, the scale, the ten phrases, the
   eighty bars, the seeded drift — and nothing the music *does*: no
   AudioContext, no DOM, no clock. That separation is not tidiness. The score
   used to live inside the soundtrack's IIFE, where the only way to check it
   was to cut it out of the source text between two sentinels and evaluate the
   fragment in a bare vm — a test that broke when a comment moved. Now it is
   imported.
 */
/* =============================================================
   Soundtrack — synthesised live with the Web Audio API.
   No audio files, no network requests.

   D hirajōshi (D F G A C) · 66 bpm · 4/4 · 80 bars ≈ 4 min 50 s
   through-composed, in ten eight-bar phrases:

     A    statement        bars  1– 8   opens bare, drone in at 5
     A'   answer           bars  9–16   same head, different tail
     B    contrast         bars 17–24   upper register, wide, one bar of rest
     A2   the tune again   bars 25–32   an octave down, darker touch
     C    bloom            bars 33–40   fullest: brightest, most notes
     B'   contrast again   bars 41–48   quieter, more silence
     A3   coming apart     bars 49–56   the head, then only pieces of it
     D    drifting         bars 57–64   stepwise, mid register
     A4   recall           bars 65–72   the tune, answered from below
     coda                 bars 73–80   thins to drone, ends on the open fifth

   The coda's last note is a low A held against the drone's D, and bar 1
   opens on the A an octave above it — so the seam back to the top is not
   a seam. Nothing literally returns for 80 bars; each pass through the
   score is shaded a few percent by a slow seeded drift, so the second
   pass is the same piece and not the same recording.

   Score notation: one string per bar, notes space-separated, each note
   "step.beat.len.touch" — step indexes SCALE below (0 = D2 … 14 = C5),
   beat and len are in half-beats (8 half-beats = one bar), touch is
   p soft · m sung · f full. An empty string is a bar of nothing.

   Three layers at most: one plucked line, the drone, the lake.
   ============================================================= */

export const BPM = 66;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const FLOOR = 0.0001;
export const SEED = 19580524;

export const HZ = (m) => 440 * 2 ** ((m - 69) / 12);
export const SCALE = [38, 41, 43, 45, 48, 50, 53, 55, 57, 60, 62, 65, 67, 69, 72];
export const TOUCH = { p: 0.34, m: 0.46, f: 0.58 };

/* mulberry32 — seeded, so the piece is reproducible rather than random */
export function seeded(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* drone: [bar offsets within the phrase that start a swell], dl: its
   length in beats. bright and level are the touch of that phrase. */
export const PHRASES = [
  {
    bright: 1.0,
    level: 0.92,
    drone: [4],
    dl: 16,
    bars: [
      '8.0.2.m 7.2.1.p 8.3.1.p 10.4.2.f 9.6.2.m',
      '8.0.3.m 7.3.1.p 6.4.2.m 7.6.2.p',
      '10.0.2.f 9.2.1.m 8.3.1.m 7.4.2.m 6.6.2.p',
      '5.0.4.f 6.6.1.p 7.7.1.p',
      '8.0.1.p 9.1.2.m 10.2.2.f 11.4.2.f 10.6.2.f',
      '9.0.2.m 8.2.1.m 7.3.2.m 8.5.2.p',
      '6.0.2.m 7.2.1.p 8.3.1.m 9.4.2.m 8.6.2.m',
      '5.0.4.f 5.6.2.p',
    ],
  },
  {
    bright: 1.06,
    level: 0.96,
    drone: [0, 4],
    dl: 14,
    bars: [
      '8.0.3.m 7.3.1.p 8.4.1.p 10.5.2.f 9.7.1.m',
      '8.0.3.m 7.3.1.p 6.4.1.p 5.5.3.m',
      '10.0.2.f 11.2.1.m 10.3.1.m 9.4.2.m 8.6.2.p',
      '5.0.2.m 6.2.1.p 8.3.2.m 9.5.2.p',
      '10.0.2.f 11.2.2.m 10.4.2.m 9.6.2.p',
      '8.0.2.m 9.2.1.p 8.3.1.p 7.4.2.m 8.6.2.p',
      '6.0.3.m 5.3.1.p 6.4.2.m 8.6.2.p',
      '5.0.2.m 3.2.2.p 5.4.4.f',
    ],
  },
  {
    bright: 1.14,
    level: 0.9,
    drone: [0],
    dl: 16,
    bars: [
      '11.0.3.f 10.3.1.p 9.4.3.m',
      '9.0.4.m 10.4.2.p 9.6.2.p',
      '11.0.2.f 10.2.2.m 9.4.2.m 8.6.2.p',
      '',
      '10.0.3.m 9.3.1.p 8.4.3.m 7.7.1.p',
      '8.0.2.m 6.2.2.p 7.4.2.m 8.6.2.p',
      '9.0.2.m 10.2.1.p 11.3.3.f 10.6.2.m',
      '10.0.2.m 9.2.2.p 8.4.4.m',
    ],
  },
  {
    bright: 0.82,
    level: 0.95,
    drone: [4],
    dl: 16,
    bars: [
      '3.0.2.m 2.2.1.p 3.3.1.p 5.4.2.f 4.6.2.m',
      '3.0.3.m 2.3.1.p 3.4.2.m 2.6.2.p',
      '5.0.2.f 4.2.1.m 3.3.1.m 2.4.2.m 3.6.2.p',
      '5.0.4.f 3.4.2.p 4.6.1.p',
      '3.0.1.p 4.1.2.m 5.3.2.f 6.5.2.f 5.7.2.f',
      '4.0.2.m 3.2.1.m 2.3.2.m 3.5.2.p',
      '2.0.2.m 3.2.1.p 4.3.1.m 5.4.2.m 4.6.2.m',
      '5.0.4.f 3.6.2.p',
    ],
  },
  {
    bright: 1.22,
    level: 1.02,
    drone: [0, 4],
    dl: 14,
    bars: [
      '8.0.1.p 9.1.1.p 10.2.2.f 11.4.1.f 12.5.1.f 11.6.1.m 10.7.1.m',
      '10.0.2.f 9.2.1.m 8.3.1.m 9.4.2.m 10.6.2.m',
      '11.0.2.f 10.2.1.m 11.3.1.m 12.4.3.f 11.7.1.m',
      '10.0.3.f 9.3.1.m 8.4.2.m 6.6.2.p',
      '8.0.2.m 10.2.1.p 9.3.1.p 8.4.2.m 7.6.1.p 6.7.1.p',
      '5.0.2.f 6.2.1.p 8.3.1.m 9.4.1.m 10.5.1.m 9.6.2.m',
      '8.0.1.p 9.1.1.p 10.2.1.m 11.3.1.m 12.4.2.f 11.6.2.m',
      '10.0.2.f 8.2.1.m 7.3.1.p 8.4.4.m',
    ],
  },
  {
    bright: 1.02,
    level: 0.84,
    drone: [0],
    dl: 16,
    bars: [
      '11.0.4.m 10.4.2.p 9.6.2.p',
      '',
      '9.0.3.m 8.3.1.p 6.4.3.m 5.7.1.p',
      '10.0.3.m 11.3.1.p 10.4.2.p 9.6.2.p',
      '8.0.4.m 7.4.2.p 6.6.2.p',
      '5.0.2.m 8.2.2.p 9.4.2.m 8.6.2.p',
      '11.0.2.m 9.2.2.p 8.4.2.m 7.6.2.p',
      '8.0.3.m 6.3.1.p 5.4.4.m',
    ],
  },
  {
    bright: 0.94,
    level: 0.8,
    drone: [4],
    dl: 14,
    bars: [
      '8.0.2.m 7.2.1.p 8.3.1.p',
      '10.0.2.m 9.2.1.p 8.3.1.p 7.4.2.p',
      '',
      '6.0.2.p 7.2.1.p 8.3.3.m',
      '8.0.1.p 10.1.2.m 9.3.1.p 8.4.2.m',
      '5.0.3.m 3.3.1.p 5.4.2.p 6.6.1.p',
      '9.0.2.m 8.2.2.p 7.4.2.p',
      '8.0.2.m 7.2.1.p 6.3.1.p 5.4.4.f',
    ],
  },
  {
    bright: 1.1,
    level: 0.92,
    drone: [0, 4],
    dl: 14,
    bars: [
      '6.0.2.p 8.2.2.m 7.4.2.p 9.6.2.m',
      '8.0.2.m 10.2.2.m 9.4.2.p 11.6.2.m',
      '10.0.2.m 11.2.2.m 12.4.2.m 11.6.2.p',
      '10.0.3.m 9.3.1.p 8.4.2.m 7.6.1.p 6.7.1.p',
      '7.0.2.p 8.2.2.m 9.4.2.m 10.6.2.m',
      '9.0.2.m 8.2.1.p 7.3.1.p 6.4.2.m 5.6.2.f',
      '8.0.2.m 6.2.1.p 5.3.1.p 6.4.2.m 8.6.2.m',
      '9.0.4.m 8.4.2.p 7.6.2.p',
    ],
  },
  {
    bright: 1.0,
    level: 0.9,
    drone: [0],
    dl: 16,
    bars: [
      '8.0.2.m 7.2.1.p 8.3.1.p 9.4.1.p 10.5.1.m 9.6.2.m',
      '5.0.2.p 3.2.2.p 5.4.2.m 6.6.2.p',
      '10.0.2.m 9.2.1.m 8.3.1.p 7.4.1.p 6.5.1.p 5.6.2.m',
      '3.0.2.p 5.2.3.m 4.5.1.p 5.6.2.m',
      '8.0.1.p 9.1.1.p 10.2.2.m 11.4.1.m 10.5.1.m 9.6.2.m',
      '9.0.2.m 8.2.1.m 7.3.1.p 8.4.2.m 9.6.2.p',
      '6.0.2.m 7.2.1.p 8.3.1.m 9.4.1.m 8.5.1.p 6.6.2.p',
      '5.0.4.m 6.4.2.p 8.6.2.p',
    ],
  },
  {
    bright: 0.88,
    level: 0.78,
    drone: [0, 4],
    dl: 16,
    bars: [
      '8.0.3.p 7.3.1.p 6.4.2.p 5.6.2.m',
      '',
      '5.0.2.m 3.2.2.p 4.4.1.p 5.5.3.m',
      '',
      '9.0.3.p 8.3.1.p 7.4.4.m',
      '',
      '5.0.6.m',
      '3.0.6.m',
    ],
  },
];

export const BARS = [];
for (const ph of PHRASES) {
  for (const [i, line] of ph.bars.entries()) {
    const notes = [];
    if (line) {
      for (const tok of line.split(' ')) {
        const f = tok.split('.');
        notes.push({
          m: SCALE[+f[0]],
          b: +f[1] / 2,
          d: +f[2] / 2,
          g: TOUCH[f[3]],
        });
      }
    }
    BARS.push({
      notes,
      drone: ph.drone.indexOf(i) >= 0,
      dl: ph.dl,
      bright: ph.bright,
      level: ph.level,
    });
  }
}
export const NBARS = BARS.length;
