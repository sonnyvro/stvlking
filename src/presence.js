// src/presence.js
// Discord presence via lanyard, lyrics via lrclib, fullscreen lyrics,
// dynamic accent from album art.

import { DISCORD_USER_ID, escapeHtml, prefersReducedMotion } from './shared.js';

let currentTrackId = null;
let parsedLyrics = [];
let activeLyricIndex = -1;
let lyricsFetchInFlight = false;
let trackStartMs = null;
let profileLoaded = false;
let currentArtUrl = '';
let currentSong = '';
let currentArtist = '';
let currentDiscordName = '';
let currentStatusKey = 'offline';
let userScrolledFs = false;
let fsScrollTimeout = null;
let lastSyncMs = 0;
let catchUpGrace = 0;

const STATUS_LABELS = {
    online: { label: 'Online', sub: 'Available now' },
    idle: { label: 'Idle', sub: 'Away from keyboard' },
    dnd: { label: 'Do Not Disturb', sub: 'Busy — try later' },
    offline: { label: 'Offline', sub: 'Unavailable' }
};

export function getCurrentDiscordName() { return currentDiscordName; }
export function getCurrentSong() { return currentSong; }
export function getParsedLyrics() { return parsedLyrics; }

function getDiscordCustomStatus(activities) {
    const custom = (activities || []).find(a => a && a.type === 4);
    if (!custom) return '';
    const text = typeof custom.state === 'string' ? custom.state.trim() : '';
    if (!text) return '';
    const emoji = custom.emoji || {};
    let emojiText = '';
    if (emoji.name) emojiText = emoji.name;
    else if (emoji.id) emojiText = emoji.animated ? `<a:${emoji.name || 'emoji'}:${emoji.id}>` : `<:${emoji.name || 'emoji'}:${emoji.id}>`;
    return emojiText ? `${emojiText} ${text}` : text;
}

function updateStatusText(customStatusText, activityText) {
    const statusTextEl = document.getElementById('discord-status-text');
    if (!statusTextEl) return;
    const baseLabel = STATUS_LABELS[currentStatusKey].label;
    const hasActivity = !!activityText;
    const hasCustom = !!customStatusText;
    statusTextEl.className = 'status-text ' + currentStatusKey;
    if (currentStatusKey === 'offline' && !hasActivity && !hasCustom) {
        statusTextEl.classList.add('hidden');
        return;
    }
    statusTextEl.classList.remove('hidden');
    if (hasCustom) {
        statusTextEl.textContent = customStatusText;
        statusTextEl.title = customStatusText;
        return;
    }
    statusTextEl.textContent = hasActivity ? `${baseLabel} · ${activityText}` : baseLabel;
    statusTextEl.title = statusTextEl.textContent;
}

function setDynamicAccentFromImage(imgSrc) {
    if (!imgSrc) { resetDynamicAccent(); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const size = 32;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: false });
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            let bestR = 0, bestG = 0, bestB = 0, bestSat = -1;
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                const lum = (r + g + b) / 3;
                if (lum < 30 || lum > 220) continue;
                if (sat > bestSat) { bestSat = sat; bestR = r; bestG = g; bestB = b; }
            }
            if (bestSat <= 0.12) { resetDynamicAccent(); return; }
            const boost = 1.35;
            const br = Math.min(255, Math.round(bestR * boost));
            const bg = Math.min(255, Math.round(bestG * boost));
            const bb = Math.min(255, Math.round(bestB * boost));
            applyDynamicAccentRGB(br, bg, bb);
        } catch (_) { resetDynamicAccent(); }
    };
    img.onerror = () => resetDynamicAccent();
    img.src = imgSrc;
}

function applyDynamicAccentRGB(r, g, b) {
    const root = document.documentElement;
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.45)`);
    root.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.06)`);
    root.style.setProperty('--accent-rim', `rgba(${r}, ${g}, ${b}, 0.35)`);
}

