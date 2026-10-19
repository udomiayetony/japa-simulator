'use strict';
// Soft background music, made live in the browser with Web Audio (so it is our own, not
// a recording): warm chords, a gentle beat and a few piano-like notes. Browsers only allow
// sound after the player's first tap or key press, so it starts then.

const Music = (() => {
  const KEY = 'london-hustle-music';
  let on = true, ctx = null, master = null, timer = 0, nextTime = 0, step = 0, noise = null;
  const BPM = 74, STEP = 60 / BPM / 4; // sixteenth notes
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Fmaj7, Em7, Dm7, Cmaj7 (MIDI notes), one chord per bar
  const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const SCALE = [69, 72, 74, 76, 79, 81]; // A minor pentatonic, up high

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // A quiet vinyl hiss under everything
    const hiss = ctx.createBufferSource();
    hiss.buffer = noise;
    hiss.loop = true;
    const hf = ctx.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 3000;
    const hg = ctx.createGain();
    hg.gain.value = 0.012;
    hiss.connect(hf).connect(hg).connect(master);
    hiss.start();
  }

  function pad(t, notes) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = ctx.createGain();
    const dur = STEP * 16;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.9);
    g.gain.setValueAtTime(0.05, t + dur - 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    lp.connect(g).connect(master);
    for (const n of notes) for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.5);
    }
  }
  function keyNote(t, n, vol = 0.07) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.3);
  }
  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.32);
  }
  function hat(t, vol) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5, 0.06);
  }

  // Schedule a little ahead of time so the beat stays steady.
  function tick() {
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % CHORDS.length, s = step % 16;
      if (s === 0) { pad(nextTime, CHORDS[bar]); keyNote(nextTime, CHORDS[bar][0] - 12, 0.08); }
      if (s === 0 || s === 10) kick(nextTime);
      if (s % 4 === 2) hat(nextTime, 0.03);
      if (s % 2 === 0 && Math.random() < 0.28) keyNote(nextTime + (Math.random() < 0.5 ? 0 : STEP * 0.4), SCALE[Math.floor(Math.random() * SCALE.length)], 0.035);
      nextTime += STEP;
      step++;
    }
  }

  function play() {
    if (!ctx) setup();
    ctx.resume();
    if (!timer) {
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(tick, 60);
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
  }
  function stop() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => { if (!on) { clearInterval(timer); timer = 0; ctx.suspend(); } }, 500);
  }
  function syncButtons() {
    document.querySelectorAll('.music-btn').forEach((b) => {
      b.textContent = on ? '🔊' : '🔇';
      b.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    });
  }

  return {
    init() {
      try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { on = true; }
      const unlock = () => {
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
        if (on) play();
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
      });
      document.querySelectorAll('.music-btn').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); Music.toggle(); }; });
      syncButtons();
    },
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
      if (on) play(); else stop();
      syncButtons();
    },
    isOn: () => on,
  };
})();
