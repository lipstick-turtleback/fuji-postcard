<!-- The heron: still, and the only tall thing on the right. Mirrored, so it
     faces the water rather than the frame.

     Group for the placement, animation on the group — see Ducks.svelte for
     why the two never go on the same element. Here it matters more than
     anywhere: the placement carries the mirror, and a stylesheet transform
     that replaced it would stand the bird up at the top-left of the picture,
     facing the wrong way, at twice the size it should be. -->
<script>
  import { place as t } from './place.mjs';
  let { herons = [] } = $props();
</script>
<g fill="#101627" stroke="#101627">
  {#each herons as p}
    <g class="wader" style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s`}>
      <use href={`#${p.h}`} transform={t(p)}/>
    </g>
  {/each}
</g>
