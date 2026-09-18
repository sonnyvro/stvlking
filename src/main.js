// src/main.js
// Entry point. Imports every module and wires them together.

import {
    initCursorSpotlight,
    initMagnetic,
    initEntrance,
    initGlideObserver,
    initScrollProgress,
    initClock,
    generateRain,
    setRainReactive,
    wireAudioFlash
} from './ui.js';

import {
    renderTracks,
    wireTrackPlayers,
    wireReactionButtons,
    wireDetailButtons,
    fetchTrackReactions,
    fetchTrackPlays,
    openBeatDetail,
    closeBeatDetail,
    setOnTrackStarted
} from './catalog.js';

import {
    initCartUI,
    wireAddButtons,
    updateCartPill,
    openCartDrawer,
    closeCartDrawer,
    inCart,
    addToCart,
    removeFromCart,
    renderCartDrawer
} from './cart.js';

import {
    initPresence,
    openFullscreenLyrics,
    closeFullscreenLyrics,
    getCurrentDiscordName,
    getCurrentSong,
    getParsedLyrics,
    syncLyrics
} from './presence.js';

import {
    initGuestbook,
    initNotifyForm,
    initLiveVisitors,
    initViewCounter,
    initSoundcloudPlays,
    openGuestbook,
    closeGuestbook,
    fetchGuestbookEntries
} from './guestbook.js';

import {
    initLastfm
} from './lastfm.js';

import {
    prefersReducedMotion,
    showToast,
    escapeHtml,
    timeAgo,
    isConfigured,
    getClientId,
    formatTime,
    formatElapsed
} from './shared.js';

import { setMasterVolume, resumeAudio, setEqBand, getEqBand, getBassLevel } from './audio.js';
// ------------------------------------------------------------
// Initial boot
// ------------------------------------------------------------

generateRain();
initCursorSpotlight();
initEntrance();
initGlideObserver();
initScrollProgress();
initClock();
initMagnetic();

// Wire catalog + players + add buttons
renderTracks();
wireTrackPlayers();
wireReactionButtons();
wireDetailButtons();
wireAddButtons();
updateCartPill();

// Rain reacts to track playback
setOnTrackStarted(setRainReactive);

// Init cart UI (open/close drawer, submit handler)
initCartUI();

// Init presence (fetch loop, lyrics, fullscreen)
initPresence();

// Init guestbook, notify form, counters
initGuestbook();
initNotifyForm();
initLiveVisitors();

// External data fetches
fetchTrackReactions();
fetchTrackPlays();
initLastfm();

// Audio-reactive visuals
window.__getBassLevel = getBassLevel;
wireAudioFlash(document.getElementById('discord-username'));

// View counter and soundcloud plays need window load for some reason
window.addEventListener('load', initViewCounter);
window.addEventListener('load', initSoundcloudPlays);

setInterval(fetchTrackReactions, 15000);
setInterval(fetchTrackPlays, 30000);

// ------------------------------------------------------------
// Keyboard shortcuts
// ------------------------------------------------------------

// ---- DEVTOOLS BLOCK DISABLED FOR DEBUGGING ----
// document.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
// document.addEventListener('keydown', (e) => {
//     if (e.key === 'F12') { e.preventDefault(); return false; }
//     if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return false; }
//     if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return false; }
//     if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); return false; }
//     if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return false; }
//     if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) { e.preventDefault(); return false; }
// });
// document.addEventListener('selectstart', (e) => {
//     const tag = (e.target.tagName || '').toLowerCase();
//     if (tag !== 'input' && tag !== 'textarea') e.preventDefault();
// });

// ------------------------------------------------------------
// Command palette
// ------------------------------------------------------------

const commandPaletteBackdrop = document.getElementById('command-palette-backdrop');
const commandPaletteInput = document.getElementById('command-palette-input');
const commandPaletteList = document.getElementById('command-palette-list');