function resetDynamicAccent() {
    const root = document.documentElement;
    root.style.setProperty('--accent-rgb', '255, 0, 51');
    root.style.setProperty('--accent', '#ff0033');
    root.style.setProperty('--accent-glow', 'rgba(255, 0, 51, 0.45)');
    root.style.setProperty('--accent-dim', 'rgba(255, 0, 51, 0.12)');
    root.style.setProperty('--accent-soft', 'rgba(255, 0, 51, 0.06)');
    root.style.setProperty('--accent-rim', 'rgba(255, 0, 51, 0.35)');
}

function updateProfile(discordUser, status) {
    if (discordUser && !profileLoaded) {
        const avatarEl = document.getElementById('discord-avatar');
        const usernameEl = document.getElementById('discord-username');
        const sideUsernameEl = document.getElementById('side-username');
        if (discordUser.avatar) {
            const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarEl.src = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=128`;
        } else {
            const idx = discordUser.discriminator === '0'
                ? Number(BigInt(discordUser.id) % 5n)
                : Number(discordUser.discriminator) % 5;
            avatarEl.src = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
        }
        avatarEl.classList.remove('skeleton-avatar');
        const name = discordUser.global_name || discordUser.username || 'unknown';
        usernameEl.textContent = '';
        usernameEl.append(name);
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.textContent = '.';
        usernameEl.appendChild(dot);
        if (sideUsernameEl) sideUsernameEl.textContent = name;
        currentDiscordName = name;
        profileLoaded = true;
    }
    const statusBadge = document.getElementById('status-badge');
    if (statusBadge) {
        statusBadge.className = 'status-badge';
        const s = (status || 'offline').toLowerCase();
        if (s === 'online') statusBadge.classList.add('online');
        else if (s === 'idle') statusBadge.classList.add('idle');
        else if (s === 'dnd') statusBadge.classList.add('dnd');
        else statusBadge.classList.add('offline');
        currentStatusKey = s;
    }
}

async function fetchLyrics(song, artist, durationMs) {
    if (!song || !artist || lyricsFetchInFlight) return;
    lyricsFetchInFlight = true;
    parsedLyrics = [];
    activeLyricIndex = -1;
    const primaryArtist = artist.split(/,|feat\.|ft\.|&| x /i)[0].trim();
    const durationSec = durationMs && durationMs > 0 ? Math.round(durationMs / 1000) : null;
    const headers = { 'User-Agent': 'stvlking.online/1.0 (https://stvlking.online)' };
    const base = `artist_name=${encodeURIComponent(primaryArtist)}` + `&track_name=${encodeURIComponent(song)}`;

    const candidates = [];
    if (durationSec) candidates.push(`https://lrclib.net/api/get?${base}&duration=${durationSec}`);
    candidates.push(`https://lrclib.net/api/get?${base}`);
    candidates.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${song} ${primaryArtist}`)}`);

    async function fetchJson(url) {
        try {
            const res = await fetch(url, { headers });
            if (!res.ok) return null;
            return await res.json();
        } catch (_) { return null; }
    }

    function pickFromSearchResults(results) {
        if (!Array.isArray(results) || !results.length) return null;
        if (durationSec) {
            const scored = results
                .map(r => ({ r, diff: Math.abs((r.duration || 0) - durationSec) }))
                .filter(x => x.r.syncedLyrics || x.r.plainLyrics)
                .sort((a, b) => a.diff - b.diff);
            if (scored.length) return scored[0].r;
        }
        return results.find(r => r.syncedLyrics) || results.find(r => r.plainLyrics) || results[0];
    }

    try {
        let track = null;
        for (const url of candidates) {
            const data = await fetchJson(url);
            if (!data) continue;
            if (Array.isArray(data)) track = pickFromSearchResults(data);
            else track = data;
            if (track && track.syncedLyrics) break;
        }
        if (!track) { parsedLyrics = []; return; }

        if (track.syncedLyrics) {
            const parsed = track.syncedLyrics
                .split('\n')
                .map(line => {
                    const m = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
                    if (!m) return null;
                    const min = parseInt(m[1], 10);
                    const sec = parseInt(m[2], 10);
                    const ms = parseInt(m[3].padEnd(3, '0'), 10);
                    const startTime = (min * 60 + sec) * 1000 + ms;
                    const text = m[4].trim();
                    return { text: text || '\u00A0', startTime };
                })
                .filter(Boolean);
            if (parsed.length > 0) parsedLyrics = parsed;
        } else if (track.plainLyrics) {
            parsedLyrics = track.plainLyrics
                .split('\n')
                .filter(l => l.trim())
                .map((text, i) => ({ text: text.trim(), startTime: i * 999999, unsynced: true }));
        }
    } catch (err) {
        parsedLyrics = [];
    } finally {
        lyricsFetchInFlight = false;
        renderLyrics();
        renderFsLyrics();
        syncLyrics(true);
    }
}

function renderLyrics() {
    const floatInner = document.getElementById('floating-lyrics-inner');
    if (!floatInner) return;
    floatInner.innerHTML = '';
    if (!parsedLyrics.length) {
        const empty = document.createElement('div');
        empty.className = 'floating-lyric-empty';
        empty.textContent = currentSong ? 'This one speaks for itself.' : 'No lyrics found for this track.';
        floatInner.appendChild(empty);
        return;
    }
    parsedLyrics.forEach((line, i) => {
        const div = document.createElement('div');
        div.className = 'floating-lyric-line';
        div.dataset.index = i;
        div.textContent = line.text;
        floatInner.appendChild(div);
    });
}

function renderFsLyrics() {
    const fsInner = document.getElementById('lyrics-fs-inner');
    if (!fsInner) return;
    if (!parsedLyrics.length) {
        fsInner.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'lyrics-fs-empty';
        empty.textContent = currentSong ? 'This one speaks for itself.' : 'No lyrics found for this track.';
        fsInner.appendChild(empty);
        return;
    }
    fsInner.innerHTML = '';
    parsedLyrics.forEach((line, i) => {
        const div = document.createElement('div');
        div.className = 'lyrics-fs-line';
        div.dataset.fsIndex = i;
        div.textContent = line.text;
        fsInner.appendChild(div);
    });
}

function centerFsLine(el, instant = false) {
    const fsBody = document.getElementById('lyrics-fs-body');
    if (!fsBody || !el) return;
    try {
        el.scrollIntoView({ block: 'center', behavior: instant ? 'auto' : 'smooth' });
    } catch (_) {
        const bodyRect = fsBody.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetScroll = fsBody.scrollTop + (elRect.top - bodyRect.top) - (bodyRect.height / 2) + (elRect.height / 2);
        fsBody.scrollTo({ top: Math.max(0, targetScroll), behavior: instant ? 'auto' : 'smooth' });
    }
}

export function syncLyrics(force = false) {
    if (!parsedLyrics.length || !trackStartMs) return;
    if (parsedLyrics[0].unsynced) return;
    const now = Date.now();
    if (!force && now - lastSyncMs < 90) return;
    const delta = now - lastSyncMs;
    lastSyncMs = now;
    if (catchUpGrace > 0) catchUpGrace = Math.max(0, catchUpGrace - delta);

    const progressMs = now - trackStartMs;
    let newIndex = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
        if (parsedLyrics[i].startTime <= progressMs) newIndex = i;
        else break;
    }
    if (!force && newIndex === activeLyricIndex) return;

    const skipping = activeLyricIndex !== -1 && (newIndex - activeLyricIndex) > 1;
    const doInstantJump = skipping && catchUpGrace <= 0;

    const floatInner = document.getElementById('floating-lyrics-inner');
    const floatContainer = document.querySelector('.floating-lyrics-container');
    if (floatInner) {
        const oldEl = floatInner.querySelector('.floating-lyric-line.active');
        if (oldEl) oldEl.classList.remove('active');
        if (newIndex >= 0) {
            const newEl = floatInner.querySelector(`.floating-lyric-line[data-index="${newIndex}"]`);
            if (newEl) {
                newEl.classList.add('active');
                requestAnimationFrame(() => {
                    if (!floatContainer) return;
                    const containerRect = floatContainer.getBoundingClientRect();
                    const lineRect = newEl.getBoundingClientRect();
                    const innerRect = floatInner.getBoundingClientRect();
                    const containerCenter = containerRect.top + containerRect.height / 2;
                    const lineCenter = lineRect.top + lineRect.height / 2;
                    const delta = lineCenter - containerCenter;
                    const currentTransform = getComputedStyle(floatInner).transform;
                    let currentY = 0;
                    if (currentTransform && currentTransform !== 'none') {
                        const m = currentTransform.match(/matrix.*\((.+)\)/);
                        if (m) {
                            const parts = m[1].split(', ');
                            currentY = parseFloat(parts[5]) || 0;
                        }
                    }
                    let targetY = currentY - delta;
                    const innerHeight = innerRect.height;
                    const containerHeight = containerRect.height;
                    if (innerHeight <= containerHeight) {
                        targetY = (containerHeight - innerHeight) / 2;
                    } else {
                        const minY = containerHeight - innerHeight;
                        const maxY = 0;
                        targetY = Math.max(minY, Math.min(maxY, targetY));
                    }
                    const isFirstSync = activeLyricIndex === -1;
                    if (doInstantJump || prefersReducedMotion || isFirstSync) {
                        const prev = floatInner.style.transition;
                        floatInner.style.transition = 'none';
                        floatInner.style.transform = `translateY(${targetY}px)`;
                        void floatInner.offsetHeight;
                        floatInner.style.transition = prev;
                    } else {
                        floatInner.style.transform = `translateY(${targetY}px)`;
                    }
                });
            }
        }
    }
    const fsOverlay = document.getElementById('lyrics-fs');
    const fsInner = document.getElementById('lyrics-fs-inner');
    if (fsOverlay && fsOverlay.classList.contains('open') && fsInner) {
        const oldFs = fsInner.querySelector('.lyrics-fs-line.active');
        if (oldFs) oldFs.classList.remove('active');
        if (newIndex >= 0) {
            const newFs = fsInner.querySelector(`.lyrics-fs-line[data-fs-index="${newIndex}"]`);
            if (newFs) {
                newFs.classList.add('active');
                if (!userScrolledFs) requestAnimationFrame(() => centerFsLine(newFs, doInstantJump));
            }
        }
    }
    activeLyricIndex = newIndex;
}

