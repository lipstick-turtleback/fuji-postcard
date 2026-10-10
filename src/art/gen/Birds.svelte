<!-- The three birds, placed. Each one carries its own weight of line: the
     nearer the bird, the thicker the stroke and the more of it there is. -->
<script>
  import { place as t } from './place.mjs';
  let { birds = [] } = $props();
</script>
{#each birds as b}
  <g class={b.cls} stroke="#3a4463" stroke-width={b.w} fill="none" stroke-linecap="round" opacity={b.opacity}>
    <use href={`#${b.h}`} transform={t(b)}/>
  </g>
{/each}