const COMMANDS = [
    { id: 'copy-discord', label: 'Copy Discord username', hint: 'C',
      icon: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      run: async () => {
          const text = getCurrentDiscordName() || '';
          if (!text) return;
          try { await navigator.clipboard.writeText(text); showToast('Discord username copied'); } catch (_) {}
      }
    },
    { id: 'guestbook', label: 'Open comments', hint: 'G',
      icon: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h4"></path></svg>',
      run: () => openGuestbook() },
    { id: 'cart', label: 'Open your list', hint: 'B',
      icon: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
      run: () => openCartDrawer() },
    { id: 'top', label: 'Scroll to top', hint: 'T',
      icon: '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>',
      run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { id: 'beats', label: 'Jump to beats & leases', hint: '1',
      icon: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
      run: () => document.getElementById('beats-info')?.scrollIntoView({ behavior: 'smooth' }) },
    { id: 'catalog', label: 'Jump to catalog', hint: '3',
      icon: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>',
      run: () => document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' }) },
    { id: 'contact', label: 'Jump to contact form', hint: 'X',
      icon: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
      run: () => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }) },
    { id: 'fullscreen-lyrics', label: 'Toggle fullscreen lyrics', hint: 'L',
      icon: '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline></svg>',
      run: () => {
          const fs = document.getElementById('lyrics-fs');
          if (fs && fs.classList.contains('open')) closeFullscreenLyrics();
          else if (getParsedLyrics().length || getCurrentSong()) openFullscreenLyrics();
          else showToast('Nothing playing right now');
      }
    },
    { id: 'join-discord', label: 'Open Discord invite', hint: 'D',
      icon: '<svg viewBox="0 0 24 24"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.2.351-.42.81-.575 1.17a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.582-1.17.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 6.093 4.37a.07.07 0 0 0-.033.027C2.398 9.084 1.474 13.673 1.925 18.2a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.46-.63.872-1.294 1.227-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
      run: () => window.open('https://discord.gg/Mv6FRgD8jQ', '_blank', 'noopener') },
    { id: 'share', label: 'Copy share link', hint: 'K',
      icon: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle></svg>',
      run: async () => {
          try { await navigator.clipboard.writeText(window.location.href); showToast('Link copied to clipboard'); } catch (_) {}
      }
    },
    { id: 'shortcuts', label: 'Show keyboard shortcuts', hint: '?',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path></svg>',
      run: () => openShortcuts() }
];

const PALETTE_SHORTCUTS = [
    { label: 'Command palette', keys: ['⌘', 'K'] },
    { label: 'Open comments', keys: ['G'] },
    { label: 'Open your list', keys: ['B'] },
    { label: 'Jump to beats', keys: ['1'] },
    { label: 'Jump to leases', keys: ['2'] },
    { label: 'Jump to catalog', keys: ['3'] },
    { label: 'Play / pause first beat', keys: ['Space'] },
    { label: 'Fullscreen lyrics', keys: ['L'] },
    { label: 'Show shortcuts panel', keys: ['?'] }
];

let commandSelectedIndex = 0;
let filteredCommands = COMMANDS.slice();

function renderShortcutSection() {
    return `
        <div class="palette-shortcut-section">
            <div class="palette-shortcut-title">Keyboard shortcuts</div>
            ${PALETTE_SHORTCUTS.map(s => `
                <div class="palette-shortcut-row">
                    <span>${s.label}</span>
                    <span class="kbd-group">${s.keys.map(k => `<kbd>${k}</kbd>`).join('')}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCommands(filter = '') {
    const q = filter.toLowerCase().trim();
    filteredCommands = !q
        ? COMMANDS.slice()
        : COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q));
    commandSelectedIndex = Math.min(commandSelectedIndex, Math.max(0, filteredCommands.length - 1));
    const commandsHtml = filteredCommands.map((c, i) => `
        <div class="command-item ${i === commandSelectedIndex ? 'selected' : ''}" data-index="${i}" data-id="${c.id}">
            <span class="command-item-icon">${c.icon}</span>
            <span class="command-item-label">${c.label}</span>
            <span class="command-item-hint">${c.hint}</span>
        </div>
    `).join('');
    commandPaletteList.innerHTML = commandsHtml + (q ? '' : renderShortcutSection());
    commandPaletteList.querySelectorAll('.command-item').forEach(el => {
        el.addEventListener('click', () => runCommand(parseInt(el.dataset.index, 10)));
        el.addEventListener('mouseenter', () => {
            commandSelectedIndex = parseInt(el.dataset.index, 10);
            updateCommandSelection();
        });
    });
}

