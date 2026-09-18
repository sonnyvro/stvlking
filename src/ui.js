// src/ui.js
// Page-wide UI effects: rain, cursor spotlight, magnetic buttons,
// entrance animations, scroll progress, clock, audio-reactive flash.

import { prefersReducedMotion } from './shared.js';

export function generateRain() {
    if (prefersReducedMotion) return;
    const layer = document.getElementById('rain-layer');
    if (!layer) return;
    const DROP_COUNT = 110;
    for (let i = 0; i < DROP_COUNT; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        const r = Math.random();
        if (r > 0.85) drop.classList.add('thick');
        else if (r < 0.4) drop.classList.add('faint');
        drop.style.left = (Math.random() * 100) + '%';
        const len = 30 + Math.random() * 100;
        drop.style.height = len + 'px';
        const dur = 0.7 + Math.random() * 1.5;
        drop.dataset.baseDuration = dur;
        drop.style.animationDuration = dur + 's';
        drop.style.animationDelay = (-Math.random() * dur * 3) + 's';
        drop.style.opacity = 0.5 + Math.random() * 0.5;
        layer.appendChild(drop);
    }
}

export function setRainReactive(active) {
    const layer = document.getElementById('rain-layer');
    if (!layer) return;
    layer.classList.toggle('reactive', active);
    layer.querySelectorAll('.rain-drop').forEach(drop => {
        const base = parseFloat(drop.dataset.baseDuration || '1');
        drop.style.animationDuration = (active ? base * 0.65 : base) + 's';
    });
}

