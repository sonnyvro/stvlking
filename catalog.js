// catalog.js
// Track catalog, rendering, playback, and the beat detail modal.

const TRACKS = [
    {
        id: 'newidkwhattocallit',
        title: 'newidkwhattocallit',
        year: '2026',
        tags: ['dark', 'trap', 'ambient'],
        initials: 'NI',
        cover: 'covers/newidkwhattocallit.jpg',
        audio: 'newidkwhattocallit.mp3',
        details: { bpm: '140', key: 'F# min', mood: 'Dark, hypnotic' }
    },
    {
        id: 'pushingdawhip',
        title: 'pushingdawhip',
        year: '2026',
        tags: ['trap', 'gritty', 'dark'],
        initials: 'PD',
        cover: 'covers/pushingdawhip.jpg',
        audio: 'pushingdawhip.mp3',
        details: { bpm: '150', key: 'A min', mood: 'Gritty, driving' }
    },
    {
        id: 'arson',
        title: 'arson',
        year: '2026',
        tags: ['cinematic', 'dark', 'ambient'],
        initials: 'AR',
        cover: 'covers/arson.jpg',
        audio: 'arson.mp3',
        details: { bpm: '128', key: 'D min', mood: 'Cinematic, brooding' }
    },
    {
        id: 'haunt',
        title: 'haunt',
        year: '2026',
        tags: ['dark', 'ambient'],
        initials: 'HA',
        cover: 'covers/haunt.jpg',
        audio: 'haunt.mp3',
        details: { bpm: '140', key: 'F# min', mood: 'Dark, haunting' }
    },
    {
        id: 'inthislifeandthenext',
        title: 'in this life, and the next',
        year: '2026',
        tags: ['cinematic', 'ambient'],
        initials: 'IL',
        cover: 'covers/inthislifeandthenext.jpg',
        audio: 'inthislifeandthenext.mp3?v=3',
        details: { bpm: '128', key: 'D min', mood: 'Cinematic, emotional' }
    },
    {
        id: 'killingfloor',
        title: 'killing floor',
        year: '2026',
        tags: ['trap', 'dark', 'gritty'],
        initials: 'KF',
        cover: 'covers/killingfloor.jpg',
        audio: 'killingfloor.mp3?v=3',
        details: { bpm: '150', key: 'A min', mood: 'Hard, gritty' }
    },
    {
        id: 'pentagram',
        title: 'pentagram',
        year: '2026',
        tags: ['dark', 'trap'],
        initials: 'PE',
        cover: 'covers/pentagram.jpg',
        audio: 'pentagram.mp3',
        details: { bpm: '145', key: 'C min', mood: 'Ominous, dark' }
    },
    {
        id: 'reddot',
        title: 'red dot',
        year: '2026',
        tags: ['trap', 'gritty'],
        initials: 'RD',
        cover: 'covers/reddot.jpg',
        audio: 'reddot.mp3',
        details: { bpm: '148', key: 'G min', mood: 'Sniper, focused' }
    },
    {
        id: 'rip',
        title: 'rip',
        year: '2026',
        tags: ['cinematic', 'dark'],
        initials: 'RI',
        cover: 'covers/rip.jpg',
        audio: 'rip.mp3',
        details: { bpm: '130', key: 'E min', mood: 'Mournful, cinematic' }
    },
    {
        id: 'widow',
        title: 'widow',
        year: '2026',
        tags: ['dark', 'ambient'],
        initials: 'WI',
        cover: 'covers/widow.jpg',
        audio: 'widow.mp3',
        details: { bpm: '138', key: 'B min', mood: 'Cold, brooding' }
    }
];

const TRACK_LOOKUP = {};
TRACKS.forEach(t => { TRACK_LOOKUP[t.id] = t; });

const BEAT_DETAILS = {};
TRACKS.forEach(t => { BEAT_DETAILS[t.id] = t.details || {}; });

