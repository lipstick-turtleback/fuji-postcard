<!-- The plant stands. Forty-five placements of thirteen marks, written once
     as data instead of forty-five hand-typed transforms: the shape of a
     placement (where it roots, how far it leans, whether it is taller than it
     is wide) is the interesting part, and repeating it by hand is how every
     clump on the shore ended up the same plant at a different scale. -->
<script>
  let { stands = [] } = $props();

  import { place as t } from './place.mjs';
</script>
{#each stands as s}
  <g fill={s.fill} stroke={s.fill} stroke-linecap="round" class={s.sway || null} style={s.sway ? `animation-duration:${s.dur}; animation-delay:${s.delay || '0s'}` : null}>
    {#each s.items as p}
      <use href={`#${p.h}`} transform={t(p)}/>
    {/each}
  </g>
{/each}
