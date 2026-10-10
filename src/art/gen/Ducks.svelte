<!-- The ducks. Two of them, one nearer and therefore larger, both drawn by
     the same mark: what makes them two birds and not a pair of brackets is
     that they sit at different depths and so at different scales. -->
<script>
  import { place as t } from './place.mjs';
  let { ducks = [] } = $props();
</script>
<g fill="#141a2c" stroke="#141a2c">
  {#each ducks as p}
    <use class="duck" href={`#${p.h}`} transform={t(p)} style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s`}/>
  {/each}
</g>
