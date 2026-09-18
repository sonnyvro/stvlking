// src/shared.js
// Shared constants and helpers used across the app.

export const FIREBASE_DB_URL = 'https://site-ccfcd-default-rtdb.firebaseio.com';
export const CONTACT_WEBHOOK_URL = 'https://contact-form-proxy.sonnyvromusic.workers.dev';
export const BEAT_INQUIRY_WEBHOOK_URL = 'https://discordapp.com/api/webhooks/1550288334004166737/Xx7GhusdaRLsaV9UzJ60FuL7RztwbNnJHn-wcljPMPcAszxaQSRNXPuGrWXLOttMSjuz';
export const SC_WORKER_URL = 'https://soundcloudtotal.sonnyvromusic.workers.dev';
export const LASTFM_API_KEY = 'aea287ebefdddad77313d20d37996e01';
export const LASTFM_USERNAME = 'overIord';
export const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
export const DISCORD_USER_ID = '1483808488684781720';

export const SC_BASELINE_PLAYS = 115283;
export const SC_BASELINE_AT = 46542;

export const VIEWS_SESSION_KEY = 'sonnyvro_counted_this_session';
export const GUESTBOOK_KEY = 'sonnyvro_my_guestbook';
export const GUESTBOOK_COOLDOWN_KEY = 'sonnyvro_guestbook_cooldown';
export const GUESTBOOK_COOLDOWN_MS = 30000;
export const CONTACT_COOLDOWN_KEY = 'sonnyvro_contact_cooldown';
export const CONTACT_COOLDOWN_MS = 45000;
export const CART_KEY = 'stvlking_beat_list';

export const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function isConfigured() {
    return FIREBASE_DB_URL && FIREBASE_DB_URL !== 'YOUR_FIREBASE_DB_URL_HERE';
}

export function getClientId() {
    let id = '';
    try { id = localStorage.getItem('sonnyvro_client_id') || ''; } catch (_) {}
    if (!id) {
        id = 'c_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
        try { localStorage.setItem('sonnyvro_client_id', id); } catch (_) {}
    }
    return id;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
}

export function timeAgo(ms) {
    const diff = Date.now() - ms;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    return new Date(ms).toLocaleDateString();
}

export function formatElapsed(startMs) {
    if (!startMs) return '';
    const totalSec = Math.floor((Date.now() - startMs) / 1000);
    if (totalSec < 0) return '';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m elapsed`;
    return `${mins}m elapsed`;
}

export function formatTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

let toastTimer = null;
export function showToast(msg) {
    const toastEl = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}