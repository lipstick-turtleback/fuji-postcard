#!/usr/bin/env node
/* What a screen reader is actually handed.

   Every other test in this suite asks the page for pixels, geometry, sound or
   behaviour. None of them asked what the page means to somebody who cannot see
   it. The card was a single role="img" with one aria-label, and a role of img is
   a leaf: everything beneath it is presentational, which is what the markup was
   telling assistive technology about the message, the address, the date and the
   postcode. Chrome's own tree kept those text nodes anyway — measured, not
   assumed — so the old page was not silent in every reader. It was silent in
   whichever readers took the role at its word, and that is a poor thing to bet a
   person's mail on.

   So this test reads the accessibility tree Chrome computes for assistive
   technology — not the DOM attributes, which can say the right thing while the
   tree says something else — and asks two questions of it. Is the writing on
   the back reachable when the back is the thing being shown, and unreachable
   when it is not? And is every control on the page a named thing with a role,
   rather than a rectangle that happens to respond to clicks?

     node scripts/test-a11y.mjs

   Needs Chrome; skips, like the other browser tests, when it is not there. */
import { setTimeout as sleep } from 'node:timers/promises';
import { openPage, silentPage } from './cdp.mjs';
import { checks, skipped } from './checks.mjs';

const PAGE = silentPage(new URL('../public/index.html', import.meta.url).href);
const { ok, finish } = checks('test-a11y');

const page = await openPage({ port: 9393, userDataDir: '/tmp/fuji-a11y' });
if (!page) skipped('test-a11y');
const { send, evaluate, exceptions, close } = page;
await send('Page.enable');
await send('Accessibility.enable');
await send('Page.navigate', { url: PAGE });
await sleep(1500);

const tree = async () =>
  (await send('Accessibility.getFullAXTree')).nodes.filter((n) => !n.ignored?.value);

const says = (nodes, text) => nodes.some((n) => (n.name?.value ?? '').includes(text));
const withRole = (nodes, role) => nodes.filter((n) => n.role?.value === role);

const MESSAGE = 'Wish you were here';
const ADDRESS = '4-12-3 Kitazawa, Setagaya-ku';
const PICTURE = 'Illustrated postcard of Mount Fuji';

let nodes = await tree();
ok(
  'the picture is described as a picture',
  says(nodes, PICTURE) &&
    withRole(nodes, 'image').some((n) => (n.name?.value ?? '').includes(PICTURE)),
  nodes
    .filter((n) => n.role?.value === 'image')
    .map((n) => `"${(n.name?.value ?? '').slice(0, 40)}…"`)
    .join(' '),
);
ok(
  'the back is not read out while it is turned away',
  !says(nodes, MESSAGE) && !says(nodes, ADDRESS),
  says(nodes, MESSAGE) ? 'the message is reachable behind the picture' : '',
);

await evaluate(`document.getElementById('flip').click()`);
await sleep(1800);
nodes = await tree();
ok('the message is read once the card is turned', says(nodes, MESSAGE));
ok('the address is read too', says(nodes, ADDRESS));
ok(
  'the picture stops being read once it is turned away',
  !says(nodes, PICTURE),
  says(nodes, PICTURE) ? 'the front is still in the tree behind the back' : '',
);

/* The controls. A button with no name is a click target a keyboard user finds
   by tabbing into silence, and a toggle that does not report its state is a
   switch whose position nobody can tell. */
nodes = await tree();
// The names come back upper-cased, because the buttons are set in small caps by
// CSS and Chrome computes an accessible name from the text as rendered. The
// pressed state is not a field on the node either — it is one entry in a list of
// properties — so both are read the way the protocol actually shapes them.
const lower = (s) => (s ?? '').trim().toLowerCase();
const named = (role, name) => withRole(nodes, role).some((n) => lower(n.name?.value) === name);
const unnamed = withRole(nodes, 'button')
  .filter((n) => !lower(n.name?.value))
  .map((n) => n.nodeId);
ok(
  'every control is a named thing with a role',
  named('button', 'turn the card') &&
    named('button', 'save the plate') &&
    named('button', 'play') &&
    withRole(nodes, 'slider').some((n) => lower(n.name?.value).includes('soundtrack volume')) &&
    unnamed.length === 0,
  `${withRole(nodes, 'button').length} buttons [${withRole(nodes, 'button')
    .map((n) => lower(n.name?.value))
    .join(
      ', ',
    )}], ${withRole(nodes, 'slider').length} sliders${unnamed.length ? `, ${unnamed.length} with no name` : ''}`,
);
const pressedState = (n) => n.properties?.find((p) => p.name === 'pressed')?.value;
const pressed = withRole(nodes, 'button').filter((n) => pressedState(n));
ok(
  'the toggles report which state they are in',
  pressed.length >= 2 &&
    pressed.every((n) => {
      const v = pressedState(n);
      return v.value === 'true' || v.value === true || v.value === 'false' || v.value === false;
    }),
  `${pressed.length} of ${withRole(nodes, 'button').length} buttons carry a pressed state (${pressed.map((n) => `${lower(n.name?.value)}=${pressedState(n).value}`).join(', ')})`,
);
ok(
  'the page has a live region for the announcements',
  withRole(nodes, 'status').length === 1,
  `${withRole(nodes, 'status').length} status regions`,
);

ok('and the page threw nothing on the way', exceptions.length === 0, exceptions.join(' | '));
close();
finish();
