<!-- The ducks. Two of them, one nearer and therefore larger, both drawn by
     the same mark: what makes them two birds and not a pair of brackets is
     that they sit at different depths and so at different scales.

     The placement lives on a group and the animation is applied to that same
     group, never to the <use> that carries the placement. A CSS transform
     replaces the transform attribute outright — it does not compose with it —
     so a mark that is positioned by the attribute and animated by the
     stylesheet ends up positioned at the origin of the picture and bobbing
     there. The ducks did exactly that for as long as they bobbed, and every
     screenshot taken to check them was taken with motion switched off.

     Three groups, three motions, and the grouping is the picture. The outer
     group is the bird crossing the water; inside it the bird rides a swell and
     the smear the lake keeps of it rides with it, through the rise and the tilt,
     because a floating body whose reflection stayed behind would be the first
     wrong thing anybody noticed. The ring the bird leaves is outside that group
     and on a longer clock than the bird: it is water, and water is what the bird
     was moving through. -->
<script>
  import { place as t } from './place.mjs';
  let { ducks = [] } = $props();
</script>
{#each ducks as p}
  <g
    class="drift"
    style={`animation-duration:${p.driftDur}s; animation-delay:${p.driftDelay}s; --dx:${p.drift}px; --dy:${p.driftDy}px`}
  >
    <g
      class="duck"
      style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s; --rise:${p.rise}px; --set:${p.set}px; --tilt:${p.tilt}deg`}
    >
      <g fill="#141a2c" stroke="#141a2c">
        <use href={`#${p.h}`} transform={t(p)}/>
      </g>
      <ellipse
        class="reflection"
        fill="#141a2c"
        stroke="none"
        opacity=".16"
        cx={p.refl.cx}
        cy={p.refl.cy}
        rx={p.refl.rx}
        ry={p.refl.ry}
        style={`--wob: ${p.refl.wob}px; --stretch: ${p.refl.stretch}; --rdur: ${p.refl.rdur}s; --rdelay: ${p.refl.rdelay}s`}
      />
    </g>
  </g>
  <g
    class="drift"
    style={`animation-duration:${p.ring.driftDur}s; animation-delay:${p.ring.driftDelay}s; --dx:${p.ring.drift}px; --dy:0`}
  >
    <path
      class="ring"
      stroke="#e6dcc8"
      stroke-opacity=".22"
      stroke-width="1"
      fill="none"
      d={p.ring.d}
      style={`--rdur: ${p.ring.dur}s; --rdelay: ${p.ring.delay}s`}
    />
  </g>
{/each}
