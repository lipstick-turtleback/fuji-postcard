<!-- Petals that have already reached the water. Each is the petal and what
     the water keeps of it, in one group, so the two move together: a floating
     thing whose reflection stayed put would be the first wrong thing anybody
     noticed.

     Two motions, two groups. The bob is the petal's own; the drift is the air
     and the current, and it belongs to the petal and its shadow together. They
     cannot share an element: a CSS transform replaces an SVG transform
     attribute rather than composing with it, and two animations on one element
     would fight over the same property with the later one winning.

     The arcs above each petal are a third group, sibling of the other two and
     never inside them: the water a floating petal disturbs drifts the same way
     at four fifths the distance on a longer clock, and it does not rise and fall
     with the petal. -->
<script>
  import { place as t } from './place.mjs';
  let { petals = [] } = $props();
</script>
<g fill="none" stroke="#e6dcc8">
  {#each petals as p}
    <g
      class="drift"
      style={`animation-duration:${p.line.dur}s; animation-delay:${p.line.delay}s; --dx:${p.line.dx}px; --dy:${p.line.dy}px`}
    >
      {#each p.line.ys as y, i}
        <path
          class="p-line"
          stroke-opacity={i ? '.11' : '.16'}
          stroke-width=".8"
          d={`M${p.x - p.line.w / 2} ${y} q ${p.line.w / 2} 1.3 ${p.line.w} 0`}
        />
      {/each}
    </g>
  {/each}
</g>
<g fill="#f4c3d0" opacity=".75">
  {#each petals as p}
    <g class="floater-drift" style={`animation-duration:${p.driftDur}s; animation-delay:${p.driftDelay}s; --dx:${p.drift}px; --dy:${p.driftDy}px`}>
      <g
        class="floater"
        style={`animation-duration:${p.dur}s; animation-delay:${p.delay}s; --rise:${p.rise}px; --set:${p.set}px; --tilt:${p.tilt}deg`}
      >
        <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}/>
        <path
          d={`M${p.x - p.w / 2} ${p.y + 3} q ${p.w / 2} 1.5 ${p.w} 0`}
          stroke="#1d2438"
          stroke-opacity=".28"
          stroke-width=".9"
          fill="none"
        />
      </g>
    </g>
  {/each}
</g>
