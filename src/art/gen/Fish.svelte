<!-- Three places on the lake where something comes up, once, and goes away
     again. They are not a cycle: each one's keyframes hold the surface still
     for most of the period and let the ring spread twice or three times at
     uneven distances through it, so the gaps between them are different from
     each other and from the period.

     Group for the placement, animation on the group — see Ducks.svelte. The
     ring is drawn at the origin of its own mark, so an element that lost its
     placement would not look wrong here; it would just be invisible in the
     wrong corner, which is how this went unnoticed.

     The closed opacity is written twice, as an attribute and as a rule, and
     the attribute is not the redundancy it looks like. A saved plate carries
     the animation rules with it — the export inlines them, so the file that
     comes out of the Save button ripples when it is opened — but a viewer that
     drops the stylesheet, which is what a rasteriser does, would otherwise see
     three rings frozen mid-spread at full strength. The attribute is the rest
     state of the mark, stated where the mark itself is. The keyframes win over
     it while the page runs, because a presentation attribute is the weakest
     declaration there is. -->
<script>
  import { place as t } from './place.mjs';
  let { rises = [] } = $props();
</script>
{#each rises as r}
  <g class={`fish ${r.k}`} opacity="0" style={`animation-duration:${r.dur}s; animation-delay:${r.delay}s`}>
    <use href={`#${r.h}`} transform={t(r)}/>
  </g>
{/each}
