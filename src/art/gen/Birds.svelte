<!-- The three birds, placed. Each one carries its own weight of line: the
     nearer the bird, the thicker the stroke and the more of it there is. Each
     also carries how far it drifts, which is data for the same reason the
     placement is data: three birds in a still sky are not one bird moved three
     times. -->
<script>
  import { place as t } from './place.mjs';
  let { birds = [] } = $props();
</script>
{#each birds as b}
  <g
    class={b.cls}
    style="--dx: {b.dx}px; --dy: {b.dy}px"
    stroke="#3a4463"
    stroke-width={b.w}
    fill="none"
    stroke-linecap="round"
    opacity={b.opacity}
  >
    <use href={`#${b.h}`} transform={t(b)}/>
  </g>
{/each}
