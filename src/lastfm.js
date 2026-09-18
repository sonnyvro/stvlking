// src/lastfm.js
// Last.fm "On Repeat" panel: top artists, top songs, top genre.

import { LASTFM_API_KEY, LASTFM_USERNAME, LASTFM_BASE, escapeHtml } from './shared.js';

function lastfmUrl(params) {
    const qs = new URLSearchParams({
        ...params,
        user: LASTFM_USERNAME,
        api_key: LASTFM_API_KEY,
        format: 'json'
    });
    return `${LASTFM_BASE}?${qs.toString()}`;
}

function renderLastfmRows(container, items) {
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="lastfm-row"><span class="lastfm-name" style="color:var(--text-dim);font-style:italic;">No data yet</span></div>`;
        return;
    }
    container.innerHTML = items.map((item, i) => {
        const name = item.name || item.title || '—';
        const count = item.playcount || '';
        const url = item.url || '#';
        return `<a class="lastfm-row" href="${url}" target="_blank" rel="noopener"><span class="lastfm-rank">${i + 1}</span><span class="lastfm-name">${escapeHtml(name)}</span>${count ? `<span class="lastfm-count">${count}</span>` : ''}</a>`;
    }).join('');
}

async function deriveTopGenres(topArtists) {
    const lastfmGenresEl = document.getElementById('lastfm-genres');
    if (!lastfmGenresEl) return;
    if (!topArtists.length) {
        lastfmGenresEl.innerHTML = `<div class="lastfm-row"><span class="lastfm-name" style="color:var(--text-dim);font-style:italic;">No data yet</span></div>`;
        return;
    }
    const sample = topArtists.slice(0, 8);
    try {
        const tagResults = await Promise.all(sample.map(a =>
            fetch(lastfmUrl({ method: 'artist.gettoptags', artist: a.name, autocorrect: 1 }))
                .then(r => r.json())
                .catch(() => null)
        ));
        const tagCounts = {};
        const IGNORE = new Set(['seen live', 'favorites', 'favourite', 'spotify', 'love', 'awesome']);
        tagResults.forEach(data => {
            const tags = data?.toptags?.tag || [];
            tags.slice(0, 3).forEach(t => {
                const name = (t.name || '').toLowerCase().trim();
                if (!name || IGNORE.has(name)) return;
                tagCounts[name] = (tagCounts[name] || 0) + parseInt(t.count || 0, 10);
            });
        });
        const genres = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({
                name,
                playcount: count,
                url: `https://www.last.fm/tag/${encodeURIComponent(name)}`
            }));
        renderLastfmRows(lastfmGenresEl, genres);
    } catch (_) {
        lastfmGenresEl.innerHTML = `<div class="lastfm-row"><span class="lastfm-name" style="color:var(--text-dim);font-style:italic;">No data yet</span></div>`;
    }
}

export async function fetchLastfmStats() {
    if (!LASTFM_API_KEY || LASTFM_API_KEY === 'YOUR_LASTFM_API_KEY_HERE') return;
    const lastfmArtistsEl = document.getElementById('lastfm-artists');
    const lastfmSongsEl = document.getElementById('lastfm-songs');
    const lastfmGenresEl = document.getElementById('lastfm-genres');
    try {
        const [artistsRes, tracksRes, allArtistsRes] = await Promise.all([
            fetch(lastfmUrl({ method: 'user.gettopartists', period: '1month', limit: 3 })),
            fetch(lastfmUrl({ method: 'user.gettoptracks',  period: '1month', limit: 3 })),
            fetch(lastfmUrl({ method: 'user.gettopartists', period: '1month', limit: 50 }))
        ]);
        const artistsData = await artistsRes.json();
        const tracksData  = await tracksRes.json();
        const allArtists  = await allArtistsRes.json();
        const artists = (artistsData?.topartists?.artist || []).map(a => ({
            name: a.name, playcount: a.playcount, url: a.url
        }));
        renderLastfmRows(lastfmArtistsEl, artists);
        const songs = (tracksData?.toptracks?.track || []).map(t => ({
            name: `${t.name} — ${t.artist?.name || ''}`,
            playcount: t.playcount,
            url: t.url
        }));
        renderLastfmRows(lastfmSongsEl, songs);
        await deriveTopGenres(allArtists?.topartists?.artist || []);
    } catch (err) {
        const fail = `<div class="lastfm-row"><span class="lastfm-name" style="color:var(--text-dim);font-style:italic;">Could not load</span></div>`;
        if (lastfmArtistsEl) lastfmArtistsEl.innerHTML = fail;
        if (lastfmSongsEl) lastfmSongsEl.innerHTML = fail;
        if (lastfmGenresEl) lastfmGenresEl.innerHTML = fail;
    }
}

export function initLastfm() {
    fetchLastfmStats();
    setInterval(fetchLastfmStats, 300000);
}