/* The two SVG facts this project checks everywhere.

   They live here because there are two things to check them against: the page
   as built, and a .svg file the page hands out through SAVE THE PLATE. A
   defect in the export is a defect in a file that leaves the house, and the
   only way to catch it is to run the same rules over those bytes. */

/* A malformed `d` is the quietest bug this page can have. The SVG parser
   stops at the first command whose arguments run out and drops the rest of
   the string, so the shape does not fail to exist — it exists as something
   else, filled along a straight line where a curve was meant to be. The
   stamp on the back carried exactly that for its whole life: a cubic written
   with two control points instead of three, which closed the shadow half of
   the snow cap into a pale shard across the mountain, and put one line in
   the console that nobody was reading. Both stamps on the card carry the same
   drawing, and both carried the same broken curve, in different coordinates. */
const ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

export function pathProblems(svg) {
  const problems = [];
  for (const d of svg.matchAll(/\sd="([^"]*)"/g)) {
    const value = d[1];
    let i = 0;
    let command = null;
    let seen = 0;
    let bad = null;
    while (i < value.length && !bad) {
      const ch = value[i];
      if (/\s|,/.test(ch)) {
        i++;
        continue;
      }
      if (/[MmLlHhVvCcSsQqTtAaZz]/.test(ch)) {
        if (command && ARITY[command] > 0 && seen && seen % ARITY[command])
          bad = `${command.toUpperCase()} wants ${ARITY[command]} arguments, saw ${seen} since it was named`;
        command = ch.toLowerCase();
        seen = 0;
        i++;
        continue;
      }
      NUM.lastIndex = i;
      const n = NUM.exec(value);
      if (!n) {
        bad = `unexpected "${ch}" in path data`;
        break;
      }
      if (!command) bad = 'a path has to start with a command';
      else if (ARITY[command] === 0) bad = `${command.toUpperCase()} takes no arguments`;
      seen++;
      i = n.index + n[0].length;
    }
    if (!bad && command && ARITY[command] > 0 && seen % ARITY[command])
      bad = `${command.toUpperCase()} wants ${ARITY[command]} arguments, saw ${seen} since it was named`;
    if (bad)
      problems.push({
        index: d.index,
        message: `malformed path d near "${value.slice(Math.max(0, i - 12), i + 12)}": ${bad}`,
      });
  }
  return problems;
}

/* A reference to an id that is not in the same file is not a broken link, it
   is a shape that quietly turns black — or, for a filter, a shape that stops
   being filtered. This matters most for an exported plate: the page defines
   gradients in both faces, and a clone of one face carries only its own. */
export function danglingRefs(svg) {
  const ids = new Set();
  for (const d of svg.matchAll(/\sid="([^"]+)"/g)) ids.add(d[1]);
  const refs = [
    ...svg.matchAll(/url\(#([^)]+)\)/g),
    ...svg.matchAll(/href="#([^"]+)"/g),
    ...svg.matchAll(/xlink:href="#([^"]+)"/g),
  ];
  const problems = [];
  for (const r of refs) if (!ids.has(r[1])) problems.push({ index: r.index, id: r[1] });
  // aria-labelledby and aria-describedby take space-separated id lists
  for (const m of svg.matchAll(/aria-(?:labelledby|describedby)="([^"]*)"/g))
    for (const name of m[1].trim().split(/\s+/))
      if (name && !ids.has(name))
        problems.push({ index: m.index, message: `aria reference to missing id "${name}"` });
  for (const p of problems) if (!p.message) p.message = `reference to missing id "#${p.id}"`;
  return problems;
}