function renderTrack({ song, artist, artUrl, startMs, durationMs }) {
    const trackId = `${song}|${artist}`;
    const isNewTrack = trackId !== currentTrackId;
    if (isNewTrack) {
        currentTrackId = trackId;
        currentSong = song;
        currentArtist = artist;
        currentArtUrl = artUrl || '';
        trackStartMs = startMs || Date.now();
        activeLyricIndex = -1;
        parsedLyrics = [];
        userScrolledFs = false;
        const topRow = document.getElementById('top-row');
        const sideTitle = document.getElementById('side-playing-title');
        const sideArtist = document.getElementById('side-playing-artist');
        const sideArt = document.getElementById('side-playing-art');
        if (topRow) topRow.hidden = false;
        if (sideTitle) sideTitle.textContent = song;
        if (sideArtist) sideArtist.textContent = artist;
        if (artUrl) {
            if (sideArt) {
                sideArt.src = artUrl;
                sideArt.style.display = '';
            }
            setDynamicAccentFromImage(artUrl);
        } else {
            if (sideArt) sideArt.style.display = 'none';
            resetDynamicAccent();
        }
        fetchLyrics(song, artist, durationMs);
    } else {
        if (startMs) trackStartMs = startMs;
    }
    syncLyrics();
}

function renderDiscordActivity(activity) {
    const discordActivityEl = document.getElementById('discord-activity');
    const taglineEl = document.getElementById('discord-tagline');
    if (!discordActivityEl) return;
    const isRoblox = isRobloxActivity(activity);
    const details = activity.details || '';
    const state = activity.state || '';
    const elapsed = activity.timestamps && activity.timestamps.start ? formatElapsedShort(activity.timestamps.start) : '';
    let activityText = '';
    if (isRoblox) {
        const gameName = details || state || activity.name || 'Roblox';
        const gameSubtitle = details && state ? state : '';
        if (taglineEl) {
            taglineEl.textContent = 'Roblox · ' + gameName;
            taglineEl.title = gameSubtitle ? gameName + ' — ' + gameSubtitle : gameName;
        }
        activityText = 'Playing ' + gameName;
    } else {
        if (taglineEl) {
            taglineEl.textContent = 'Producer';
            taglineEl.title = '';
        }
        activityText = details || activity.name || '';
    }
    updateStatusText(window.currentDiscordCustomStatus || '', activityText);
    discordActivityEl.classList.remove('compact');
    discordActivityEl.classList.add('active');
    discordActivityEl.innerHTML = `
        <div style="min-width:0;">
            <div class="np-activity-name">${escapeHtml(activity.name || '')}</div>
            ${details ? `<div class="np-activity-detail">${escapeHtml(details)}</div>` : ''}
            ${state ? `<div class="np-activity-state">${escapeHtml(state)}</div>` : ''}
            ${elapsed ? `<div class="np-activity-time">${elapsed}</div>` : ''}
        </div>
    `;
}

