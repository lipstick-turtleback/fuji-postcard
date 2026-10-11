<!-- Petals off the branch. Ten of them, every one of them falling, and the
     sheet does not decide how fast: each petal carries both tiers as custom
     properties and the stylesheet chooses which one applies.

     Two groups per petal, not one. The fall and the slide are two motions, and
     a CSS transform replaces an SVG transform attribute rather than composing
     with it, so the placement stays on the use element, the fall goes on the
     outer group, and the slide and the flutter go on the inner one. Two
     animations on one element would fight over the same property and the later
     one would win — which is how the petals on the water are built too. -->
<script>
  import { place as t } from './place.mjs';
  let { petals = [] } = $props();
</script>
<g fill="#f4c3d0">
  {#each petals as p}
    <g
      class={`petal p${p.n}`}
      style={`--dur: ${p.dur}s; --delay: ${p.delay}s; --dur-on: ${p.durOn}s; --delay-on: ${p.delayOn}s; --fall: ${p.fall}px; --setx: ${p.setx}px`}
    >
      <g
        class="petal-sway"
        style={`--sway: ${p.sway}px; --sway-dur: ${p.swayDur}s; --sway-delay: ${p.swayDelay}s`}
      >
        <use href="#petalShape" transform={t(p)}/>
      </g>
    </g>
  {/each}
</g>
