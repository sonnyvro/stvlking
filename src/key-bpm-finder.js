// ─────────────────────────────────────────────────────────────
// Key & BPM Finder — pleco-xa edition
// BPM detection: pleco-xa (pure ESM, zero dependencies)
// Key detection: Krumhansl-Schmuckler (pure JS)
// ─────────────────────────────────────────────────────────────

import { beat_track } from 'pleco-xa';

// 1. FFT (radix-2, in-place) — kept for key detection
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe; im[i + j + len / 2] = uIm - vIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

// 2. Downmix to mono
function downmixToMono(audioBuffer) {
  const ch = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  const out = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += data[i];
  }
  for (let i = 0; i < len; i++) out[i] /= ch;
  return out;
}

// 3. Chroma extraction (for key detection)
function computeChroma(samples, sr, frameSize = 4096, hopSize = 2048) {
  const chroma = new Float32Array(12);
  const numFrames = Math.floor((samples.length - frameSize) / hopSize) + 1;

  const win = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++)
    win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));

  const A4 = 440, minFreq = 65, maxFreq = 2000;
  const bins = frameSize / 2;
  const binPC = new Int8Array(bins).fill(-1);
  for (let k = 1; k < bins; k++) {
    const freq = k * sr / frameSize;
    if (freq < minFreq || freq > maxFreq) continue;
    const midi = 69 + 12 * Math.log2(freq / A4);
    binPC[k] = ((Math.round(midi) % 12) + 12) % 12;
  }

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    const re = new Float32Array(frameSize);
    const im = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) re[i] = samples[offset + i] * win[i];
    fft(re, im);
    for (let k = 1; k < bins; k++) {
      const pc = binPC[k];
      if (pc < 0) continue;
      chroma[pc] += re[k] * re[k] + im[k] * im[k];
    }
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += chroma[i];
  if (sum > 0) for (let i = 0; i < 12; i++) chroma[i] /= sum;
  return chroma;
}

// 4. Key detection (Krumhansl-Schmuckler)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  return num / Math.sqrt(da * db);
}

function detectKey(samples, sr) {
  const chroma = computeChroma(samples, sr);
  let bestScore = -Infinity, bestKey = '';
  for (let root = 0; root < 12; root++) {
    const majRot = new Array(12);
    const minRot = new Array(12);
    for (let i = 0; i < 12; i++) {
      majRot[i] = MAJOR_PROFILE[(i - root + 12) % 12];
      minRot[i] = MINOR_PROFILE[(i - root + 12) % 12];
    }
    const majScore = pearson(chroma, majRot);
    const minScore = pearson(chroma, minRot);
    if (majScore > bestScore) { bestScore = majScore; bestKey = NOTES[root] + ' major'; }
    if (minScore > bestScore) { bestScore = minScore; bestKey = NOTES[root] + ' minor'; }
  }
  return bestKey;
}

// 5. Snap a raw BPM to the "DAW value"
//    Produced music is virtually always whole-number BPM, so a raw
//    value like 130.81 is almost certainly a track that's actually 130.
//    If the raw value is farther than 1 BPM from any integer, we round
//    normally (that case is genuinely ambiguous).
function snapToDAWValue(raw) {
  const nearest = Math.round(raw);
  return Math.abs(raw - nearest) <= 1.0 ? nearest : Math.round(raw);
}

// 6. Main file handler
async function handleFile(file) {
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';
  statusEl.textContent = 'Decoding audio…';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Downmix to mono for both BPM and key detection
    const mono = downmixToMono(audioBuffer);

    // ── BPM via pleco-xa ──
    statusEl.textContent = 'Detecting BPM…';
    await new Promise(r => setTimeout(r, 0));

    // pleco-xa expects (Float32Array, sampleRate)
    const { tempo, beats } = beat_track(mono, audioBuffer.sampleRate);

    // Debug log — remove once you're happy with the output
    console.log('pleco-xa raw tempo:', tempo);

    // Show the raw decimal (1 dp) plus the DAW value in parens
    const bpmRaw = tempo.toFixed(1);
    const bpmDAW = snapToDAWValue(tempo);

    // ── Key via our Krumhansl-Schmuckler implementation ──
    //    Downsample to 11025 Hz for speed; chroma doesn't need HF detail
    statusEl.textContent = 'Detecting key…';
    await new Promise(r => setTimeout(r, 0));

    const targetSR = 11025;
    const offline = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSR), targetSR);
    const src = offline.createBufferSource();
    const monoBuf = offline.createBuffer(1, mono.length, audioBuffer.sampleRate);
    monoBuf.copyToChannel(mono, 0);
    src.buffer = monoBuf;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);
    const sr = rendered.sampleRate;
    const key = detectKey(samples, sr);

    // ── Display ──
    statusEl.textContent = '';
    resultsEl.innerHTML = `
      <div>Estimated BPM: <b>${bpmRaw}</b> <span style="color:#888; font-size:0.75em; font-weight:600;">(${bpmDAW})</span></div>
      <div>Estimated Key: <b>${key}</b></div>
    `;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error: ' + err.message;
  }
}

// 7. Wire up DOM (exported so main.js can call it)
export function initKeyBpmFinder() {
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  if (!drop || !fileInput) return;

  // Guard against double-init if this runs more than once
  if (drop.dataset.bpmWired === '1') return;
  drop.dataset.bpmWired = '1';

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('hover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('hover'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('hover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
}