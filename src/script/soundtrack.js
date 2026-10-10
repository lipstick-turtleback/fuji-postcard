import { BAR, BARS, BEAT, FLOOR, HZ, NBARS, SEED, seeded } from './sound/score.mjs';

// biome-ignore lint/complexity/useArrowFunction: the page inlines this as a plain function IIFE
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const wrap = document.getElementById('sound');
  if (!AC) {
    wrap.style.display = 'none';
    return;
  }

  /* ?silent — the piece runs and the clock runs and the meter still moves,
     but the last gain before the speakers is closed, so nothing reaches the
     room. It exists because a test run that presses Play and M on a real
     browser plays four and a half minutes at whoever is sitting at the
     machine, and because someone opening this page at a desk in the morning
     may want the picture without the koto. Closing the output rather than
     skipping the graph is the point: a soundtrack that was not built is not
     the soundtrack being tested. */
  const silent = /[?&]silent\b/.test(location.search);

  let ctx;
  let master;
  let dry;
  let verbSend;
  let conv;
  let echoSend;
  let delayNode;
  let noiseBuf;
  let analyser;
  let sink;
  let amb = [];
  let timer = null;
  let fadeTimer = null;
  let playing = false;
  let rafId = 0;
  let bar = 0;
  let barAt = 0;
  let pass = 0;
  let rand = seeded(SEED);
  /* voices already scheduled ahead of the clock. a bar is written out in
     one go, so pausing has to silence what is still waiting, or the next
     play starts with two notes from the phrase that was interrupted. */
  let pending = [];

  const btn = document.getElementById('play');
  const glyph = document.getElementById('playGlyph');
  const label = document.getElementById('playLabel');
  const vol = document.getElementById('vol');
  const bars = [...document.querySelectorAll('#eq i')];
  const data = new Uint8Array(512);
  const BANDS = [
    [2, 9],
    [9, 20],
    [20, 44],
    [44, 90],
    [90, 170],
  ];

  function noiseBuffer(sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    const r = seeded(0x51ed2701);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return buf;
  }

  /* procedural impulse response: exponentially decaying noise */
  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    const r = seeded(0x27220a95);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * (1 - i / n) ** decay;
    }
    return buf;
  }

  function build() {
    ctx = new AC();
    noiseBuf = noiseBuffer(2);

    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    // the analyser sits before the gate, so ?silent still meters real signal
    sink = ctx.createGain();
    sink.gain.value = silent ? 0 : 1;
    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(sink);
    sink.connect(ctx.destination);

    dry = ctx.createGain();
    dry.gain.value = 0.85;
    dry.connect(master);

    conv = ctx.createConvolver();
    conv.buffer = impulse(2.6, 3.4);
    verbSend = ctx.createGain();
    verbSend.gain.value = 0.3;
    verbSend.connect(conv);
    conv.connect(master);

    echoSend = ctx.createGain();
    echoSend.gain.value = 0.18;
    delayNode = ctx.createDelay(1.5);
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
  }

  function route(node) {
    node.connect(dry);
    node.connect(verbSend);
    node.connect(echoSend);
  }

  /* koto / shamisen pluck: inharmonic partials, fast attack, filtered decay */
  const PARTIALS = [
    [1, 'triangle', 1],
    [2.004, 'sine', 0.34],
    [3.01, 'sine', 0.13],
    [4.98, 'sine', 0.05],
  ];

  function pluck(freq, t, gain, dur, bright) {
    if (!(freq > 0) || !(t > 0)) return;
    const g = Math.max(FLOOR, gain);
    const d = Math.max(0.2, dur);
    const b = Math.max(0.2, bright);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(Math.min(freq * 9 * b, 11000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.8, 140), t + Math.min(d, 1.5));

    const env = ctx.createGain();
    env.gain.setValueAtTime(FLOOR, t);
    env.gain.exponentialRampToValueAtTime(g, t + 0.008);
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
    route(lp);

    const pick = ctx.createBufferSource();
    pick.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(freq * 5.5, 5200);
    bp.Q.value = 1.1;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(g * 0.5, t);
    pg.gain.exponentialRampToValueAtTime(FLOOR, t + 0.045);
    pick.connect(bp);
    bp.connect(pg);
    pg.connect(dry);
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
    pending.push({ end: t + d + 0.05, nodes: srcs });
  }

  /* low bowed/breath swell under the phrases */
  function drone(t, beats) {
    const len = BEAT * Math.max(4, beats);
    const g = ctx.createGain();
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 2.2);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + len);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = HZ(38);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = HZ(50);
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);

    const breath = ctx.createBufferSource();
    breath.buffer = noiseBuf;
    breath.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = HZ(50) * 2;
    bp.Q.value = 7;
    const bg = ctx.createGain();
    bg.gain.value = 0.014;
    breath.connect(bp);
    bp.connect(bg);
    bg.connect(g);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.2;
    const lg = ctx.createGain();
    lg.gain.value = 1.1;
    lfo.connect(lg);
    lg.connect(o.frequency);
    lg.connect(o2.frequency);

    g.connect(dry);
    g.connect(verbSend);
    const srcs = [o, o2, lfo, breath];
    for (const x of srcs) {
      x.start(t);
      x.stop(t + len + 0.1);
    }
    o.onended = () => {
      for (const n of srcs.concat([g, g2, bp, bg, lg])) n.disconnect();
    };
    pending.push({ end: t + len + 0.1, nodes: srcs });
  }

  /* the lake: slow filtered noise with a drifting cutoff */
  function ambience() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 170;
    lfo.connect(lg);
    lg.connect(lp.frequency);
    src.connect(lp);
    lp.connect(hp);
    hp.connect(g);
    g.connect(master);
    src.start();
    lfo.start();
    amb.push(src, lfo);
  }

  /* one bar at a time, a little under half a second ahead. the bar index
     wraps, so the memory this holds is flat however long it runs. */
  function schedule() {
    const now = ctx.currentTime;
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].end <= now) pending.splice(i, 1);
    }
    const horizon = now + 0.5;
    const shade = 1 + 0.05 * Math.sin(pass * 1.3 + 0.4);
    const tone = 1 + 0.07 * Math.sin(pass * 0.9 + 1.1);
    let guard = 0;
    while (guard++ < 16 && barAt < horizon) {
      const b = BARS[bar];
      const breath = bar % 8 === 0 ? 0.04 : 0; // a breath before each phrase
      for (let i = 0; i < b.notes.length; i++) {
        const n = b.notes[i];
        const t = barAt + n.b * BEAT + breath + (rand() - 0.5) * 0.024;
        if (t > now) {
          pluck(HZ(n.m), t, n.g * b.level * shade, n.d * BEAT * 2.2, b.bright * tone);
        }
      }
      /* the drone is the one voice that rises out of silence, which makes it
         the one that must not be told to start in the past. a page starved
         for seconds — a background tab, a wake from sleep — gets here with
         the bar already gone: the notes guard themselves, but the drone's
         swell would be two thirds over before it was scheduled, arriving as
         a wash out of nowhere, which is the one sound on this page that
         reads as a beginning. anchor it to where the clock actually is. */
      if (b.drone) drone(Math.max(barAt, now + 0.02), b.dl);
      barAt += BAR;
      bar++;
      if (bar === NBARS) {
        bar = 0;
        pass++;
      }
    }
  }

  const level = () => (vol.value / 100) * 0.55;

  function start() {
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    bar = 0;
    pass = 0;
    rand = seeded(SEED);
    pending = [];
    barAt = ctx.currentTime + 0.25;
    ambience();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, FLOOR), t);
    master.gain.linearRampToValueAtTime(level(), t + 1.2);
    timer = setInterval(schedule, 60);
    schedule();
    playing = true;
    wrap.classList.add('playing');
    btn.setAttribute('aria-pressed', 'true');
    glyph.textContent = '❚❚';
    label.textContent = 'Pause';
    meter();
  }

  function stop() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    timer = null;
    cancelAnimationFrame(rafId);
    rafId = 0;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, FLOOR), t);
    master.gain.linearRampToValueAtTime(FLOOR, t + 0.5);
    for (const n of amb) {
      try {
        n.stop(t + 0.6);
      } catch {
        /* already stopped */
      }
    }
    amb = [];
    /* stop what was written ahead of the clock before it ever sounds */
    for (const v of pending) {
      for (const n of v.nodes) {
        try {
          n.stop(t);
        } catch {
          /* already stopped */
        }
      }
    }
    pending = [];
    for (const b of bars) b.style.height = '10%';
    wrap.classList.remove('playing');
    btn.setAttribute('aria-pressed', 'false');
    glyph.textContent = '▶';
    label.textContent = 'Play';
    /* let the fade and the last reverb tail finish, then idle the clock */
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      if (!playing && ctx.state !== 'closed') ctx.suspend().catch(() => {});
    }, 620);
  }

  function meter() {
    if (!playing) return;
    analyser.getByteFrequencyData(data);
    for (const [i, el] of bars.entries()) {
      const [a, z] = BANDS[i];
      let s = 0;
      for (let k = a; k < z; k++) s += data[k];
      const v = Math.min(1, s / (z - a) / 130);
      el.style.height = `${(10 + v * 90).toFixed(1)}%`;
    }
    rafId = requestAnimationFrame(meter);
  }

  /* the two ways a person asks for music. both mean the same thing */
  const toggle = () => {
    if (playing) stop();
    else start();
  };
  btn.addEventListener('click', toggle);
  const paintVol = () => vol.style.setProperty('--fill', `${vol.value}%`);
  paintVol();
  vol.addEventListener('input', () => {
    paintVol();
    if (ctx && playing) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey) toggle();
  });

  /* Nothing starts the music but a person. The Play button and M are the
     only ways in, and the audio graph is not built until one of them is
     used — a page that opens making sound is a page that did not ask.

     It used to start itself: if the browser allowed it the piece began on
     load, and failing that the first click or keypress anywhere began it. A
     preview reload, a test harness, or any browser with a permissive
     autoplay policy then played four and a half minutes at people who had
     not asked for music, and clicking the card — the first thing anyone does
     — counted as permission. That is also what made the old restart bug
     possible: the piece stopped, a later click started it again from bar 1,
     and the button still read Play. With no autostart there is nothing left
     to restart, and the flag that remembered a human's choice went with it. */
})();
