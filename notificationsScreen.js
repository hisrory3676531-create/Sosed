export function createNotificationsScreenController(ctx) {
    const {
        dom,
        state,
        escapeHtml,
        persistNotificationsUnread,
        renderNotificationsBadge
    } = ctx;

    function renderNotificationsScreen() {
        if (!dom.notifications || !dom.notifications.list) return;

        const items = Array.isArray(state.notifications) ? state.notifications.slice().reverse() : [];
        if (!items.length) {
            dom.notifications.list.innerHTML = `
            <div class="bg-white rounded-2xl border p-8 text-center">
                <div class="text-3xl text-gray-300"><i class="fa-solid fa-bell"></i></div>
                <div class="mt-3 font-bold text-gray-900">Новых уведомлений нет</div>
                <div class="mt-1 text-sm text-gray-500">Здесь будут события по заказам и услугам</div>
            </div>
        `;
        } else {
            dom.notifications.list.innerHTML = items.map((n) => {
                const text = String(n && n.text ? n.text : '').trim();
                const title = String(n && n.title ? n.title : '').trim();
                const ts = Number(n && n.ts ? n.ts : 0);
                const time = ts ? new Date(ts).toLocaleString() : '';
                return `
                <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    ${title ? `<div class=\"text-xs text-gray-500 font-semibold\">${escapeHtml(title)}</div>` : ''}
                    <div class="font-semibold text-gray-900">${escapeHtml(text)}</div>
                    ${time ? `<div class=\"mt-2 text-[11px] text-gray-400 font-semibold\">${escapeHtml(time)}</div>` : ''}
                </article>
            `;
            }).join('');
        }

        if ((Number(state.notificationsUnread) || 0) > 0) {
            state.notificationsUnread = 0;
            persistNotificationsUnread();
            renderNotificationsBadge();
        }
    }

    return {
        renderNotificationsScreen
    };
}
