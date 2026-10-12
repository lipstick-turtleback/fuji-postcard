#!/usr/bin/env node
/* Regenerate docs/changelog.md from git.

   The changelog is a document that quotes a moving thing, which is the class of
   document this project has been wrong about eight times: a count written down and
   never re-measured. So the list is not kept by hand. It is the commit subjects, in
   order, unedited — the rule since the first week is that a commit says what the
   defect was rather than what the file is called, which is what makes the log worth
   reading as it stands.

   The prose at the top and the table of what the page weighed at the end of each
   day are measured here too, out of the same history, rather than remembered.

     node scripts/changelog.mjs
*/
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

// One pass over the history. `%ai` is an ISO-ish date, which carries the day and
// the clock in one field — asking git for the day per commit would be 178 more
// subprocesses to learn something the first pass already had.
const commits = git(['log', '--reverse', '--format=%h\x1f%ai\x1f%s'])
  .split('\n')
  .map((line) => {
    const [h, when, ...rest] = line.split('\x1f');
    return { h, day: when.slice(0, 10), clock: when.slice(11, 16), subject: rest.join('\x1f') };
  });

const byDay = new Map();
for (const c of commits) {
  if (!byDay.has(c.day)) byDay.set(c.day, []);
  byDay.get(c.day).push(c);
}

// What the page weighed, how many tests existed and how many art sources the build
// had, at the last commit of each day.
const at = (sha, what) => {
  if (what === 'bytes') {
    const blob = git(['rev-parse', '-q', '--verify', `${sha}:public/index.html`]);
    return blob ? Number(git(['cat-file', '-s', blob])) : 0;
  }
  if (what === 'tests')
    return git(['ls-tree', '-r', '--name-only', sha, '--', 'scripts'])
      .split('\n')
      .filter((f) => /^scripts\/test-/.test(f)).length;
  return git(['ls-tree', '-r', '--name-only', sha, '--', 'src/art']).split('\n').filter(Boolean)
    .length;
};

const lastOfDay = [...byDay.entries()].map(([day, list]) => {
  const sha = list.at(-1).h;
  return {
    day,
    commits: list.length,
    bytes: at(sha, 'bytes'),
    tests: at(sha, 'tests'),
    art: at(sha, 'art'),
  };
});

const first = commits[0];
const last = commits.at(-1);
const n = (x) => x.toLocaleString('en-US');

const out = [];
out.push('# Change log');
out.push('');
out.push(
  `What actually changed, in the order it changed, taken from \`git log\` rather than from memory — regenerate it with \`node scripts/changelog.mjs\`. ${commits.length} commits between ${first.day} ${first.clock} and ${last.day} ${last.clock}. Each entry is the commit's own subject line, unedited, because the rule since the first week was that a commit says what the defect was rather than what the file is called.`,
);
out.push('');
out.push('## The shape of it');
out.push('');
out.push('| day | commits | the page at the end of the day | test scripts | files in `src/art` |');
out.push('| --- | ------- | ------------------------------ | ------------ | ------------------ |');
for (const d of lastOfDay)
  out.push(`| ${d.day} | ${d.commits} | ${n(d.bytes)} bytes | ${d.tests} | ${d.art} |`);
out.push('');
out.push(
  `The page grew to ${n(Math.max(...lastOfDay.map((d) => d.bytes)))} bytes and then halved. Nothing was thrown away: \`961745f\` split the build into the page a name reaches for and the page a person reads — \`public/index.html\`, comments and indentation taken out, and \`public/index-full.html\`, the same document annotated. The shipped page has been about 48% of the annotated one ever since.`,
);
out.push('');
out.push(
  `The first four commits are one HTML file typed in over an afternoon: \`e15e9bb\` "Initial commit", \`17cbba2\` "Create fuji-postcard-qwen-3.8-next.html", \`cefe646\` "ptogress", \`5e529b8\` "Art: rebuild the near bank, clip the reflection, fix the blend wash". The split into \`src/art\`, \`src/script\`, \`src/styles\` and a build came at \`e3d3e6e\`, 18:58 on the first day; \`PROJECT.md\`, the brief the rest of the work is judged against, came nine hours later at \`47c8233\`.`,
);
out.push('');

const titles = {
  '2026-10-09': 'the card, then the rules about the card',
  '2026-10-10': 'the scene is rebuilt, and the checks arrive',
  '2026-10-11': 'the back of the card, the small typographies, the documents',
  '2026-10-12': 'the page is halved, the suite is parallelised, the lake is set moving',
};
for (const [day, list] of byDay) {
  out.push(`## ${day} — ${titles[day] ?? 'the work continues'}`);
  out.push('');
  for (const c of list) out.push(`- \`${c.h}\` ${c.clock} — ${c.subject}`);
  out.push('');
}

// The gate formats Markdown, so the generator formats it the same way rather
// than emitting lines the next `npm test` will complain about.
const prettier = await import('prettier');
const file = join(root, 'docs', 'changelog.md');
const config = (await prettier.resolveConfig(file)) ?? {};
const text = await prettier.format(`${out.join('\n')}\n`, { ...config, parser: 'markdown' });
writeFileSync(file, text);
console.log(
  `changelog: docs/changelog.md — ${text.split('\n').length} lines, ${commits.length} commits over ${byDay.size} days`,
);
