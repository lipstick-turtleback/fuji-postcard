<!-- The ducks. Two of them, one nearer and therefore larger, both drawn by
     the same mark: what makes them two birds and not a pair of brackets is
     that they sit at different depths and so at different scales.

     The placement lives on a group and the animation is applied to that same
     group, never to the <use> that carries the placement. A CSS transform
     replaces the transform attribute outright — it does not compose with it —
     so a mark that is positioned by the attribute and animated by the
     stylesheet ends up positioned at the origin of the picture and bobbing
     there. The ducks did exactly that for as long as they bobbed, and every
     screenshot taken to check them was taken with motion switched off. -->
<script>
  import { place as t } from './place.mjs';
  let { ducks = [] } = $props();
</script>
<g fill="#141a2c" stroke="#141a2c">
  {#each ducks as p}
    <g class="duck" style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s`}>
      <use href={`#${p.h}`} transform={t(p)}/>
    </g>
  {/each}
</g>