function formatElapsedShort(startMs) {
    if (!startMs) return '';
    const totalSec = Math.floor((Date.now() - startMs) / 1000);
    if (totalSec < 0) return '';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m elapsed`;
    return `${mins}m elapsed`;
}

function clearDiscordActivity() {
    const discordActivityEl = document.getElementById('discord-activity');
    const taglineEl = document.getElementById('discord-tagline');
    if (taglineEl) {
        taglineEl.textContent = 'Producer';
        taglineEl.title = '';
    }
    updateStatusText(window.currentDiscordCustomStatus || '', '');
    if (!discordActivityEl) return;
    discordActivityEl.classList.remove('active');
    discordActivityEl.classList.add('compact');
    discordActivityEl.innerHTML = `<div class="np-status">No recent activity</div>`;
}

function clearMusic() {
    currentTrackId = null;
    parsedLyrics = [];
    activeLyricIndex = -1;
    trackStartMs = null;
    currentSong = '';
    currentArtist = '';
    currentArtUrl = '';
    const topRow = document.getElementById('top-row');
    const floatInner = document.getElementById('floating-lyrics-inner');
    const sideArt = document.getElementById('side-playing-art');
    const sideTitle = document.getElementById('side-playing-title');
    const sideArtist = document.getElementById('side-playing-artist');
    if (topRow) topRow.hidden = true;
    if (floatInner) floatInner.innerHTML = '';
    if (sideArt) sideArt.style.display = 'none';
    if (sideTitle) sideTitle.textContent = '—';
    if (sideArtist) sideArtist.textContent = '—';
    resetDynamicAccent();
    const fsOverlay = document.getElementById('lyrics-fs');
    if (fsOverlay && fsOverlay.classList.contains('open')) {
        const fsSong = document.getElementById('lyrics-fs-song');
        const fsArtist = document.getElementById('lyrics-fs-artist');
        const fsArt = document.getElementById('lyrics-fs-art');
        const fsInner = document.getElementById('lyrics-fs-inner');
        if (fsSong) fsSong.textContent = '—';
        if (fsArtist) fsArtist.textContent = '—';
        if (fsArt) fsArt.style.display = 'none';
        if (fsInner) {
            fsInner.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'lyrics-fs-empty';
            empty.textContent = 'Nothing playing right now.';
            fsInner.appendChild(empty);
        }
    }
}

async function fetchPresence() {
    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
        const { data } = await res.json();
        if (!data) { clearMusic(); clearDiscordActivity(); return; }
        updateProfile(data.discord_user, data.discord_status);
        const activities = data.activities || [];
        window.currentDiscordCustomStatus = getDiscordCustomStatus(activities);
        let musicHandled = false;
        if (data.listening_to_spotify && data.spotify) {
            renderTrack({
                song: data.spotify.song,
                artist: data.spotify.artist,
                artUrl: data.spotify.album_art_url,
                startMs: data.spotify.timestamps ? data.spotify.timestamps.start : null,
                durationMs: data.spotify.timestamps
                    ? (data.spotify.timestamps.end - data.spotify.timestamps.start)
                    : null
            });
            musicHandled = true;
        }
        if (!musicHandled) {
            const relay = activities.find(a => a.type === 2 || a.name === 'Spotify');
            if (relay) {
                let artUrl = '';
                if (relay.assets && relay.assets.large_image) {
                    const img = relay.assets.large_image;
                    if (img.startsWith('mp:external/')) {
                        const after = img.replace('mp:external/', '');
                        artUrl = after.substring(after.indexOf('/') + 1);
                    } else if (img.startsWith('mp:')) {
                        artUrl = `https://media.discordapp.net/${img.replace('mp:', '')}`;
                    } else if (img.startsWith('spotify:')) {
                        artUrl = `https://i.scdn.co/image/${img.replace('spotify:', '')}`;
                    } else if (img.startsWith('http')) {
                        artUrl = img;
                    }
                }
                renderTrack({
                    song: relay.details || 'Unknown',
                    artist: relay.state || '',
                    artUrl,
                    startMs: relay.timestamps ? relay.timestamps.start : null,
                    durationMs: relay.timestamps && relay.timestamps.end
                        ? (relay.timestamps.end - relay.timestamps.start)
                        : null
                });
                musicHandled = true;
            }
        }
        if (!musicHandled) clearMusic();
        const gameActivity = activities.find(a =>
            a.name !== 'Spotify' && (a.type === 0 || a.type === 3 || a.type === 5)
        );
        if (gameActivity) renderDiscordActivity(gameActivity);
        else clearDiscordActivity();
    } catch (err) {
        clearMusic();
        clearDiscordActivity();
    }
}

