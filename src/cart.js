// src/cart.js
// Beat cart: list, drawer, cart pill, add buttons, Discord webhook submit.

import { CART_KEY, BEAT_INQUIRY_WEBHOOK_URL, escapeHtml, showToast } from './shared.js';
import { TRACK_LOOKUP } from './catalog.js';

function getCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
}

function saveCart(arr) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(arr)); } catch (_) {}
}

export function inCart(id) {
    return getCart().indexOf(id) !== -1;
}

export function addToCart(id) {
    const cart = getCart();
    if (cart.indexOf(id) === -1) {
        cart.push(id);
        saveCart(cart);
    }
}

export function removeFromCart(id) {
    const cart = getCart().filter(x => x !== id);
    saveCart(cart);
}

export function updateCartPill() {
    const cart = getCart();
    const cartPillCount = document.getElementById('cart-pill-count');
    const cartPill = document.getElementById('cart-pill');
    if (cartPillCount) cartPillCount.textContent = cart.length;
    if (cartPill) cartPill.classList.toggle('visible', cart.length > 0);
    document.querySelectorAll('[data-track-add]').forEach(btn => {
        btn.classList.toggle('added', inCart(btn.dataset.trackAdd));
    });
}

export function renderCartDrawer() {
    const cartListEl = document.getElementById('cart-list');
    if (!cartListEl) return;
    const cart = getCart();
    if (!cart.length) {
        cartListEl.innerHTML = `<div class="cart-empty">Your list is empty. Add beats from the catalog.</div>`;
        return;
    }
    cartListEl.innerHTML = cart.map(id => {
        const t = TRACK_LOOKUP[id];
        if (!t) return '';
        return `
            <div class="cart-item" data-id="${id}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${escapeHtml(t.title)}</div>
                    <div class="cart-item-meta">${escapeHtml((t.tags || []).join(' · '))}</div>
                </div>
                <button class="cart-item-remove" type="button" data-cart-remove="${id}" aria-label="Remove">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
    }).join('');
    cartListEl.querySelectorAll('[data-cart-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.cartRemove);
            renderCartDrawer();
            updateCartPill();
        });
    });
}

export function openCartDrawer() {
    renderCartDrawer();
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (backdrop) backdrop.classList.add('open');
}

export function closeCartDrawer() {
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (backdrop) backdrop.classList.remove('open');
}

export function wireAddButtons() {
    document.querySelectorAll('[data-track-add]').forEach(btn => {
        if (btn.dataset.addWired === '1') return;
        btn.dataset.addWired = '1';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.trackAdd;
            if (inCart(id)) {
                removeFromCart(id);
                showToast('Removed from your list');
            } else {
                addToCart(id);
                showToast('Added to your list');
            }
            updateCartPill();
            const drawer = document.getElementById('cart-drawer-backdrop');
            if (drawer && drawer.classList.contains('open')) renderCartDrawer();
        });
    });
}

export function initCartUI() {
    const cartPill = document.getElementById('cart-pill');
    const cartDrawerClose = document.getElementById('cart-drawer-close');
    const cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
    const cartSubmit = document.getElementById('cart-submit');

    if (cartPill) {
        cartPill.addEventListener('click', openCartDrawer);
        cartPill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCartDrawer();
            }
        });
    }
    if (cartDrawerClose) cartDrawerClose.addEventListener('click', closeCartDrawer);
    if (cartDrawerBackdrop) {
        cartDrawerBackdrop.addEventListener('click', (e) => {
            if (e.target === cartDrawerBackdrop) closeCartDrawer();
        });
    }
    if (cartSubmit) {
        cartSubmit.addEventListener('click', async () => {
            const cart = getCart();
            if (!cart.length) {
                showToast('Your list is empty');
                return;
            }
            const cartNameEl = document.getElementById('cart-name');
            const cartContactEl = document.getElementById('cart-contact');
            const cartNoteEl = document.getElementById('cart-note');
            const name = (cartNameEl.value || '').trim();
            const contact = (cartContactEl.value || '').trim();
            const note = (cartNoteEl.value || '').trim();

            if (!BEAT_INQUIRY_WEBHOOK_URL || BEAT_INQUIRY_WEBHOOK_URL === 'PASTE_YOUR_DISCORD_WEBHOOK_URL_HERE') {
                showToast('Webhook not configured');
                return;
            }

            const trackLines = cart.map(id => {
                const t = TRACK_LOOKUP[id];
                return t ? `• ${t.title}` : `• ${id}`;
            }).join('\n');

            const embed = {
                title: '🎧 New beat inquiry',
                color: 0xff0033,
                fields: [
                    { name: 'From', value: name || 'anonymous', inline: true },
                    { name: 'Contact', value: contact || '—', inline: true },
                    { name: 'Beats', value: trackLines || '—', inline: false }
                ],
                footer: { text: 'stvlking.online' },
                timestamp: new Date().toISOString()
            };
            if (note) embed.fields.push({ name: 'Note', value: note.slice(0, 1000), inline: false });

            cartSubmit.disabled = true;
            try {
                const res = await fetch(BEAT_INQUIRY_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ embeds: [embed] })
                });
                if (res.ok) {
                    showToast('List sent — check Discord');
                    saveCart([]);
                    updateCartPill();
                    cartNameEl.value = '';
                    cartContactEl.value = '';
                    cartNoteEl.value = '';
                    closeCartDrawer();
                } else {
                    showToast('Could not send — try Discord DM');
                }
            } catch (_) {
                showToast('Could not send — try Discord DM');
            } finally {
                cartSubmit.disabled = false;
            }
        });
    }
}