<!-- Petals that have already reached the water. Each is the petal and what
     the water keeps of it, in one group, so the two move together: a floating
     thing whose reflection stayed put would be the first wrong thing anybody
     noticed. -->
<script>
  import { place as t } from './place.mjs';
  let { petals = [] } = $props();
</script>
<g fill="#f4c3d0" opacity=".75">
  {#each petals as p}
    <g class="floater" style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s`}>
      <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}/>
      <path d={`M${p.x - p.w / 2} ${p.y + 3} h${p.w}`} stroke="#1d2438" stroke-opacity=".28" stroke-width=".9" fill="none"/>
    </g>
  {/each}
</g>
