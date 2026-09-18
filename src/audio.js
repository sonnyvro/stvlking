// src/audio.js
// Shared Web Audio pipeline.
// Every track's audio element routes through here so we can apply
// EQ filters and master gain. Attach is idempotent: each <audio>
// element can be attached only once (Web Audio rule).

let audioCtx = null;
let masterGain = null;
let eqLow = null;
let eqMid = null;
let eqHigh = null;
let analyser = null;
let freqData = null;

const sourceCache = new WeakMap();

export function ensureAudioGraph() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    audioCtx = new Ctx();

    // Filter chain (all flat for now):
    //   source -> low -> mid -> high -> gain -> destination
    eqLow = audioCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 200;
    eqLow.gain.value = 0;

    eqMid = audioCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1;
    eqMid.gain.value = 0;

    eqHigh = audioCtx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    eqHigh.gain.value = 0;

       // Analyser sits between eqHigh and masterGain as a passthrough.
    // It doesn't alter audio; we only read frequency data from it.
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.25;
    freqData = new Uint8Array(analyser.frequencyBinCount);

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;

    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(analyser);
    analyser.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    return audioCtx;
}

// Attach an <audio> element to the pipeline. Safe to call many times;
// only does real work on the first call per element.
export function attachAudio(audioEl) {
    const ctx = ensureAudioGraph();
    if (!ctx) return false;
    if (sourceCache.has(audioEl)) return true;

    let source;
    try {
        source = ctx.createMediaElementSource(audioEl);
    } catch (_) {
        // Element already has a source somewhere; bail.
        return false;
    }
    source.connect(eqLow);
    sourceCache.set(audioEl, source);
    return true;
}

export function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

export function setMasterVolume(v) {
    if (!masterGain) return;
    masterGain.gain.value = Math.max(0, Math.min(1, v));
}

export function setEqBand(band, gainDb) {
    const node = band === 'low' ? eqLow : band === 'mid' ? eqMid : eqHigh;
    if (!node) return;
    node.gain.value = Math.max(-12, Math.min(12, gainDb));
}

export function getEqBand(band) {
    const node = band === 'low' ? eqLow : band === 'mid' ? eqMid : eqHigh;
    return node ? node.gain.value : 0;
}

export function isGraphReady() {
    return !!audioCtx;
}
// Read bass energy from the shared analyser as a 0–1 value.
// Returns 0 if the graph isn't ready yet (before first user play).
export function getBassLevel() {
    if (!analyser || !freqData || !audioCtx) return 0;
    analyser.getByteFrequencyData(freqData);
    const nyquist = audioCtx.sampleRate / 2;
    const binHz = nyquist / freqData.length;
        const maxBin = Math.min(freqData.length - 1, Math.floor(180 / binHz));
    let sum = 0;
    for (let i = 0; i <= maxBin; i++) sum += freqData[i];
    const avg = sum / (maxBin + 1);
    return avg / 255;
}

export function isAnalyserReady() {
    return !!analyser && !!audioCtx;
}