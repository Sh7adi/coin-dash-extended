// Scoring sounds synthesized with the Web Audio API. Audio starts on the first keydown or touch; M toggles mute.
window.CoinDashSound = (() => {
  let ctx = null, muted = false;
  const unlock = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx && AC) ctx = new AC();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { ctx = null; }
  };
  const tone = (freq, endFreq, start, dur, type = 'sine', vol = 0.15) => {
    const t = ctx.currentTime + start, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };
  const play = (fn) => () => {
    try { if (ctx && !muted && ctx.state === 'running') fn(); } catch (e) { /* audio unavailable */ }
  };
  window.addEventListener('keydown', (e) => {
    unlock();
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) muted = !muted;
  });
  window.addEventListener('pointerdown', unlock);
  return {
    coin: play(() => { tone(880, 880, 0, 0.06, 'square', 0.08); tone(1320, 1320, 0.06, 0.12, 'square', 0.08); }),
    hit: play(() => { tone(220, 55, 0, 0.45, 'sawtooth', 0.18); }),
    levelUp: play(() => { [659, 784, 988, 1319].forEach((f, i) => tone(f, f, i * 0.07, 0.12, 'square', 0.07)); }),
    timeUp: play(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, i * 0.12, 0.18, 'triangle', 0.15)); }),
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; }
  };
})();