function updateCommandSelection() {
    commandPaletteList.querySelectorAll('.command-item').forEach((el, i) => {
        el.classList.toggle('selected', i === commandSelectedIndex);
    });
    const sel = commandPaletteList.querySelector('.command-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function openCommandPalette() {
    commandPaletteBackdrop.classList.add('open');
    commandPaletteInput.value = '';
    commandSelectedIndex = 0;
    renderCommands('');
    setTimeout(() => commandPaletteInput.focus(), 30);
}
function closeCommandPalette() { commandPaletteBackdrop.classList.remove('open'); }
function runCommand(idx) {
    const cmd = filteredCommands[idx];
    if (!cmd) return;
    closeCommandPalette();
    setTimeout(() => cmd.run(), 80);
}

if (commandPaletteInput) {
    commandPaletteInput.addEventListener('input', (e) => {
        commandSelectedIndex = 0;
        renderCommands(e.target.value);
    });
}
if (commandPaletteBackdrop) {
    commandPaletteBackdrop.addEventListener('click', (e) => {
        if (e.target === commandPaletteBackdrop) closeCommandPalette();
    });
}

const shortcutsOverlay = document.getElementById('shortcuts-overlay');
function openShortcuts() { if (shortcutsOverlay) shortcutsOverlay.classList.add('open'); }
function closeShortcuts() { if (shortcutsOverlay) shortcutsOverlay.classList.remove('open'); }
if (shortcutsOverlay) {
    shortcutsOverlay.addEventListener('click', (e) => {
        if (e.target === shortcutsOverlay) closeShortcuts();
    });
}

// ------------------------------------------------------------
// Global key handling
// ------------------------------------------------------------

document.addEventListener('keydown', (e) => {
    const isInput = (e.target.tagName || '').toLowerCase() === 'input' || (e.target.tagName || '').toLowerCase() === 'textarea';

    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (commandPaletteBackdrop.classList.contains('open')) closeCommandPalette();
        else openCommandPalette();
        return;
    }

    if (e.key === 'Escape') {
        if (shortcutsOverlay && shortcutsOverlay.classList.contains('open')) { closeShortcuts(); return; }
        if (document.getElementById('beat-detail-backdrop')?.classList.contains('open')) { closeBeatDetail(); return; }
        if (document.getElementById('guestbook-modal-backdrop')?.classList.contains('open')) { closeGuestbook(); return; }
        if (document.getElementById('cart-drawer-backdrop')?.classList.contains('open')) { closeCartDrawer(); return; }
    }

    if (commandPaletteBackdrop && commandPaletteBackdrop.classList.contains('open')) {
        if (e.key === 'Escape') { e.preventDefault(); closeCommandPalette(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); commandSelectedIndex = Math.min(filteredCommands.length - 1, commandSelectedIndex + 1); updateCommandSelection(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); commandSelectedIndex = Math.max(0, commandSelectedIndex - 1); updateCommandSelection(); return; }
        if (e.key === 'Enter') { e.preventDefault(); runCommand(commandSelectedIndex); return; }
    }

    if (isInput) return;

    if (e.key === '/') { e.preventDefault(); openCommandPalette(); return; }
    if (e.key === '?') { e.preventDefault(); if (shortcutsOverlay && shortcutsOverlay.classList.contains('open')) closeShortcuts(); else openShortcuts(); return; }
    if (e.key === 'g' || e.key === 'G') { if (!e.ctrlKey && !e.metaKey && !e.altKey) openGuestbook(); return; }
    if (e.key === 'b' || e.key === 'B') { if (!e.ctrlKey && !e.metaKey && !e.altKey) openCartDrawer(); return; }
    if (e.key === 'd' || e.key === 'D') { if (!e.ctrlKey && !e.metaKey && !e.altKey) window.open('https://discord.gg/Mv6FRgD8jQ', '_blank', 'noopener'); return; }
    if (e.key === '1') { document.getElementById('beats-info')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (e.key === '2') { document.getElementById('beats-info')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (e.key === '3') { document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' }); return; }

    if (e.key === 'l' || e.key === 'L') {
        if (getParsedLyrics().length || getCurrentSong()) {
            const fs = document.getElementById('lyrics-fs');
            if (fs && fs.classList.contains('open')) closeFullscreenLyrics();
            else openFullscreenLyrics();
        }
        return;
    }

    if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const firstAudio = document.querySelector('[data-track-audio]');
        if (firstAudio) {
            e.preventDefault();
            if (firstAudio.paused) firstAudio.play();
            else firstAudio.pause();
        }
    }
});

// ------------------------------------------------------------
// Mini-player toggle button + volume controls
// ------------------------------------------------------------

const VOLUME_STORAGE_KEY = 'stvlking_volume';
let lastNonZeroVolume = 1;

const miniPlayerToggle = document.getElementById('mini-player-toggle');
const volumeSlider = document.getElementById('mini-player-volume-slider');
const volumeBtn = document.getElementById('mini-player-mute');
const volumeIcon = document.getElementById('mini-player-volume-icon');

function getCurrentAudio() {
    const { playerState } = window.__catalogState || {};
    return playerState?.currentlyPlayingAudio || document.querySelector('[data-track-audio]');
}

function applyVolumeToAll(v) {
    setMasterVolume(v);
    // Also set native volume as a fallback for elements that
    // haven't been attached to the pipeline yet.
    document.querySelectorAll('[data-track-audio]').forEach(a => { a.volume = v; });
}

function setVolumeIcon(v) {
    if (!volumeIcon) return;
    if (v === 0) {
        volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
    } else if (v < 0.5) {
        volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
    } else {
        volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>';
    }
}

function updateSliderFill(v) {
    if (!volumeSlider) return;
    volumeSlider.style.setProperty('--vol-pct', (v * 100) + '%');
}

let initialVolume = 1;
try {
    const saved = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
    if (!isNaN(saved) && saved >= 0 && saved <= 1) initialVolume = saved;
} catch (_) {}
if (initialVolume > 0) lastNonZeroVolume = initialVolume;
applyVolumeToAll(initialVolume);
if (volumeSlider) volumeSlider.value = initialVolume;
setVolumeIcon(initialVolume);
updateSliderFill(initialVolume);

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (v > 0) lastNonZeroVolume = v;
        applyVolumeToAll(v);
        setVolumeIcon(v);
        updateSliderFill(v);
        try { localStorage.setItem(VOLUME_STORAGE_KEY, String(v)); } catch (_) {}
    });
}

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        const current = volumeSlider ? parseFloat(volumeSlider.value) : 1;
        const next = current > 0 ? 0 : lastNonZeroVolume;
        if (volumeSlider) volumeSlider.value = next;
        applyVolumeToAll(next);
        setVolumeIcon(next);
        updateSliderFill(next);
        try { localStorage.setItem(VOLUME_STORAGE_KEY, String(next)); } catch (_) {}
    });
}

