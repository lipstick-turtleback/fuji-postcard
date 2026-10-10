<!-- Petals off the branch. Ten of them, and the sheet does not decide how
     fast they fall: each petal carries its own period as a custom property,
     and the stylesheet decides which of the two tiers applies. With the
     laminate off, only the three marked slow fall at all, and they fall the
     way a petal falls in still air. -->
<script>
  import { place as t } from './place.mjs';
  let { petals = [] } = $props();
</script>
<g fill="#f4c3d0">
  {#each petals as p}
    <g
      class={`petal p${p.n}${p.slow ? ' slow' : ''}`}
      style={`--dur: ${p.dur ?? 17}s; --delay: ${p.delay ?? 0}s; --dur-on: ${p.durOn}s; --delay-on: ${p.delayOn}s`}
    >
      <use href="#petalShape" transform={t(p)}/>
    </g>
  {/each}
</g>
