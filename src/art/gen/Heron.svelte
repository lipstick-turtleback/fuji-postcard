<!-- The heron: still, and the only tall thing on the right. Mirrored, so it
     faces the water rather than the frame. -->
<script>
  import { place as t } from './place.mjs';
  let { herons = [] } = $props();
</script>
<g fill="#101627" stroke="#101627">
  {#each herons as p}
    <use class="wader" href={`#${p.h}`} transform={t(p)} style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s`}/>
  {/each}
</g>
