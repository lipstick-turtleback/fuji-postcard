// biome-ignore lint/complexity/useArrowFunction: the page inlines this as a plain function IIFE
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const wrap = document.getElementById('sound');
  if (!AC) {
    wrap.style.display = 'none';
    return;
  }

  /* =============================================================
     Soundtrack — synthesised live with the Web Audio API.
     No audio files, no network requests.

     D hirajōshi (D F G A C) · 66 bpm · 4/4 · 80 bars ≈ 4 min 50 s
     through-composed, in ten eight-bar phrases:

       A    statement        bars  1– 8   opens bare, drone in at 5
       A'   answer           bars  9–16   same head, different tail
       B    contrast         bars 17–24   upper register, wide, one bar of rest
       A2   the tune again   bars 25–32   an octave down, darker touch
       C    bloom            bars 33–40   fullest: brightest, most notes
       B'   contrast again   bars 41–48   quieter, more silence
       A3   coming apart     bars 49–56   the head, then only pieces of it
       D    drifting         bars 57–64   stepwise, mid register
       A4   recall           bars 65–72   the tune, answered from below
       coda                 bars 73–80   thins to drone, ends on the open fifth

     The coda's last note is a low A held against the drone's D, and bar 1
     opens on the A an octave above it — so the seam back to the top is not
     a seam. Nothing literally returns for 80 bars; each pass through the
     score is shaded a few percent by a slow seeded drift, so the second
     pass is the same piece and not the same recording.

     Score notation: one string per bar, notes space-separated, each note
     "step.beat.len.touch" — step indexes SCALE below (0 = D2 … 14 = C5),
     beat and len are in half-beats (8 half-beats = one bar), touch is
     p soft · m sung · f full. An empty string is a bar of nothing.

     Three layers at most: one plucked line, the drone, the lake.
     ============================================================= */

  const BPM = 66;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const FLOOR = 0.0001;
  const SEED = 19580524;

  const HZ = (m) => 440 * 2 ** ((m - 69) / 12);
  const SCALE = [38, 41, 43, 45, 48, 50, 53, 55, 57, 60, 62, 65, 67, 69, 72];
  const TOUCH = { p: 0.34, m: 0.46, f: 0.58 };

  /* mulberry32 — seeded, so the piece is reproducible rather than random */
  function seeded(s) {
    let a = s >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* drone: [bar offsets within the phrase that start a swell], dl: its
     length in beats. bright and level are the touch of that phrase. */
  const PHRASES = [
    {
      bright: 1.0,
      level: 0.92,
      drone: [4],
      dl: 16,
      bars: [
        '8.0.2.m 7.2.1.p 8.3.1.p 10.4.2.f 9.6.2.m',
        '8.0.3.m 7.3.1.p 6.4.2.m 7.6.2.p',
        '10.0.2.f 9.2.1.m 8.3.1.m 7.4.2.m 6.6.2.p',
        '5.0.4.f 6.6.1.p 7.7.1.p',
        '8.0.1.p 9.1.2.m 10.2.2.f 11.4.2.f 10.6.2.f',
        '9.0.2.m 8.2.1.m 7.3.2.m 8.5.2.p',
        '6.0.2.m 7.2.1.p 8.3.1.m 9.4.2.m 8.6.2.m',
        '5.0.4.f 5.6.2.p',
      ],
    },
    {
      bright: 1.06,
      level: 0.96,
      drone: [0, 4],
      dl: 14,
      bars: [
        '8.0.3.m 7.3.1.p 8.4.1.p 10.5.2.f 9.7.1.m',
        '8.0.3.m 7.3.1.p 6.4.1.p 5.5.3.m',
        '10.0.2.f 11.2.1.m 10.3.1.m 9.4.2.m 8.6.2.p',
        '5.0.2.m 6.2.1.p 8.3.2.m 9.5.2.p',
        '10.0.2.f 11.2.2.m 10.4.2.m 9.6.2.p',
        '8.0.2.m 9.2.1.p 8.3.1.p 7.4.2.m 8.6.2.p',
        '6.0.3.m 5.3.1.p 6.4.2.m 8.6.2.p',
        '5.0.2.m 3.2.2.p 5.4.4.f',
      ],
    },
    {
      bright: 1.14,
      level: 0.9,
      drone: [0],
      dl: 16,
      bars: [
        '11.0.3.f 10.3.1.p 9.4.3.m',
        '9.0.4.m 10.4.2.p 9.6.2.p',
        '11.0.2.f 10.2.2.m 9.4.2.m 8.6.2.p',
        '',
        '10.0.3.m 9.3.1.p 8.4.3.m 7.7.1.p',
        '8.0.2.m 6.2.2.p 7.4.2.m 8.6.2.p',
        '9.0.2.m 10.2.1.p 11.3.3.f 10.6.2.m',
        '10.0.2.m 9.2.2.p 8.4.4.m',
      ],
    },
    {
      bright: 0.82,
      level: 0.95,
      drone: [4],
      dl: 16,
      bars: [
        '3.0.2.m 2.2.1.p 3.3.1.p 5.4.2.f 4.6.2.m',
        '3.0.3.m 2.3.1.p 3.4.2.m 2.6.2.p',
        '5.0.2.f 4.2.1.m 3.3.1.m 2.4.2.m 3.6.2.p',
        '5.0.4.f 3.4.2.p 4.6.1.p',
        '3.0.1.p 4.1.2.m 5.3.2.f 6.5.2.f 5.7.2.f',
        '4.0.2.m 3.2.1.m 2.3.2.m 3.5.2.p',
        '2.0.2.m 3.2.1.p 4.3.1.m 5.4.2.m 4.6.2.m',
        '5.0.4.f 3.6.2.p',
      ],
    },
    {
      bright: 1.22,
      level: 1.02,
      drone: [0, 4],
      dl: 14,
      bars: [
        '8.0.1.p 9.1.1.p 10.2.2.f 11.4.1.f 12.5.1.f 11.6.1.m 10.7.1.m',
        '10.0.2.f 9.2.1.m 8.3.1.m 9.4.2.m 10.6.2.m',
        '11.0.2.f 10.2.1.m 11.3.1.m 12.4.3.f 11.7.1.m',
        '10.0.3.f 9.3.1.m 8.4.2.m 6.6.2.p',
        '8.0.2.m 10.2.1.p 9.3.1.p 8.4.2.m 7.6.1.p 6.7.1.p',
        '5.0.2.f 6.2.1.p 8.3.1.m 9.4.1.m 10.5.1.m 9.6.2.m',
        '8.0.1.p 9.1.1.p 10.2.1.m 11.3.1.m 12.4.2.f 11.6.2.m',
        '10.0.2.f 8.2.1.m 7.3.1.p 8.4.4.m',
      ],
    },
    {
      bright: 1.02,
      level: 0.84,
      drone: [0],
      dl: 16,
      bars: [
        '11.0.4.m 10.4.2.p 9.6.2.p',
        '',
        '9.0.3.m 8.3.1.p 6.4.3.m 5.7.1.p',
        '10.0.3.m 11.3.1.p 10.4.2.p 9.6.2.p',
        '8.0.4.m 7.4.2.p 6.6.2.p',
        '5.0.2.m 8.2.2.p 9.4.2.m 8.6.2.p',
        '11.0.2.m 9.2.2.p 8.4.2.m 7.6.2.p',
        '8.0.3.m 6.3.1.p 5.4.4.m',
      ],
    },
    {
      bright: 0.94,
      level: 0.8,
      drone: [4],
      dl: 14,
      bars: [
        '8.0.2.m 7.2.1.p 8.3.1.p',
        '10.0.2.m 9.2.1.p 8.3.1.p 7.4.2.p',
        '',
        '6.0.2.p 7.2.1.p 8.3.3.m',
        '8.0.1.p 10.1.2.m 9.3.1.p 8.4.2.m',
        '5.0.3.m 3.3.1.p 5.4.2.p 6.6.1.p',
        '9.0.2.m 8.2.2.p 7.4.2.p',
        '8.0.2.m 7.2.1.p 6.3.1.p 5.4.4.f',
      ],
    },
    {
      bright: 1.1,
      level: 0.92,
      drone: [0, 4],
      dl: 14,
      bars: [
        '6.0.2.p 8.2.2.m 7.4.2.p 9.6.2.m',
        '8.0.2.m 10.2.2.m 9.4.2.p 11.6.2.m',
        '10.0.2.m 11.2.2.m 12.4.2.m 11.6.2.p',
        '10.0.3.m 9.3.1.p 8.4.2.m 7.6.1.p 6.7.1.p',
        '7.0.2.p 8.2.2.m 9.4.2.m 10.6.2.m',
        '9.0.2.m 8.2.1.p 7.3.1.p 6.4.2.m 5.6.2.f',
        '8.0.2.m 6.2.1.p 5.3.1.p 6.4.2.m 8.6.2.m',
        '9.0.4.m 8.4.2.p 7.6.2.p',
      ],
    },
    {
      bright: 1.0,
      level: 0.9,
      drone: [0],
      dl: 16,
      bars: [
        '8.0.2.m 7.2.1.p 8.3.1.p 9.4.1.p 10.5.1.m 9.6.2.m',
        '5.0.2.p 3.2.2.p 5.4.2.m 6.6.2.p',
        '10.0.2.m 9.2.1.m 8.3.1.p 7.4.1.p 6.5.1.p 5.6.2.m',
        '3.0.2.p 5.2.3.m 4.5.1.p 5.6.2.m',
        '8.0.1.p 9.1.1.p 10.2.2.m 11.4.1.m 10.5.1.m 9.6.2.m',
        '9.0.2.m 8.2.1.m 7.3.1.p 8.4.2.m 9.6.2.p',
        '6.0.2.m 7.2.1.p 8.3.1.m 9.4.1.m 8.5.1.p 6.6.2.p',
        '5.0.4.m 6.4.2.p 8.6.2.p',
      ],
    },
    {
      bright: 0.88,
      level: 0.78,
      drone: [0, 4],
      dl: 16,
      bars: [
        '8.0.3.p 7.3.1.p 6.4.2.p 5.6.2.m',
        '',
        '5.0.2.m 3.2.2.p 4.4.1.p 5.5.3.m',
        '',
        '9.0.3.p 8.3.1.p 7.4.4.m',
        '',
        '5.0.6.m',
        '3.0.6.m',
      ],
    },
  ];

  const BARS = [];
  for (const ph of PHRASES) {
    for (const [i, line] of ph.bars.entries()) {
      const notes = [];
      if (line) {
        for (const tok of line.split(' ')) {
          const f = tok.split('.');
          notes.push({
            m: SCALE[+f[0]],
            b: +f[1] / 2,
            d: +f[2] / 2,
            g: TOUCH[f[3]],
          });
        }
      }
      BARS.push({
        notes,
        drone: ph.drone.indexOf(i) >= 0,
        dl: ph.dl,
        bright: ph.bright,
        level: ph.level,
      });
    }
  }
  const NBARS = BARS.length;

  let ctx;
  let master;
  let dry;
  let verbSend;
  let conv;
  let echoSend;
  let delayNode;
  let noiseBuf;
  let analyser;
  let amb = [];
  let timer = null;
  let fadeTimer = null;
  let playing = false;
  /* has a human spoken about the music? the play button and M are the only
     answers; until one of them is given the page may start the piece on its
     own, and after one it never may */
  let chosen = false;
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
    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(ctx.destination);

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

  /* the two ways a person talks about the music. both mean the same thing,
     and both mean the page is no longer allowed to have an opinion */
  const toggle = () => {
    chosen = true;
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

  /* Start on our own if the browser allows it; otherwise the very first
     click or keypress anywhere on the page starts it. The play button is
     left alone — it already starts the music itself.

     "On our own" ends the moment a person has made a choice. It used to not
     end: the gesture listeners were only removed by a gesture that was not
     on the play button, so somebody who started the piece, stopped it, and
     then clicked the card to look at it got the whole thing thrown back at
     them from bar 1 — by itself, mid-handling, with the button still
     reading Play. `chosen` is the memory that a human has spoken about the
     music, and after that nothing but a human starts or stops it. */
  build();
  const begin = () => {
    if (!chosen && !playing) start();
  };
  ctx
    .resume()
    .then(begin)
    .catch(() => {});
  const gesture = (ev) => {
    removeEventListener('pointerdown', gesture);
    removeEventListener('keydown', gesture);
    if (ev.target?.closest?.('#play')) {
      chosen = true;
      return;
    }
    ctx
      .resume()
      .then(begin)
      .catch(() => {});
  };
  addEventListener('pointerdown', gesture);
  addEventListener('keydown', gesture);
})();
