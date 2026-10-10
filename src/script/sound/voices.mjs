/* The three instruments. Each is handed the graph and a moment, builds its
   nodes, schedules its own cleanup, and registers the sources it started with
   the graph's `pending` list so that a pause can stop what has not sounded
   yet. None of them knows that a transport exists. */
import { BEAT, FLOOR, HZ } from './score.mjs';

/* koto / shamisen pluck: inharmonic partials, fast attack, filtered decay */
export const PARTIALS = [
  [1, 'triangle', 1],
  [2.004, 'sine', 0.34],
  [3.01, 'sine', 0.13],
  [4.98, 'sine', 0.05],
];

export function pluck(g, freq, t, gain, dur, bright) {
  const ctx = g.ctx;
  if (!(freq > 0) || !(t > 0)) return;
  const gn = Math.max(FLOOR, gain);
  const d = Math.max(0.2, dur);
  const b = Math.max(0.2, bright);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.6;
  lp.frequency.setValueAtTime(Math.min(freq * 9 * b, 11000), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.8, 140), t + Math.min(d, 1.5));

  const env = ctx.createGain();
  env.gain.setValueAtTime(FLOOR, t);
  env.gain.exponentialRampToValueAtTime(gn, t + 0.008);
  env.gain.exponentialRampToValueAtTime(FLOOR, t + d);

  const made = [env, lp];
  const srcs = [];
  let last;
  for (const [mult, type, lvl] of PARTIALS) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult * 0.995, t); // slight bend up into pitch
    o.frequency.exponentialRampToValueAtTime(freq * mult, t + 0.07);
    const pg = ctx.createGain();
    pg.gain.value = lvl;
    o.connect(pg);
    pg.connect(env);
    o.start(t);
    o.stop(t + d + 0.05);
    made.push(o, pg);
    srcs.push(o);
    last = o;
  }
  env.connect(lp);
  g.route(lp);

  const pick = ctx.createBufferSource();
  pick.buffer = g.noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(freq * 5.5, 5200);
  bp.Q.value = 1.1;
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(gn * 0.5, t);
  pg.gain.exponentialRampToValueAtTime(FLOOR, t + 0.045);
  pick.connect(bp);
  bp.connect(pg);
  pg.connect(g.dry);
  pick.start(t);
  pick.stop(t + 0.06);
  pick.onended = () => {
    pick.disconnect();
    bp.disconnect();
    pg.disconnect();
  };

  last.onended = () => {
    for (const n of made) n.disconnect();
  };
  srcs.push(pick);
  g.pending.push({ end: t + d + 0.05, nodes: srcs });
}

/* low bowed/breath swell under the phrases */
export function drone(g, t, beats) {
  const ctx = g.ctx;
  const len = BEAT * Math.max(4, beats);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, t);
  gain.gain.exponentialRampToValueAtTime(0.05, t + 2.2);
  gain.gain.exponentialRampToValueAtTime(FLOOR, t + len);

  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = HZ(38);
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = HZ(50);
  const g2 = ctx.createGain();
  g2.gain.value = 0.22;
  o.connect(gain);
  o2.connect(g2);
  g2.connect(gain);

  const breath = ctx.createBufferSource();
  breath.buffer = g.noiseBuf;
  breath.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = HZ(50) * 2;
  bp.Q.value = 7;
  const bg = ctx.createGain();
  bg.gain.value = 0.014;
  breath.connect(bp);
  bp.connect(bg);
  bg.connect(gain);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.2;
  const lg = ctx.createGain();
  lg.gain.value = 1.1;
  lfo.connect(lg);
  lg.connect(o.frequency);
  lg.connect(o2.frequency);

  gain.connect(g.dry);
  gain.connect(g.verbSend);
  const srcs = [o, o2, lfo, breath];
  for (const x of srcs) {
    x.start(t);
    x.stop(t + len + 0.1);
  }
  o.onended = () => {
    for (const n of srcs.concat([gain, g2, bp, bg, lg])) n.disconnect();
  };
  g.pending.push({ end: t + len + 0.1, nodes: srcs });
}

/* the lake: slow filtered noise with a drifting cutoff */
export function ambience(g) {
  const ctx = g.ctx;
  const src = ctx.createBufferSource();
  src.buffer = g.noiseBuf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  lp.Q.value = 0.4;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 90;
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lg = ctx.createGain();
  lg.gain.value = 170;
  lfo.connect(lg);
  lg.connect(lp.frequency);
  src.connect(lp);
  lp.connect(hp);
  hp.connect(gain);
  gain.connect(g.master);
  src.start();
  lfo.start();
  g.amb.push(src, lfo);
}
