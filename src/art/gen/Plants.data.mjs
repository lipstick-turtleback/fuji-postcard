/* Every plant on the shore, as data: where it roots, how far it leans,
 * whether it is taller than it is wide. The component that reads it is
 * src/art/gen/Plants.svelte; the marks it places are the files under
 * src/art/front/20-cast/. This is the only place a placement is written,
 * which is the point: 'lift the left stand two units' is an edit here,
 * not a search through forty-five transforms. */
export const stands = [
  {
    fill: '#161d31',
    items: [
      { h: 'reed', x: 20.0, y: 566.0, rot: -2.0, sx: 1.02 },
      { h: 'reedB', x: 46.0, y: 563.0, rot: -7.0, sx: 0.88, sy: 0.94 },
      { h: 'reedC', x: 98.0, y: 561.0, rot: 4.0, sx: 0.82, sy: 0.9 },
      { h: 'sedge', x: 70.0, y: 565.0, skew: -4.0, sx: 0.9, sy: 0.98 },
      { h: 'tuft', x: 34.0, y: 569.0, rot: 3.0, sx: 0.9 },
      { h: 'tuftSeed', x: 72.0, y: 566.0, rot: -4.0, sx: 1.02, sy: 0.9 },
      { h: 'tuftC', x: 116.0, y: 562.0, rot: 6.0, sx: 0.78 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-a',
    items: [
      { h: 'reedB', x: 30.0, y: 573.0, rot: 5.0, sx: 1.15, sy: 0.96 },
      { h: 'reed', x: 60.0, y: 575.0, rot: -4.0, sx: 0.95, sy: 1.04 },
      { h: 'sedge', x: 86.0, y: 569.0, rot: 3.0, sx: 0.86 },
      { h: 'reedC', x: 110.0, y: 567.0, rot: -7.0, sx: 0.9, sy: 1.02 },
      { h: 'tuft', x: 12.0, y: 577.0, rot: 4.0, sx: 1.05, sy: 0.92 },
      { h: 'grassPair', x: 26.0, y: 580.0, rot: -6.0, sx: 0.8, sy: 0.95 },
      { h: 'tuftC', x: 40.0, y: 574.0, rot: 9.0, sx: 1.12, sy: 0.88 },
      { h: 'tuft', x: 54.0, y: 579.0, rot: -3.0, skew: 4.0, sx: 0.72 },
      { h: 'tuftSeed', x: 68.0, y: 572.0, rot: 5.0, sx: 0.92, sy: 0.86 },
      { h: 'sedge', x: 84.0, y: 571.0, rot: -8.0, sx: 0.76, sy: 1.05 },
      { h: 'tuftB', x: 96.0, y: 569.0, rot: 2.0, sx: 0.88 },
      { h: 'grassPair', x: 124.0, y: 564.0, rot: -5.0, sx: 0.66, sy: 0.9 },
      { h: 'tuftC', x: 140.0, y: 561.0, rot: 7.0, sx: 0.58, sy: 1.06 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-b',
    delay: '-5s',
    items: [
      { h: 'reed', x: 838.0, y: 557.0, rot: -3.0, sx: 0.95, sy: 1.02 },
      { h: 'reedB', x: 858.0, y: 561.0, rot: 6.0, sx: 0.76, sy: 0.9 },
      { h: 'tuftSeed', x: 802.0, y: 560.0, rot: -6.0, sx: 0.9, sy: 1.04 },
      { h: 'tuftB', x: 818.0, y: 563.0, rot: 4.0, sx: 0.7 },
      { h: 'sedge', x: 830.0, y: 565.0, rot: -2.0, skew: -5.0, sx: 0.85 },
      { h: 'tuft', x: 848.0, y: 567.0, rot: 8.0, sx: 0.6, sy: 1.08 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-b',
    delay: '-2.5s',
    items: [
      { h: 'reed', x: 876.0, y: 555.0, rot: -5.0, sx: 0.88, sy: 0.96 },
      { h: 'grassPair', x: 864.0, y: 564.0, rot: 3.0, sx: 0.74, sy: 1.05 },
      { h: 'tuftC', x: 884.0, y: 558.0, rot: -7.0, sx: 0.98 },
      { h: 'reedC', x: 896.0, y: 561.0, rot: 5.0, sx: 0.7, sy: 0.92 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-a',
    delay: '-7.5s',
    items: [
      { h: 'tuftB', x: 168.0, y: 557.0, rot: 4.0, sx: 0.68, sy: 0.94 },
      { h: 'sedge', x: 244.0, y: 554.0, rot: -6.0, sx: 0.52 },
      { h: 'reedB', x: 292.0, y: 551.0, rot: -9.0, sx: 0.58, sy: 1.04 },
      { h: 'tuftSeed', x: 306.0, y: 557.0, rot: 3.0, sx: 0.42, sy: 1.1 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-b',
    delay: '-3.5s',
    items: [
      { h: 'grassPair', x: 388.0, y: 553.0, rot: -4.0, sx: 0.6 },
      { h: 'reed', x: 432.0, y: 550.0, rot: 6.0, sx: 0.5, sy: 0.95 },
      { h: 'tuftC', x: 474.0, y: 553.0, rot: -3.0, skew: 5.0, sx: 0.46 },
      { h: 'tuft', x: 556.0, y: 555.0, rot: -5.0, sx: 0.56, sy: 1.06 },
    ],
  },
  {
    fill: '#0f1322',
    sway: 'sway-a',
    delay: '-11s',
    items: [
      { h: 'waterGrass', x: 206.0, y: 560.0, rot: 2.0, sx: 0.62 },
      { h: 'sedge', x: 508.0, y: 549.0, rot: 7.0, sx: 0.4, sy: 0.9 },
      { h: 'waterGrass', x: 642.0, y: 554.0, rot: -4.0, sx: 0.54, sy: 1.1 },
      { h: 'tuftB', x: 654.0, y: 558.0, rot: 5.0, sx: 0.38 },
      { h: 'reedB', x: 668.0, y: 550.0, rot: -6.0, skew: -4.0, sx: 0.5 },
      { h: 'tuftSeed', x: 726.0, y: 553.0, rot: 8.0, sx: 0.44, sy: 1.05 },
      { h: 'tuft', x: 762.0, y: 558.0, rot: -4.0, sx: 0.62, sy: 0.92 },
    ],
  },
];
