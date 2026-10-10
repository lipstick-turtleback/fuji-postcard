/* Teach Node to read a .svelte file, for the build only.

   The scene's repeated parts are components, but nothing Svelte runs is
   shipped: the build compiles them for the server and renders them to static
   markup, which is then inlined into the page exactly like every other part.
   What ships is the same SVG the components would have written by hand, with
   no runtime, no hydration markers and nothing to fetch. */
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { compile } from 'svelte/compiler';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith('file:') || !url.endsWith('.svelte')) return nextLoad(url, context);
    const file = decodeURIComponent(url.slice(7));
    const { js } = compile(readFileSync(file, 'utf8'), {
      filename: file,
      generate: 'server',
    });
    return { format: 'module', source: js.code, shortCircuit: true };
  },
});
