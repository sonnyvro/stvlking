// shared.js
// Utilities used by every other module.

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
}

function showToast(msg) {
    const toastEl = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function isConfigured() {
    return typeof FIREBASE_DB_URL !== 'undefined'
        && FIREBASE_DB_URL
        && FIREBASE_DB_URL !== 'YOUR_FIREBASE_DB_URL_HERE';
}

function getClientId() {
    let id = '';
    try { id = localStorage.getItem('sonnyvro_client_id') || ''; } catch (_) {}
    if (!id) {
        id = 'c_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
        try { localStorage.setItem('sonnyvro_client_id', id); } catch (_) {}
    }
    return id;
}

function timeAgo(ms) {
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
