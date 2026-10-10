<!-- The plant stands. Forty-five placements of thirteen marks, written once
     as data instead of forty-five hand-typed transforms: the shape of a
     placement (where it roots, how far it leans, whether it is taller than it
     is wide) is the interesting part, and repeating it by hand is how every
     clump on the shore ended up the same plant at a different scale. -->
<script>
  let { stands = [] } = $props();

  // transform order matters: translate, then lean, then stretch
  const t = (p) =>
    `translate(${p.x} ${p.y})` +
    (p.rot ? ` rotate(${p.rot})` : '') +
    (p.skew ? ` skewX(${p.skew})` : '') +
    (p.sx === undefined ? '' : ` scale(${p.sx}${p.sy !== undefined && p.sy !== p.sx ? ` ${p.sy}` : ''})`);
</script>
{#each stands as s}
  <g fill={s.fill} stroke={s.fill} stroke-linecap="round" class={s.sway || null} style={s.delay ? `animation-delay:${s.delay}` : null}>
    {#each s.items as p}
      <use href={`#${p.h}`} transform={t(p)}/>
    {/each}
  </g>
{/each}