function isRobloxActivity(activity) {
    const ROBLOX_APP_IDS = new Set(['363445589247131668', '1167779017054617600']);
    if (!activity) return false;
    if (activity.application_id && ROBLOX_APP_IDS.has(String(activity.application_id))) return true;
    const n = (activity.name || '').toLowerCase();
    return n === 'roblox' || n.includes('roblox');
}

export function openFullscreenLyrics() {
    const fsOverlay = document.getElementById('lyrics-fs');
    const fsArt = document.getElementById('lyrics-fs-art');
    const fsSong = document.getElementById('lyrics-fs-song');
    const fsArtist = document.getElementById('lyrics-fs-artist');
    if (!fsOverlay) return;
    fsOverlay.classList.add('open');
    if (fsArt) {
        fsArt.src = currentArtUrl;
        fsArt.style.display = currentArtUrl ? '' : 'none';
    }
    if (fsSong) fsSong.textContent = currentSong || '—';
    if (fsArtist) fsArtist.textContent = currentArtist || '—';
    renderFsLyrics();
    activeLyricIndex = -1;
    syncLyrics(true);
}

export function closeFullscreenLyrics() {
    const fsOverlay = document.getElementById('lyrics-fs');
    if (fsOverlay) fsOverlay.classList.remove('open');
}

