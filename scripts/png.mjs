/* Enough of a PNG decoder to compare two of them.

   Chrome's screenshot is an 8-bit, non-interlaced PNG, which is the one case
   worth writing by hand: zlib is already in Node, and the rest is the five
   filter algorithms. A dependency for this would be larger than the page. */
import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  let p = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace !== 0)
    throw new Error(`only 8-bit non-interlaced PNG, got depth ${depth} interlace ${interlace}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let q = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[q++];
    const line = raw.subarray(q, q + stride);
    q += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { width, height, channels, data: out };
}

/* Averaging down. Two renders of the same vector artwork through different
   rasterisation paths — one a composited layer on a page, one a document on
   its own — differ along every edge by a pixel here and there, and that noise
   is not what the comparison is for. Averaging k×k blocks keeps everything
   that occupies more than a pixel — a missing gradient, a band of wrong
   colour, lettering in the wrong font — and drops what does not. */
export function downsample(img, k) {
  const width = Math.floor(img.width / k);
  const height = Math.floor(img.height / k);
  const data = Buffer.alloc(width * height * img.channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let ch = 0; ch < img.channels; ch++) {
        let sum = 0;
        for (let dy = 0; dy < k; dy++)
          for (let dx = 0; dx < k; dx++)
            sum += img.data[((y * k + dy) * img.width + x * k + dx) * img.channels + ch];
        data[(y * width + x) * img.channels + ch] = Math.round(sum / (k * k));
      }
    }
  }
  return { width, height, channels: img.channels, data };
}

/* How two images differ. The answer is not one number: a picture with a
   gradient missing differs from a picture whose edges are anti-aliased one
   pixel differently, and a check that reports only a count cannot tell them
   apart. So: how many pixels moved at all, how many moved by more than the
   tolerance, and what the single worst channel delta in the frame was. */
export function comparePng(a, b, tolerance = 8) {
  // Chrome floors the device-pixel rectangle of a clipped screenshot, so two
  // captures of the same thing at the same scale can come out a row apart.
  // Both start at the same corner at the same scale, so the shared area is the
  // comparison; a size difference beyond a couple of pixels is a real mismatch
  // and is reported as one.
  if (Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2)
    return { error: `${a.width}×${a.height} vs ${b.width}×${b.height}` };
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  let differing = 0;
  let overTolerance = 0;
  let worst = 0;
  let worstAt = null;
  for (let y = 0; y < height; y++) {
    const ra = y * a.width * a.channels;
    const rb = y * b.width * b.channels;
    for (let x = 0; x < width; x++) {
      let d = 0;
      for (let k = 0; k < 3; k++)
        d = Math.max(
          d,
          Math.abs(a.data[ra + x * a.channels + k] - b.data[rb + x * b.channels + k]),
        );
      if (d > 0) differing++;
      if (d > tolerance) overTolerance++;
      if (d > worst) {
        worst = d;
        worstAt = [x, y];
      }
    }
  }
  const pixels = width * height;
  return {
    compared: `${width}×${height}`,
    pixels,
    differing,
    overTolerance,
    pctDiffering: +((differing / pixels) * 100).toFixed(2),
    pctOver: +((overTolerance / pixels) * 100).toFixed(3),
    worst,
    worstAt,
  };
}
