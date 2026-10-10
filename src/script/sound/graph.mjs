/* The audio graph: what the signal path is, built once, and only when a
   person has asked for music.

   It is a separate module because it is the only part that touches
   AudioContext construction, and because the voices need it without needing
   the transport: they are handed this and nothing else. The graph owns the
   bookkeeping of voices already scheduled (`pending`) and of the lake layers
   it is holding open (`amb`), because both are things the graph has to let go
   of when the piece stops. */
import { BEAT, seeded } from './score.mjs';

function noiseBuffer(ctx, sec) {
  const n = Math.floor(ctx.sampleRate * sec);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = seeded(0x51ed2701);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  return buf;
}

/* procedural impulse response: exponentially decaying noise */
function impulse(ctx, sec, decay) {
  const n = Math.floor(ctx.sampleRate * sec);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  const r = seeded(0x27220a95);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * (1 - i / n) ** decay;
  }
  return buf;
}

export function buildGraph(AC, silent) {
  const ctx = new AC();
  const noiseBuf = noiseBuffer(ctx, 2);

  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 4;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  // the analyser sits before the gate, so ?silent still meters real signal
  const sink = ctx.createGain();
  sink.gain.value = silent ? 0 : 1;
  master.connect(comp);
  comp.connect(analyser);
  analyser.connect(sink);
  sink.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(master);

  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx, 2.6, 3.4);
  const verbSend = ctx.createGain();
  verbSend.gain.value = 0.3;
  verbSend.connect(conv);
  conv.connect(master);

  const echoSend = ctx.createGain();
  echoSend.gain.value = 0.18;
  const delayNode = ctx.createDelay(1.5);
  delayNode.delayTime.value = BEAT * 0.75;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1700;
  const fb = ctx.createGain();
  fb.gain.value = 0.33;
  echoSend.connect(delayNode);
  delayNode.connect(damp);
  damp.connect(fb);
  fb.connect(delayNode);
  damp.connect(master);

  return {
    ctx,
    master,
    dry,
    verbSend,
    conv,
    echoSend,
    delayNode,
    analyser,
    sink,
    noiseBuf,
    /* voices already scheduled ahead of the clock. a bar is written out in
       one go, so pausing has to silence what is still waiting, or the next
       play starts with two notes from the phrase that was interrupted. */
    pending: [],
    amb: [],
    route(node) {
      node.connect(dry);
      node.connect(verbSend);
      node.connect(echoSend);
    },
  };
}
