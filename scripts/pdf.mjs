/* Enough of a PDF to answer the two questions this project asks of a printed
   sheet: how many pages came out, and how big the paper is.

   `Page.printToPDF` hands back the whole file, and a PDF's page tree sits
   wherever the writer put it — the first version of this read the header and
   found nothing, which is how a sheet that had silently become two pages still
   reported one. So the file is searched rather than parsed. A MediaBox is in
   PostScript points, 1/72 of an inch. */
export function sheet(bytes) {
  const text = bytes.toString('latin1');
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(text);
  const mm = box ? [Number(box[1]) * 0.352778, Number(box[2]) * 0.352778] : [0, 0];
  return { pages, mm, bytes: bytes.length };
}
