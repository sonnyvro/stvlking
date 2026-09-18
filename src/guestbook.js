// src/guestbook.js
// Guestbook entries, whisper rendering, notify form, live visitors.

import {
    FIREBASE_DB_URL, isConfigured, getClientId, escapeHtml, timeAgo,
    GUESTBOOK_KEY, GUESTBOOK_COOLDOWN_KEY, GUESTBOOK_COOLDOWN_MS,
    showToast, prefersReducedMotion
} from './shared.js';

function getMyGuestbookIds() {
    try {
        const raw = localStorage.getItem(GUESTBOOK_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function rememberGuestbookEntry(id) {
    const m = getMyGuestbookIds();
    m[id] = true;
    try { localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(m)); } catch (_) {}
}

export function openGuestbook() {
    const backdrop = document.getElementById('guestbook-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
    fetchGuestbookEntries();
}

export function closeGuestbook() {
    const backdrop = document.getElementById('guestbook-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
}

function renderWhispers(entries) {
    const whisperLayer = document.getElementById('whisper-layer');
    if (!whisperLayer) return;
    whisperLayer.innerHTML = '';
    if (prefersReducedMotion) return;
    if (!entries.length) return;

    const vw = window.innerWidth;
    const taken = [];
    const maxWhispers = Math.min(entries.length, vw < 700 ? 6 : 12);

    entries.slice(0, maxWhispers).forEach((e) => {
        const text = (e.message || '').trim();
        if (!text) return;

        let x = 0;
        let y = 0;
        let attempts = 0;
        let ok = false;

        while (!ok && attempts < 25) {
            x = 4 + Math.random() * 88;
            y = 8 + Math.random() * 78;
            ok = taken.every(p => Math.abs(p.x - x) > 12 || Math.abs(p.y - y) > 10);
            attempts++;
        }
        taken.push({ x, y });

        const el = document.createElement('div');
        el.className = 'whisper' + (Math.random() > 0.75 ? ' red' : '');
        el.textContent = text.length > 60 ? text.slice(0, 60) + '…' : text;
        el.style.left = x + '%';
        el.style.top = y + '%';
        el.style.fontSize = (0.95 + Math.random() * 0.55).toFixed(2) + 'rem';
        el.style.transform = 'rotate(' + ((Math.random() - 0.5) * 8).toFixed(2) + 'deg)';
        const dur = 12 + Math.random() * 12;
        el.style.animationDuration = dur + 's';
        el.style.animationDelay = (Math.random() * dur * 0.4) + 's';
        whisperLayer.appendChild(el);
    });
}

export async function fetchGuestbookEntries() {
    const guestbookEntries = document.getElementById('guestbook-entries');
    const guestbookCount = document.getElementById('guestbook-count');
    const guestbookSub = document.getElementById('guestbook-sub');
    if (!guestbookEntries) return;
    if (!isConfigured()) {
        guestbookEntries.innerHTML = `<div class="guestbook-empty">Comments offline.</div>`;
        return;
    }
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/guestbook.json`);
        if (!res.ok) return;
        const data = (await res.json()) || {};
        const entries = Object.entries(data)
            .map(([id, e]) => ({ id, ...e }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const mine = getMyGuestbookIds();
        if (!entries.length) {
            guestbookEntries.innerHTML = `<div class="guestbook-empty">No comments yet — be the first.</div>`;
        } else {
            guestbookEntries.innerHTML = entries.map(e => `
                <div class="guestbook-entry ${mine[e.id] ? 'own' : ''}" data-id="${e.id}">
                    <div class="guestbook-entry-header">
                        <span class="guestbook-entry-name">${escapeHtml(e.name || 'anonymous')}</span>
                        <span class="guestbook-entry-time">${timeAgo(e.timestamp || Date.now())}</span>
                        ${mine[e.id] ? `<span class="guestbook-entry-delete" title="Delete" data-del="${e.id}">×</span>` : ''}
                    </div>
                    <div class="guestbook-entry-body">${escapeHtml(e.message || '')}</div>
                </div>
            `).join('');
            guestbookEntries.querySelectorAll('.guestbook-entry-delete').forEach(el => {
                el.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const id = el.dataset.del;
                    if (!id || !mine[id]) return;
                    try {
                        await fetch(`${FIREBASE_DB_URL}/guestbook/${id}.json`, { method: 'DELETE' });
                        fetchGuestbookEntries();
                    } catch (_) {}
                });
            });
        }
        if (guestbookCount) guestbookCount.textContent = entries.length;
        if (guestbookSub) {
            guestbookSub.textContent = entries.length === 0
                ? 'Sign the guestbook'
                : `${entries.length} ${entries.length === 1 ? 'comment' : 'comments'}`;
        }
        renderWhispers(entries);
    } catch (err) {}
}

export function initGuestbook() {
    const guestbookStrip = document.getElementById('guestbook-strip');
    const guestbookModalClose = document.getElementById('guestbook-modal-close');
    const guestbookModalBackdrop = document.getElementById('guestbook-modal-backdrop');
    const guestbookSubmit = document.getElementById('guestbook-submit');
    const guestbookName = document.getElementById('guestbook-name');
    const guestbookMessage = document.getElementById('guestbook-message');
    const guestbookNotify = document.getElementById('guestbook-notify');

    if (guestbookStrip) guestbookStrip.addEventListener('click', openGuestbook);
    if (guestbookModalClose) guestbookModalClose.addEventListener('click', closeGuestbook);
    if (guestbookModalBackdrop) {
        guestbookModalBackdrop.addEventListener('click', (e) => {
            if (e.target === guestbookModalBackdrop) closeGuestbook();
        });
    }

    if (guestbookSubmit) {
        guestbookSubmit.addEventListener('click', async () => {
            const name = (guestbookName.value || 'anonymous').trim() || 'anonymous';
            const message = (guestbookMessage.value || '').trim();
            if (!message) {
                showToast('Write a comment first');
                return;
            }
            if (!isConfigured()) {
                showToast('Comments offline');
                return;
            }
            let lastPost = 0;
            try { lastPost = parseInt(localStorage.getItem(GUESTBOOK_COOLDOWN_KEY) || '0', 10); } catch (_) {}
            if (Date.now() - lastPost < GUESTBOOK_COOLDOWN_MS) {
                const wait = Math.ceil((GUESTBOOK_COOLDOWN_MS - (Date.now() - lastPost)) / 1000);
                showToast(`Wait ${wait}s before posting again`);
                return;
            }
            guestbookSubmit.disabled = true;
            try {
                const res = await fetch(`${FIREBASE_DB_URL}/guestbook.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, message, timestamp: Date.now() })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.name) rememberGuestbookEntry(data.name);
                    try { localStorage.setItem(GUESTBOOK_COOLDOWN_KEY, String(Date.now())); } catch (_) {}
                    if (guestbookNotify && guestbookNotify.checked) {
                        const email = prompt('Email to notify you at?');
                        if (email && email.includes('@')) {
                            try {
                                await fetch(`${FIREBASE_DB_URL}/subscribers.json`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email, timestamp: Date.now(), source: 'guestbook' })
                                });
                                showToast('Subscribed + comment posted');
                            } catch (_) {}
                        }
                    }
                    guestbookMessage.value = '';
                    guestbookName.value = '';
                    if (guestbookNotify) guestbookNotify.checked = false;
                    showToast('Comment posted');
                    fetchGuestbookEntries();
                }
            } catch (_) {
                showToast('Could not post');
            } finally {
                guestbookSubmit.disabled = false;
            }
        });
    }

    fetchGuestbookEntries();
    setInterval(fetchGuestbookEntries, 30000);
}