function renderTracks() {
    const container = document.getElementById('tracks-container');
    if (!container) return;
    container.innerHTML = TRACKS.map(t => {
        const cover = t.cover || '';
        return `
        <div class="track" data-track-id="${t.id}" data-tags="${t.tags.join(' ')}">
            <div class="track-cover">
                <img src="${cover}" alt="" loading="lazy" onerror="this.style.display='none'">
                <span aria-hidden="true">${t.initials || ''}</span>
            </div>
            <div class="track-main">
                <div class="track-header">
                    <span class="track-title">${t.title}</span>
                    <span class="track-meta">${t.year}</span>
                </div>
                <div class="track-tags">
                    ${t.tags.map(tag => `<span class="track-tag">${tag}</span>`).join('')}
                </div>
                <div class="track-audio-row">
                    <button class="track-play magnetic" data-track-play="${t.id}" type="button" aria-label="Play or pause">
                        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <button class="track-add" data-track-add="${t.id}" type="button" aria-label="Add to your list" title="Add to your list">
                        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <div class="track-progress-wrap" data-track-progress="${t.id}">
                        <canvas class="track-waveform" data-track-waveform="${t.id}"></canvas>
                        <div class="track-progress-fill" data-track-fill="${t.id}"></div>
                        <div class="track-progress-playhead" data-track-playhead="${t.id}"></div>
                    </div>
                    <span class="track-time" data-track-time="${t.id}">0:00 / 0:00</span>
                </div>
                <audio preload="metadata" src="${t.audio}" data-track-audio="${t.id}"></audio>
                <div class="track-reactions">
                    <button class="reaction-btn" data-track="${t.id}" data-emoji="fire" type="button"><span class="emoji">🔥</span><span class="count" data-track-count="${t.id}-fire">0</span></button>
                    <button class="reaction-btn" data-track="${t.id}" data-emoji="heart" type="button"><span class="emoji">❤️</span><span class="count" data-track-count="${t.id}-heart">0</span></button>
                    <button class="reaction-btn" data-track="${t.id}" data-emoji="mind" type="button"><span class="emoji">🤯</span><span class="count" data-track-count="${t.id}-mind">0</span></button>
                    <button class="reaction-btn" data-track="${t.id}" data-emoji="cold" type="button"><span class="emoji">🥶</span><span class="count" data-track-count="${t.id}-cold">0</span></button>
                    <button class="reaction-btn" data-track-detail="${t.id}" type="button"><span class="emoji">ℹ️</span><span class="count">details</span></button>
                    <span class="track-plays" data-track-plays="${t.id}">
                        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <span data-track-plays-count="${t.id}">0</span>
                    </span>
                </div>
            </div>
        </div>
    `}).join('');
    updateTracksCount();
}

function updateTracksCount() {
    const countEl = document.getElementById('tracks-count');
    if (!countEl) return;
    const visible = document.querySelectorAll('.track:not(.hidden)').length;
    countEl.textContent = `${visible} track${visible === 1 ? '' : 's'} · 2026`;
}

function formatTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

const waveformCache = {};

async function loadWaveform(trackId, src) {
    if (waveformCache[trackId]) return waveformCache[trackId];
    const promise = (async () => {
        try {
            const res = await fetch(src);
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            const ctx = new Ctx();
            const audioBuf = await ctx.decodeAudioData(buf.slice(0));
            const channel = audioBuf.getChannelData(0);
            const bins = 120;
            const blockSize = Math.floor(channel.length / bins);
            const peaks = new Array(bins).fill(0);
            for (let i = 0; i < bins; i++) {
                let max = 0;
                const start = i * blockSize;
                const end = Math.min(start + blockSize, channel.length);
                for (let j = start; j < end; j += 8) {
                    const v = Math.abs(channel[j]);
                    if (v > max) max = v;
                }
                peaks[i] = max;
            }
            try { ctx.close(); } catch (_) {}
            return peaks;
        } catch (_) {
            return null;
        }
    })();
    waveformCache[trackId] = promise;
    return promise;
}

function drawWaveform(canvas, peaks) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    if (!peaks) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '255, 0, 51';
    ctx.fillStyle = `rgba(${accent}, 0.55)`;
    const barW = w / peaks.length;
    const mid = h / 2;
    for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const barH = Math.max(2, peak * h * 0.9);
        const x = i * barW;
        const y = mid - barH / 2;
        ctx.fillRect(x + barW * 0.15, y, barW * 0.7, barH);
    }
}

