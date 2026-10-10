#!/usr/bin/env node
/* Rules that select nothing, and animations that name nothing.

   A stylesheet cannot be seen to be dead. A rule whose class no longer exists
   costs nothing and changes nothing; it simply sits there, and the page looks
   exactly as it should. That is how `.water-a` survived: a rule and a
   `@keyframes` block drifting a band of water sideways over 47 seconds, and no
   element in the scene had that class. Nothing in the picture was wrong, which
   is precisely why no test was looking.

   The same failure one level up: an `animation` shorthand that names a
   keyframes block nobody wrote. The property is valid, the element animates
   according to a name that resolves to nothing, and the motion that was
   intended never happens, silently, forever.

   So the page is asked two questions. Does every selector in the stylesheet
   match something that is actually on the page? Does every animation name
   resolve to a keyframes block that exists?

   Only the *subject* of a selector is tested — the last compound, the part
   that says what kind of thing the rule is about. `html[data-enhance="on"]
   .bird` is a rule about birds, and whether the laminate happens to be on
   when the test runs is not the bird's business.

     node scripts/test-css.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-css');

const page = await openPage({ port: 9389, userDataDir: '/tmp/fuji-css' });
if (!page) skipped('test-css');
await page.send('Page.enable');
await page.send('Runtime.enable');
await page.send('Page.navigate', { url: PAGE });
await sleep(2000);

const report = JSON.parse(
  await page.evaluate(`
    (() => {
      const deadSelectors = [];
      const animationNames = new Set();
      const keyframes = new Set();
      let rules = 0;
      let selectors = 0;
      const walk = (list) => {
        for (const r of list) {
          if (r instanceof CSSKeyframesRule) {
            keyframes.add(r.name);
            continue;
          }
          if (r.cssRules) {
            walk(r.cssRules);
            if (!r.selectorText) continue;
          }
          if (!r.selectorText) continue;
          rules++;
          for (const sel of r.selectorText.split(',')) {
            selectors++;
            // the subject: the last compound selector, pseudo-classes and
            // elements removed, because :hover on a class that exists is not
            // a dead rule
            const subject = sel.trim().split(/\\s+/).pop() || '';
            const base = subject.replace(/::?[a-zA-Z-]+(\\([^)]*\\))?/g, '');
            if (!base || base === '*' || base === 'html' || base === 'body') continue;
            let hit = false;
            try {
              hit = document.querySelector(base) !== null;
            } catch {
              hit = true; // a selector the browser cannot parse is its own problem
            }
            if (!hit) deadSelectors.push(sel.trim());
          }
          const name = r.style && r.style.animationName;
          if (name) for (const n of name.split(',')) if (n.trim() !== 'none') animationNames.add(n.trim());
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules);
      const missingAnimations = [...animationNames].filter((n) => !keyframes.has(n));
      return JSON.stringify({ rules, selectors, deadSelectors, missingAnimations, keyframes: keyframes.size });
    })()
  `),
);

ok(
  'no rule selects nothing',
  report.deadSelectors.length === 0,
  `${report.rules} rules, ${report.selectors} selectors · ${report.deadSelectors.slice(0, 4).join(' | ')}`,
);
ok(
  'every animation names keyframes that exist',
  report.missingAnimations.length === 0,
  `${report.keyframes} keyframes blocks · missing: ${report.missingAnimations.slice(0, 4).join(' | ')}`,
);
ok('no page exceptions', page.exceptions.length === 0, page.exceptions.join(' | '));
ok(
  'no browser errors',
  page.consoleErrors.length === 0,
  page.consoleErrors.slice(0, 3).join(' | '),
);
page.close();
finish();