export function initPresence() {
    const expandBtn = document.getElementById('lyrics-expand-btn');
    const fsClose = document.getElementById('lyrics-fs-close');
    const fsBody = document.getElementById('lyrics-fs-body');
    const discordCopyBtn = document.getElementById('discord-copy-btn');

    if (expandBtn) expandBtn.addEventListener('click', openFullscreenLyrics);
    if (fsClose) fsClose.addEventListener('click', closeFullscreenLyrics);
    if (fsBody) {
        fsBody.addEventListener('scroll', () => {
            userScrolledFs = true;
            clearTimeout(fsScrollTimeout);
            fsScrollTimeout = setTimeout(() => { userScrolledFs = false; }, 4000);
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) catchUpGrace = 2000;
    });

    if (discordCopyBtn) {
        discordCopyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sideUsernameEl = document.getElementById('side-username');
            const text = currentDiscordName || (sideUsernameEl ? sideUsernameEl.textContent : '') || '';
            if (!text || text === '—') return;
            try {
                await navigator.clipboard.writeText(text);
                discordCopyBtn.style.color = 'var(--online)';
                discordCopyBtn.style.borderColor = 'rgba(35, 165, 90, 0.5)';
                const { showToast } = await import('./shared.js');
                showToast('Discord username copied');
                setTimeout(() => {
                    discordCopyBtn.style.color = '';
                    discordCopyBtn.style.borderColor = '';
                }, 1200);
            } catch (_) {}
        });
    }

    fetchPresence();
    setInterval(fetchPresence, 5000);
    setInterval(() => syncLyrics(), 250);
}