function openBeatDetail(trackId) {
    const trackEl = document.querySelector(`.track[data-track-id="${trackId}"]`);
    if (!trackEl) return;
    const title = trackEl.querySelector('.track-title').textContent;
    const tags = Array.from(trackEl.querySelectorAll('.track-tag')).map(t => t.textContent);
    const meta = trackEl.querySelector('.track-meta').textContent;
    const detail = BEAT_DETAILS[trackId] || {};
    const beatDetailTitle = document.getElementById('beat-detail-title');
    const beatDetailMeta = document.getElementById('beat-detail-meta');
    const beatDetailBody = document.getElementById('beat-detail-body');
    const beatDetailBackdrop = document.getElementById('beat-detail-backdrop');
    beatDetailTitle.textContent = title;
    beatDetailMeta.textContent = `${meta} · ${detail.mood || 'Beat'}`;
    beatDetailBody.innerHTML = `
        <img class="beat-detail-cover" src="covers/${escapeHtml(trackId)}.jpg" alt="" onerror="this.style.display='none'">
        <div class="beat-detail-stats">
            <div class="beat-detail-stat">
                <div class="beat-detail-stat-label">BPM</div>
                <div class="beat-detail-stat-value">${escapeHtml(detail.bpm || '—')}</div>
            </div>
            <div class="beat-detail-stat">
                <div class="beat-detail-stat-label">Key</div>
                <div class="beat-detail-stat-value">${escapeHtml(detail.key || '—')}</div>
            </div>
            <div class="beat-detail-stat">
                <div class="beat-detail-stat-label">Year</div>
                <div class="beat-detail-stat-value">${escapeHtml(meta)}</div>
            </div>
        </div>
        <div class="beat-detail-tags">
            ${tags.map(t => `<span class="track-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="beat-detail-lease-row">
            <div class="beat-detail-lease-info">
                <div class="beat-detail-lease-name">Basic Lease</div>
                <div class="beat-detail-lease-desc">Tagged MP3 + WAV · 10k streams</div>
            </div>
            <a class="beat-detail-buy" href="https://discord.gg/Mv6FRgD8jQ" target="_blank" rel="noopener">$25</a>
        </div>
        <div class="beat-detail-lease-row">
            <div class="beat-detail-lease-info">
                <div class="beat-detail-lease-name">Premium Lease</div>
                <div class="beat-detail-lease-desc">Untagged + stems · 100k streams</div>
            </div>
            <a class="beat-detail-buy" href="https://discord.gg/Mv6FRgD8jQ" target="_blank" rel="noopener">$50</a>
        </div>
        <div class="beat-detail-lease-row">
            <div class="beat-detail-lease-info">
                <div class="beat-detail-lease-name">Exclusive</div>
                <div class="beat-detail-lease-desc">Full rights · unlimited · project file</div>
            </div>
            <a class="beat-detail-buy" href="https://discord.gg/Mv6FRgD8jQ" target="_blank" rel="noopener">$100+</a>
        </div>
    `;
    beatDetailBackdrop.classList.add('open');
}

function closeBeatDetail() {
    document.getElementById('beat-detail-backdrop').classList.remove('open');
}

// ============================================================
// Shared helpers (defined here so catalog.js is self-contained)
// ============================================================

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
}

const PLAY_ICON = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
const PAUSE_ICON = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

// Shared mutable state — var so it lands on window and the
// inline mini-player-toggle handler can read it.
var currentlyPlayingAudio = null;
var lastPlayedTrackId = null;

// ============================================================
// Player wiring
// ============================================================

function wireTrackPlayers() {
    document.querySelectorAll('[data-track-audio]').forEach(audio => {
        if (audio.dataset.wired === '1') return;
        audio.dataset.wired = '1';
        const trackId = audio.dataset.trackAudio;
        const playBtn = document.querySelector(`[data-track-play="${trackId}"]`);
        const fill = document.querySelector(`[data-track-fill="${trackId}"]`);
        const timeEl = document.querySelector(`[data-track-time="${trackId}"]`);
        const progressWrap = document.querySelector(`[data-track-progress="${trackId}"]`);
        const playhead = document.querySelector(`[data-track-playhead="${trackId}"]`);
        const waveCanvas = document.querySelector(`[data-track-waveform="${trackId}"]`);
        const miniPlayer = document.getElementById('mini-player');
        const miniPlayerTitle = document.getElementById('mini-player-title');
        const miniPlayerMeta = document.getElementById('mini-player-meta');
        const miniPlayerIcon = document.getElementById('mini-player-icon');
        const miniPlayerProgress = document.getElementById('mini-player-progress');
        const miniPlayerArt = document.getElementById('mini-player-art');
        const miniPlayerViz = document.getElementById('mini-player-viz');

        function updatePlayIcon() {
            if (!playBtn) return;
            playBtn.innerHTML = audio.paused ? PLAY_ICON : PAUSE_ICON;
        }

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (audio.paused) audio.play();
                else audio.pause();
            });
        }

        if (progressWrap && fill) {
            progressWrap.addEventListener('click', (e) => {
                const rect = progressWrap.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (audio.duration) audio.currentTime = pct * audio.duration;
            });
        }

        audio.addEventListener('play', () => {
            document.querySelectorAll('[data-track-audio]').forEach(a => {
                if (a !== audio && !a.paused) a.pause();
            });
            currentlyPlayingAudio = audio;
            lastPlayedTrackId = trackId;
            const trackEl = audio.closest('.track');
            const title = trackEl.querySelector('.track-title').textContent;
            const meta = trackEl.querySelector('.track-meta').textContent;
            const coverImg = trackEl.querySelector('.track-cover img');
            if (miniPlayerTitle) miniPlayerTitle.textContent = title;
            if (miniPlayerMeta) miniPlayerMeta.textContent = meta + ' · stvlking';
            if (coverImg && coverImg.src && coverImg.style.display !== 'none') {
                if (miniPlayerArt) {
                    miniPlayerArt.src = coverImg.src;
                    miniPlayerArt.style.display = '';
                }
            } else if (miniPlayerArt) {
                miniPlayerArt.style.display = 'none';
            }
            if (miniPlayer) miniPlayer.classList.add('visible');
            if (miniPlayerIcon) miniPlayerIcon.innerHTML = PAUSE_ICON;
            if (miniPlayerViz) miniPlayerViz.classList.remove('paused');
            if (typeof setRainReactive === 'function') setRainReactive(true);
            updatePlayIcon();
            recordPlay(trackId);
        });
        audio.addEventListener('pause', () => {
            if (currentlyPlayingAudio === audio && miniPlayerIcon) miniPlayerIcon.innerHTML = PLAY_ICON;
            if (miniPlayerViz) miniPlayerViz.classList.add('paused');
            const anyPlaying = Array.from(document.querySelectorAll('[data-track-audio]')).some(a => !a.paused);
            if (!anyPlaying && typeof setRainReactive === 'function') setRainReactive(false);
            updatePlayIcon();
        });
        audio.addEventListener('ended', () => {
            if (currentlyPlayingAudio === audio) {
                if (miniPlayerIcon) miniPlayerIcon.innerHTML = PLAY_ICON;
                if (miniPlayerProgress) miniPlayerProgress.style.width = '0%';
            }
            if (miniPlayerViz) miniPlayerViz.classList.add('paused');
            const anyPlaying = Array.from(document.querySelectorAll('[data-track-audio]')).some(a => !a.paused);
            if (!anyPlaying && typeof setRainReactive === 'function') setRainReactive(false);
            updatePlayIcon();
        });
        audio.addEventListener('loadedmetadata', () => {
            if (timeEl) timeEl.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const pct = (audio.currentTime / audio.duration) * 100;
                if (fill) fill.style.width = pct + '%';
                if (playhead) playhead.style.left = pct + '%';
                if (timeEl) timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
                if (currentlyPlayingAudio === audio && miniPlayerProgress) miniPlayerProgress.style.width = pct + '%';
            }
        });

        loadWaveform(trackId, audio.src).then(peaks => {
            if (waveCanvas && peaks) drawWaveform(waveCanvas, peaks);
        });
    });
}

function wireDetailButtons() {
    document.querySelectorAll('[data-track-detail]').forEach(btn => {
        if (btn.dataset.detailWired === '1') return;
        btn.dataset.detailWired = '1';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openBeatDetail(btn.dataset.trackDetail);
        });
    });
}

function wireAddButtons() {
    document.querySelectorAll('[data-track-add]').forEach(btn => {
        if (btn.dataset.addWired === '1') return;
        btn.dataset.addWired = '1';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.trackAdd;
            if (typeof inCart === 'function' && inCart(id)) {
                if (typeof removeFromCart === 'function') removeFromCart(id);
                if (typeof showToast === 'function') showToast('Removed from your list');
            } else {
                if (typeof addToCart === 'function') addToCart(id);
                if (typeof showToast === 'function') showToast('Added to your list');
            }
            if (typeof updateCartPill === 'function') updateCartPill();
            const drawer = document.getElementById('cart-drawer-backdrop');
            if (drawer && drawer.classList.contains('open') && typeof renderCartDrawer === 'function') {
                renderCartDrawer();
            }
        });
    });
}

// ============================================================
// Reactions
// ============================================================

const TRACK_REACTIONS_SESSION_KEY = 'sonnyvro_track_reactions';

function getTrackSessionReactions() {
    try {
        const raw = sessionStorage.getItem(TRACK_REACTIONS_SESSION_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}
function saveTrackSessionReactions(obj) {
    try { sessionStorage.setItem(TRACK_REACTIONS_SESSION_KEY, JSON.stringify(obj)); } catch (_) {}
}

async function fetchTrackReactions() {
    if (typeof isConfigured !== 'function' || !isConfigured()) return;
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/trackReactions.json`);
        if (!res.ok) return;
        const data = (await res.json()) || {};
        const session = getTrackSessionReactions();
        document.querySelectorAll('[data-track-count]').forEach(el => {
            const key = el.dataset.trackCount;
            const [trackId, emoji] = key.split(/-(.+)/);
            const trackData = data[trackId] && data[trackId][emoji];
            let count = 0;
            if (trackData && typeof trackData === 'object') count = Object.keys(trackData).length;
            else if (typeof trackData === 'number') count = trackData;
            el.textContent = count;
            const btn = document.querySelector(`[data-track="${trackId}"][data-emoji="${emoji}"]`);
            if (btn) {
                const sessionKey = `${trackId}|${emoji}`;
                if (session[sessionKey]) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    } catch (err) {}
}

async function toggleTrackReaction(trackId, emoji) {
    const btn = document.querySelector(`[data-track="${trackId}"][data-emoji="${emoji}"]`);
    const countEl = document.querySelector(`[data-track-count="${trackId}-${emoji}"]`);
    if (!btn || !countEl) return;
    const session = getTrackSessionReactions();
    const sessionKey = `${trackId}|${emoji}`;
    const wasActive = !!session[sessionKey];

    const currentCount = parseInt(countEl.textContent || '0', 10) || 0;
    const newCount = wasActive ? Math.max(0, currentCount - 1) : currentCount + 1;
    countEl.textContent = newCount;
    btn.classList.toggle('active', !wasActive);
    session[sessionKey] = !wasActive;
    saveTrackSessionReactions(session);

    if (typeof isConfigured !== 'function' || !isConfigured()) return;
    const clientId = typeof getClientId === 'function' ? getClientId() : 'anon';
    try {
        if (wasActive) {
            await fetch(`${FIREBASE_DB_URL}/trackReactions/${trackId}/${emoji}/${clientId}.json`, { method: 'DELETE' });
        } else {
            await fetch(`${FIREBASE_DB_URL}/trackReactions/${trackId}/${emoji}/${clientId}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Date.now())
            });
        }
    } catch (err) {}
}

function wireReactionButtons() {
    document.querySelectorAll('[data-track][data-emoji]').forEach(btn => {
        if (btn.dataset.wired === '1') return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTrackReaction(btn.dataset.track, btn.dataset.emoji);
        });
    });
}

// ============================================================
// Plays
// ============================================================

const PLAYS_SESSION_KEY = 'sonnyvro_track_plays_session';
function getSessionPlays() {
    try {
        const raw = sessionStorage.getItem(PLAYS_SESSION_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}
function saveSessionPlays(obj) {
    try { sessionStorage.setItem(PLAYS_SESSION_KEY, JSON.stringify(obj)); } catch (_) {}
}

async function fetchTrackPlays() {
    if (typeof isConfigured !== 'function' || !isConfigured()) return;
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/trackPlays.json`);
        if (!res.ok) return;
        const data = (await res.json()) || {};
        document.querySelectorAll('[data-track-plays-count]').forEach(el => {
            const trackId = el.dataset.trackPlaysCount;
            const count = data[trackId] ? Object.keys(data[trackId]).length : 0;
            el.textContent = count.toLocaleString();
        });
    } catch (_) {}
}

async function recordPlay(trackId) {
    if (typeof isConfigured !== 'function' || !isConfigured() || !trackId) return;
    const plays = getSessionPlays();
    if (plays[trackId]) return;
    plays[trackId] = true;
    saveSessionPlays(plays);
    const clientId = typeof getClientId === 'function' ? getClientId() : 'anon';
    try {
        await fetch(`${FIREBASE_DB_URL}/trackPlays/${trackId}/${clientId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Date.now())
        });
        fetchTrackPlays();
    } catch (_) {}
}

// ============================================================
// Waveform resize (replaces the inline handler)
// ============================================================

window.addEventListener('resize', () => {
    document.querySelectorAll('[data-track-waveform]').forEach(canvas => {
        const id = canvas.dataset.trackWaveform;
        const cached = waveformCache[id];
        if (!cached) return;
        Promise.resolve(cached).then(peaks => { if (peaks) drawWaveform(canvas, peaks); });
    });
}, { passive: true });