export function initCursorSpotlight() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(max-width: 900px)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const spot = document.getElementById('cursor-spotlight');
    if (!spot || spot.dataset.bound === '1') return;
    spot.dataset.bound = '1';
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;
    let started = false;
    window.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!started) { started = true; spot.classList.add('active'); }
    }, { passive: true });
    window.addEventListener('mouseleave', () => spot.classList.remove('active'));
    function loop() {
        cx += (mx - cx) * 0.14;
        cy += (my - cy) * 0.14;
        spot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate3d(-50%, -50%, 0)`;
        requestAnimationFrame(loop);
    }
    loop();
}

export function initMagnetic() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    document.querySelectorAll('.magnetic').forEach(el => {
        if (el.dataset.magnetic === '1') return;
        el.dataset.magnetic = '1';
        let raf = null;
        let tx = 0;
        let ty = 0;
        function apply() {
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            raf = null;
        }
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const relX = e.clientX - (rect.left + rect.width / 2);
            const relY = e.clientY - (rect.top + rect.height / 2);
            tx = relX * 0.18;
            ty = relY * 0.28;
            if (!raf) raf = requestAnimationFrame(apply);
        });
        el.addEventListener('mouseleave', () => {
            tx = 0;
            ty = 0;
            if (!raf) raf = requestAnimationFrame(apply);
        });
    });
}

export function initEntrance() {
    if (prefersReducedMotion) return;
    const glow = document.getElementById('glow-layer');
    const rain = document.getElementById('rain-layer');
    const cards = document.querySelectorAll('.hero-inner > .card, .hero-inner > .top-row');
    window.requestAnimationFrame(() => {
        setTimeout(() => { if (glow) glow.classList.add('entrance-show'); }, 80);
        setTimeout(() => { if (rain) rain.classList.add('entrance-show'); }, 260);
        cards.forEach((card, i) => {
            if (card.hidden) return;
            setTimeout(() => {
                card.classList.remove('entrance-hide');
                card.classList.add('entrance-show');
            }, 420 + i * 140);
        });
    });
}

export function initGlideObserver() {
    const glideEls = document.querySelectorAll('.glide');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
            else entry.target.classList.remove('visible');
        });
    }, { threshold: 0.15, rootMargin: '-60px 0px -80px 0px' });
    glideEls.forEach(el => observer.observe(el));
}

export function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    function update() {
        const h = document.documentElement;
        const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
        bar.style.width = Math.min(100, Math.max(0, scrolled)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}

export function initClock() {
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York'
        });
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York'
        });
        const valueEl = document.getElementById('local-time-value');
        const tzEl = document.getElementById('local-time-tz');
        if (valueEl) valueEl.textContent = `${dateStr} · ${timeStr}`;
        if (tzEl) tzEl.textContent = 'EST';
    }
    update();
    setInterval(update, 30000);
}

export function wireAudioFlash(usernameEl) {
    if (prefersReducedMotion) return;
    if (window.__audioFlashWired) return;

    const flashLayer = document.getElementById('audio-flash-layer');
    const lightningLayer = document.getElementById('lightning-layer');
    if (!flashLayer || !lightningLayer) return;
    window.__audioFlashWired = true;

    const FLASH_PEAK = 0.18;
    const ATTACK = 0.55;
    const RELEASE = 0.2;
    const SMOOTH_FLOOR = 0.04;

    const STRIKE_THRESHOLD = 0.32;
    const STRIKE_COOLDOWN_MS = 160;
    const STRIKE_RISE = 0.08;

    const KINETIC_GLITCH_THRESHOLD = 0.7;
    const KINETIC_GLITCH_COOLDOWN = 500;

    let rafId = null;
    let smoothed = 0;
    let prevBass = 0;
    let lastStrikeAt = 0;
    let lastGlitchAt = 0;
    let running = false;

    function fireStrike() {
        const now = performance.now();
        if (now - lastStrikeAt < STRIKE_COOLDOWN_MS) return;
        lastStrikeAt = now;
        lightningLayer.classList.remove('strike');
        void lightningLayer.offsetWidth;
        lightningLayer.classList.add('strike');
    }

    function fireKineticGlitch() {
        const now = performance.now();
        if (now - lastGlitchAt < KINETIC_GLITCH_COOLDOWN) return;
        lastGlitchAt = now;
        if (usernameEl) {
            usernameEl.classList.remove('kinetic-glitch');
            void usernameEl.offsetWidth;
            usernameEl.classList.add('kinetic-glitch');
            setTimeout(() => usernameEl.classList.remove('kinetic-glitch'), 180);
        }
    }

    function tick() {
        if (!running) return;
        // getBassLevel is exported from audio.js; imported via dynamic lookup
        // to avoid circular import at module load.
        const getBassLevel = window.__getBassLevel;
        if (!getBassLevel) { rafId = requestAnimationFrame(tick); return; }
        const raw = getBassLevel();

        const shaped = raw < SMOOTH_FLOOR ? 0 : (raw - SMOOTH_FLOOR) / (1 - SMOOTH_FLOOR);
        const target = shaped * shaped;
        const coeff = target > smoothed ? ATTACK : RELEASE;
        smoothed += (target - smoothed) * coeff;
        flashLayer.style.opacity = (smoothed * FLASH_PEAK).toFixed(4);

        const root = document.documentElement;
        if (root) {
            const scale = 1 + smoothed * 0.035;
            root.style.setProperty('--kinetic-scale', scale.toFixed(4));
            root.style.setProperty('--kinetic-glow', smoothed.toFixed(4));
        }

        const rise = raw - prevBass;
        if (raw > STRIKE_THRESHOLD && rise > STRIKE_RISE) fireStrike();
        if (raw > KINETIC_GLITCH_THRESHOLD && rise > STRIKE_RISE) fireKineticGlitch();
        prevBass = raw;

        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (running) return;
        running = true;
        prevBass = 0;
        rafId = requestAnimationFrame(tick);
    }

    function stop() {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        flashLayer.style.opacity = '0';
        const root = document.documentElement;
        if (root) {
            root.style.setProperty('--kinetic-scale', '1');
            root.style.setProperty('--kinetic-glow', '0');
        }
    }

    // Hook into audio play/pause events
    document.querySelectorAll('[data-track-audio]').forEach(audio => {
        if (audio.dataset.flashWired === '1') return;
        audio.dataset.flashWired = '1';
        audio.addEventListener('play', start);
        audio.addEventListener('pause', () => {
            const anyPlaying = Array.from(document.querySelectorAll('[data-track-audio]')).some(a => !a.paused);
            if (!anyPlaying) stop();
        });
        audio.addEventListener('ended', () => {
            const anyPlaying = Array.from(document.querySelectorAll('[data-track-audio]')).some(a => !a.paused);
            if (!anyPlaying) stop();
        });
    });
}