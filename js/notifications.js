import { dom } from './dom.js';

export function persistNotificationsUnread({ STORAGE_KEYS, state }) {
    localStorage.setItem(STORAGE_KEYS.notificationsUnread, String(Number(state.notificationsUnread) || 0));
}

export function persistNotifications({ STORAGE_KEYS, state }) {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(state.notifications || []));
}

export function renderNotificationsBadge({ state }) {
    const n = Number(state.notificationsUnread) || 0;
    if (!dom || !dom.header || !dom.header.notifBadge) return;
    if (n > 0) {
        dom.header.notifBadge.textContent = String(n);
        dom.header.notifBadge.classList.remove('hidden');
    } else {
        dom.header.notifBadge.classList.add('hidden');
    }
}

export function playBellSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.2);
        o.onended = () => {
            try { ctx.close(); } catch {}
        };
    } catch (e) {
        console.warn('playBellSound failed', e);
    }
}

export function pushNotification({ STORAGE_KEYS, state, payload }) {
    state.notificationsUnread = (Number(state.notificationsUnread) || 0) + 1;
    if (payload) {
        state.notifications = (state.notifications || []).concat(payload);
        persistNotifications({ STORAGE_KEYS, state });
    }
    persistNotificationsUnread({ STORAGE_KEYS, state });
    renderNotificationsBadge({ state });
    playBellSound();
}

export function clearNotifications({ STORAGE_KEYS, state }) {
    state.notificationsUnread = 0;
    state.notifications = [];
    persistNotifications({ STORAGE_KEYS, state });
    persistNotificationsUnread({ STORAGE_KEYS, state });
    renderNotificationsBadge({ state });
}