// Notify strip (email subscribe)
export function initNotifyForm() {
    const notifyForm = document.getElementById('notify-form');
    const notifyEmail = document.getElementById('notify-email');
    const notifySubmit = document.getElementById('notify-submit');
    if (!notifyForm) return;
    notifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (notifyEmail.value || '').trim();
        if (!email || !email.includes('@') || !email.includes('.')) {
            showToast('Enter a valid email');
            return;
        }
        notifySubmit.disabled = true;
        try {
            if (isConfigured()) {
                await fetch(`${FIREBASE_DB_URL}/subscribers.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, timestamp: Date.now(), source: 'hero' })
                });
            }
            showToast('You\'re on the list');
            notifyEmail.value = '';
            try { localStorage.setItem('sonnyvro_subscribed', '1'); } catch (_) {}
        } catch (_) {
            showToast('Could not subscribe');
        } finally {
            notifySubmit.disabled = false;
        }
    });
}

// Live visitor heartbeat
export function initLiveVisitors() {
    const liveVisitorsCount = document.getElementById('live-visitors-count');

    function heartbeat() {
        if (!isConfigured()) return;
        const clientId = getClientId();
        fetch(`${FIREBASE_DB_URL}/presence/${clientId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ t: Date.now() })
        }).catch(() => {});
    }

    async function fetchLiveVisitors() {
        if (!isConfigured() || !liveVisitorsCount) return;
        try {
            const res = await fetch(`${FIREBASE_DB_URL}/presence.json`);
            if (!res.ok) return;
            const data = (await res.json()) || {};
            const cutoff = Date.now() - 60000;
            const live = Object.values(data).filter(v => v && v.t && v.t > cutoff).length;
            liveVisitorsCount.textContent = live;
        } catch (_) {}
    }

    heartbeat();
    setInterval(heartbeat, 20000);
    fetchLiveVisitors();
    setInterval(fetchLiveVisitors, 20000);
}

// View counter
export function initViewCounter() {
    const VIEWS_SESSION_KEY = 'sonnyvro_counted_this_session';
    const countEl = document.getElementById('site-views-count');
    if (!countEl || !isConfigured()) return;
    let countedAlready = false;
    try { countedAlready = sessionStorage.getItem(VIEWS_SESSION_KEY) === '1'; } catch (_) {}
    (async () => {
        try {
            if (!countedAlready) {
                const visitRes = await fetch(`${FIREBASE_DB_URL}/views.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Date.now())
                });
                if (visitRes.ok) { try { sessionStorage.setItem(VIEWS_SESSION_KEY, '1'); } catch (_) {} }
            }
            const res = await fetch(`${FIREBASE_DB_URL}/views.json`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = (await res.json()) || {};
            const count = data && typeof data === 'object' ? Object.keys(data).length : 0;
            countEl.textContent = count.toLocaleString();
        } catch (err) {
            countEl.textContent = '—';
        }
    })();
}

// SoundCloud plays
export async function initSoundcloudPlays() {
    const SC_WORKER_URL = 'https://soundcloudtotal.sonnyvromusic.workers.dev';
    const SC_BASELINE_PLAYS = 115283;
    const SC_BASELINE_AT = 46542;
    const countEl = document.getElementById('sc-plays-count');
    if (!countEl) return;
    countEl.textContent = SC_BASELINE_PLAYS.toLocaleString();
    try {
        const res = await fetch(SC_WORKER_URL, { cache: 'default' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (typeof data.highWater === 'number' && data.highWater > 0) {
            const growth = Math.max(0, data.highWater - SC_BASELINE_AT);
            countEl.textContent = (SC_BASELINE_PLAYS + growth).toLocaleString();
        }
    } catch (err) {}
}