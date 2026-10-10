#!/usr/bin/env node
/* The page without script, which is most of the page.

   Everything the card is made of is in the markup: the artwork is drawn at
   build time, the motion is opt-in and the default is off, the layout is CSS.
   What script adds is the turning, the saving, the laminate and the sound. So a
   visitor with script blocked should still be standing in front of the picture,
   and the row of controls should not be pretending otherwise — a button with an
   underline and a pointer cursor that does nothing is a mark that lies.

   That tier had never been loaded. It inherits its guarantees by hope: the
   build inlines the artwork, and nobody had asked what happens to the rest when
   the inline script never runs.

   So script execution is switched off and the page is asked what it looks like.
   The picture must be there, whole. The page must not overflow. The controls
   must say they are inert — no underline, no pointer, no key hints, because F,
   S and M are shortcuts to nothing — and the noscript line must be where the
   explanation is. Then the same measurements are taken with script on, and
   every one of them must be different: a check that cannot tell the two tiers
   apart is not checking the tiers, it is checking the layout twice.

     node scripts/test-nojs.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-nojs');

const page = await openPage({ port: 9391, userDataDir: '/tmp/fuji-nojs-test' });
if (!page) skipped('test-nojs');
await page.send('Page.enable');
await page.send('Runtime.enable');

const measure = `(() => {
  const front = document.querySelector('.face.front');
  const fb = front.getBoundingClientRect();
  const flip = document.getElementById('flip');
  const cs = getComputedStyle(flip);
  const kbd = document.querySelector('#flip kbd');
  const note = document.querySelector('.console noscript');
  const nb = note ? note.getBoundingClientRect() : null;
  return JSON.stringify({
    js: document.documentElement.classList.contains('js'),
    marks: document.querySelectorAll('.face.front svg use').length,
    letters: document.querySelectorAll('.face.front svg text').length,
    face: { w: Math.round(fb.width), h: Math.round(fb.height) },
    underline: cs.borderBottomColor,
    cursor: cs.cursor,
    kbdShown: kbd ? getComputedStyle(kbd).display !== 'none' : false,
    noteShown: nb ? nb.width > 20 && nb.height > 5 : false,
    noteText: note ? note.textContent.trim().slice(0, 24) : '',
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight > document.documentElement.clientHeight + 400,
  });
})()`;

const load = async (width, height, scripting) => {
  await page.send('Emulation.setScriptExecutionDisabled', { value: !scripting });
  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send('Page.navigate', { url: PAGE });
  await sleep(1400);
  return JSON.parse(await page.evaluate(measure));
};

const wide = await load(1440, 1150, false);
const narrow = await load(390, 844, false);

ok(
  'the picture is there without script',
  wide.marks > 60 && wide.letters > 20 && wide.face.w > 400 && wide.face.h > 250,
  `${wide.marks} marks, ${wide.letters} letters, the card ${wide.face.w}x${wide.face.h}`,
);
ok(
  'and it is the whole picture, not a fragment',
  wide.marks > 60 && narrow.marks === wide.marks && narrow.letters === wide.letters,
  `the same ${wide.marks} marks at 390 px`,
);
ok(
  'the page does not overflow without script',
  !wide.overflowX && !narrow.overflowX,
  `1440 and 390 px, scrollWidth within the viewport`,
);
ok(
  'the controls do not pretend to work',
  !wide.js &&
    wide.underline.includes('rgba(0, 0, 0, 0)') &&
    wide.cursor === 'default' &&
    !wide.kbdShown,
  `${wide.underline} underline, cursor ${wide.cursor}, key hints ${wide.kbdShown ? 'shown' : 'gone'}`,
);
ok(
  'and the page says what is the case',
  wide.noteShown && wide.noteText.length > 10,
  `"${wide.noteText}…"`,
);

/* The same measurements with script running. If nothing here differs, the
   checks above are measuring the layout rather than the tier. */
const live = await load(1440, 1150, true);
ok(
  'the script announces itself, and the controls come back',
  live.js && !live.underline.includes('rgba(0, 0, 0, 0)') && live.cursor === 'pointer',
  `${live.underline} underline, cursor ${live.cursor}`,
);
ok(
  'the key hints return with the shortcuts that work',
  live.kbdShown && !wide.kbdShown,
  'F, S and M shown only when they do something',
);
ok(
  'the explanation leaves when it stops being true',
  !live.noteShown && wide.noteShown,
  'the noscript line is gone once script runs',
);

await page.send('Emulation.setScriptExecutionDisabled', { value: false }).catch(() => {});
page.close();
finish();
