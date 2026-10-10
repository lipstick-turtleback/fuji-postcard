/* The transport: the bar clock, the meter, and the two ways a person asks for
   music. The composition is in sound/score.mjs, the signal path in
   sound/graph.mjs, the instruments in sound/voices.mjs — this file is the part
   that owns a Play button, a volume slider and a timer.

   It used to be one 686-line IIFE holding all four, which is what the old
   build made necessary and what the bundler no longer asks for. */

import { buildGraph } from './sound/graph.mjs';
import { BAR, BARS, BEAT, FLOOR, HZ, NBARS, SEED, seeded } from './sound/score.mjs';
import { ambience, drone, pluck } from './sound/voices.mjs';

const AC = window.AudioContext || window.webkitAudioContext;
const wrap = document.getElementById('sound');

if (!AC) {
  wrap.style.display = 'none';
} else {
  play(AC);
}

function play(AC) {
  /* ?silent — the piece runs and the clock runs and the meter still moves,
     but the last gain before the speakers is closed, so nothing reaches the
     room. It exists because a test run that presses Play and M on a real
     browser plays four and a half minutes at whoever is sitting at the
     machine, and because someone opening this page at a desk in the morning
     may want the picture without the koto. Closing the output rather than
     skipping the graph is the point: a soundtrack that was not built is not
     the soundtrack being tested. */
  const silent = /[?&]silent\b/.test(location.search);

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

  /** the graph, built the first time a person asks for music and not before */
  let g = null;
  let timer = null;
  let fadeTimer = null;
  let playing = false;
  let rafId = 0;
  let bar = 0;
  let barAt = 0;
  let pass = 0;
  let rand = seeded(SEED);

  /* one bar at a time, a little under half a second ahead. the bar index
     wraps, so the memory this holds is flat however long it runs. */
  function schedule() {
    const now = g.ctx.currentTime;
    for (let i = g.pending.length - 1; i >= 0; i--) {
      if (g.pending[i].end <= now) g.pending.splice(i, 1);
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
          pluck(g, HZ(n.m), t, n.g * b.level * shade, n.d * BEAT * 2.2, b.bright * tone);
        }
      }
      /* the drone is the one voice that rises out of silence, which makes it
         the one that must not be told to start in the past. a page starved
         for seconds — a background tab, a wake from sleep — gets here with
         the bar already gone: the notes guard themselves, but the drone's
         swell would be two thirds over before it was scheduled, arriving as
         a wash out of nowhere, which is the one sound on this page that
         reads as a beginning. anchor it to where the clock actually is. */
      if (b.drone) drone(g, Math.max(barAt, now + 0.02), b.dl);
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
    if (!g) g = buildGraph(AC, silent);
    const ctx = g.ctx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    bar = 0;
    pass = 0;
    rand = seeded(SEED);
    g.pending.length = 0;
    barAt = ctx.currentTime + 0.25;
    ambience(g);
    const t = ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(Math.max(g.master.gain.value, FLOOR), t);
    g.master.gain.linearRampToValueAtTime(level(), t + 1.2);
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
    const ctx = g.ctx;
    const t = ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(Math.max(g.master.gain.value, FLOOR), t);
    g.master.gain.linearRampToValueAtTime(FLOOR, t + 0.5);
    for (const n of g.amb) {
      try {
        n.stop(t + 0.6);
      } catch {
        /* already stopped */
      }
    }
    g.amb.length = 0;
    /* stop what was written ahead of the clock before it ever sounds */
    for (const v of g.pending) {
      for (const n of v.nodes) {
        try {
          n.stop(t);
        } catch {
          /* already stopped */
        }
      }
    }
    g.pending.length = 0;
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
    g.analyser.getByteFrequencyData(data);
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
    if (g && playing) {
      g.master.gain.cancelScheduledValues(g.ctx.currentTime);
      g.master.gain.setTargetAtTime(level(), g.ctx.currentTime, 0.05);
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
}