if (miniPlayerToggle) {
    miniPlayerToggle.addEventListener('click', () => {
        const audio = getCurrentAudio();
        if (!audio) return;
        if (audio.paused) audio.play();
        else audio.pause();
    });
}
// ------------------------------------------------------------
// EQ popover
// ------------------------------------------------------------

const EQ_STORAGE_KEY = 'stvlking_eq';
const eqPopover = document.getElementById('eq-popover');
const eqBtn = document.getElementById('mini-player-eq-btn');
const eqResetBtn = document.getElementById('eq-popover-reset');
const eqSliders = {
    low: document.getElementById('eq-slider-low'),
    mid: document.getElementById('eq-slider-mid'),
    high: document.getElementById('eq-slider-high')
};
const eqValues = {
    low: document.getElementById('eq-value-low'),
    mid: document.getElementById('eq-value-mid'),
    high: document.getElementById('eq-value-high')
};

function updateEqSliderFill(slider, valueDb) {
    if (!slider) return;
    const pct = ((12 - valueDb) / 24) * 100;
    slider.style.setProperty('--eq-top', pct + '%');
}

function updateEqReadout(band, valueDb) {
    const el = eqValues[band];
    if (!el) return;
    const sign = valueDb > 0 ? '+' : '';
    el.innerHTML = `${sign}${valueDb}<span>dB</span>`;
    el.classList.remove('boost', 'cut');
    if (valueDb > 0) el.classList.add('boost');
    else if (valueDb < 0) el.classList.add('cut');
}

