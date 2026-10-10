/* One placement, one transform string.

   Order is not cosmetic: translate, then lean, then stretch. Written in three
   places it would drift in two of them. */
export const place = (p) =>
  `translate(${p.x} ${p.y})` +
  (p.rot ? ` rotate(${p.rot})` : '') +
  (p.skew ? ` skewX(${p.skew})` : '') +
  (p.sx === undefined
    ? ''
    : ` scale(${p.sx}${p.sy !== undefined && p.sy !== p.sx ? ` ${p.sy}` : ''})`);