function setBand(band, valueDb) {
    setEqBand(band, valueDb);
    if (eqSliders[band]) eqSliders[band].value = valueDb;
    updateEqSliderFill(eqSliders[band], valueDb);
    updateEqReadout(band, valueDb);
}

function saveEqState() {
    try {
        const state = {
            low: parseFloat(eqSliders.low.value) || 0,
            mid: parseFloat(eqSliders.mid.value) || 0,
            high: parseFloat(eqSliders.high.value) || 0
        };
        localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
}

function loadEqState() {
    let state = { low: 0, mid: 0, high: 0 };
    try {
        const raw = localStorage.getItem(EQ_STORAGE_KEY);
        if (raw) state = JSON.parse(raw);
    } catch (_) {}
    ['low', 'mid', 'high'].forEach(band => {
        const v = typeof state[band] === 'number' ? state[band] : 0;
        if (eqSliders[band]) eqSliders[band].value = v;
        updateEqSliderFill(eqSliders[band], v);
        updateEqReadout(band, v);
        setEqBand(band, v);
    });
}

['low', 'mid', 'high'].forEach(band => {
    const slider = eqSliders[band];
    if (!slider) return;
    slider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value) || 0;
        setBand(band, v);
        saveEqState();
    });
});

if (eqResetBtn) {
    eqResetBtn.addEventListener('click', () => {
        ['low', 'mid', 'high'].forEach(band => setBand(band, 0));
        saveEqState();
    });
}

function openEqPopover() {
    if (!eqPopover) return;
    eqPopover.classList.add('open');
    if (eqBtn) eqBtn.classList.add('active');
}
function closeEqPopover() {
    if (!eqPopover) return;
    eqPopover.classList.remove('open');
    if (eqBtn) eqBtn.classList.remove('active');
}

if (eqBtn) {
    eqBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (eqPopover && eqPopover.classList.contains('open')) closeEqPopover();
        else openEqPopover();
    });
}

document.addEventListener('click', (e) => {
    if (!eqPopover || !eqPopover.classList.contains('open')) return;
    if (eqPopover.contains(e.target)) return;
    if (eqBtn && eqBtn.contains(e.target)) return;
    closeEqPopover();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && eqPopover && eqPopover.classList.contains('open')) {
        closeEqPopover();
    }
});

loadEqState();

// ------------------------------------------------------------
// Contact form
// ------------------------------------------------------------

const contactForm = document.getElementById('contact-form');
const contactSubmit = document.getElementById('contact-submit');
const CONTACT_COOLDOWN_KEY = 'sonnyvro_contact_cooldown';
const CONTACT_COOLDOWN_MS = 45000;

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const message = document.getElementById('contact-message').value.trim();
        if (!name || !email || !message) { showToast('Fill in all fields'); return; }
        let lastPost = 0;
        try { lastPost = parseInt(localStorage.getItem(CONTACT_COOLDOWN_KEY) || '0', 10); } catch (_) {}
        if (Date.now() - lastPost < CONTACT_COOLDOWN_MS) {
            const wait = Math.ceil((CONTACT_COOLDOWN_MS - (Date.now() - lastPost)) / 1000);
            showToast(`Wait ${wait}s before sending again`);
            return;
        }
        contactSubmit.disabled = true;
        try {
            const res = await fetch('https://contact-form-proxy.sonnyvromusic.workers.dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
            if (res.ok) {
                try { localStorage.setItem(CONTACT_COOLDOWN_KEY, String(Date.now())); } catch (_) {}
                showToast('Message sent');
                contactForm.reset();
            } else {
                showToast('Could not send');
            }
        } catch (_) {
            showToast('Could not send');
        } finally {
            contactSubmit.disabled = false;
        }
    });
}

// ------------------------------------------------------------
// Service worker
// ------------------------------------------------------------

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}