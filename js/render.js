export function renderLocationUI({ state, dom, escapeHtml }) {
    const city = state.location.city || 'Красноярск';
    const district = state.location.district || '';

    if (dom.header && dom.header.locationText) {
        dom.header.locationText.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(city)}${district ? `, ${escapeHtml(district)}` : ''}`;
    }
    if (dom.profile && dom.profile.city) dom.profile.city.value = city;
    if (dom.profile && dom.profile.district && !dom.profile.district.value) dom.profile.district.value = district;

    if (dom.inputs && dom.inputs.orderCity) dom.inputs.orderCity.value = city;
    if (dom.inputs && dom.inputs.serviceCity) dom.inputs.serviceCity.value = city;
    if (dom.inputs && dom.inputs.orderDistrict && !dom.inputs.orderDistrict.value) dom.inputs.orderDistrict.value = district;
    if (dom.inputs && dom.inputs.serviceDistrict && !dom.inputs.serviceDistrict.value) dom.inputs.serviceDistrict.value = district;
}

export function renderProfile({ state, dom, isLoggedIn, hasSubscription, getSubscriptionDaysLeft, applyRoleUI }) {
    if (!dom.profile) return;

    const name = state.session && state.session.name ? state.session.name : 'Гость';
    const phone = state.session && state.session.phone ? state.session.phone : null;

    if (dom.profile.name) dom.profile.name.textContent = name;
    if (dom.profile.phone) dom.profile.phone.textContent = phone ? phone : 'Телефон не указан';
    if (dom.profile.subStatus) {
        dom.profile.subStatus.textContent = hasSubscription()
            ? `Подписка активна (${getSubscriptionDaysLeft()} дн.)`
            : 'Подписка неактивна';
    }
    if (dom.profile.subtitle) {
        dom.profile.subtitle.textContent = isLoggedIn()
            ? 'Профиль активен'
            : 'Войдите, чтобы публиковать заказы и услуги';
    }

    if (dom.profile.editName) dom.profile.editName.value = state.session.name || '';
    if (dom.profile.editPhone) dom.profile.editPhone.value = state.session.phone || '';

    if (dom.profile.avatar && state.session && state.session.avatar) {
        dom.profile.avatar.src = state.session.avatar;
    }

    if (dom.profile.city) dom.profile.city.value = state.location.city || 'Красноярск';
    if (dom.profile.district && !dom.profile.district.value) dom.profile.district.value = state.location.district || '';

    applyRoleUI();
}

export function renderStatusBadge({ escapeHtml }, status) {
    const st = String(status || '').trim();
    const map = {
        'Активен': 'bg-blue-50 text-blue-600',
        'Выполняется': 'bg-green-50 text-green-700',
        'Ожидает подтверждения': 'bg-yellow-50 text-yellow-700',
        'Ожидает мастера': 'bg-blue-50 text-blue-600',
        'Ожидает подтверждения клиента': 'bg-yellow-50 text-yellow-700',
        'Отказан': 'bg-red-50 text-red-600',
        'Отменен': 'bg-gray-100 text-gray-600',
        'Завершен': 'bg-gray-100 text-gray-700'
    };
    const cls = map[st] || 'bg-gray-100 text-gray-600';
    return `<span class="text-xs font-bold px-3 py-1 rounded-full ${cls}">${escapeHtml(st || '—')}</span>`;
}

function renderRatingLine({ escapeHtml }, item) {
    const rating = Number(item && item.rating);
    const count = Number(item && item.ratingCount);
    if (!rating || !count) return '';
    return `<div class="text-xs text-gray-500 mt-1">⭐ ${escapeHtml(String(rating))} (${escapeHtml(String(count))})</div>`;
}

export function renderMastersFeed({ state, dom, escapeHtml, formatPrice }) {
    if (!dom.feeds || !dom.feeds.masters) return;
    const items = Array.isArray(state.masters) ? state.masters : [];

    const filtered = items.filter((m) => {
        if (!m) return false;
        if (state.activeChip === 'all') return true;
        const cat = String(m.cat || m.category || '').toLowerCase();
        const chip = String(state.activeChip || '').toLowerCase();
        return cat.includes(chip);
    });

    if (!filtered.length) {
        dom.feeds.masters.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">Мастера не найдены</div>`;
        return;
    }

    dom.feeds.masters.innerHTML = filtered.map((m) => {
        const title = String(m.title || m.name || 'Мастер');
        const desc = String(m.desc || m.description || '').trim();
        const cat = String(m.cat || m.category || '');
        const priceFrom = m.priceFrom || m.price || '';
        const canContact = true;
        const canAdminDelete = Boolean(state.session && state.session.isAdmin);
        return `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="font-bold text-gray-900">${escapeHtml(title)}</div>
                ${cat ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(cat)}</div>` : ''}
                ${renderRatingLine({ escapeHtml }, m)}
                ${desc ? `<div class="text-sm text-gray-600 mt-2 line-clamp-2">${escapeHtml(desc)}</div>` : ''}
                ${priceFrom ? `<div class="mt-2 font-bold text-green-600">от ${escapeHtml(formatPrice(priceFrom))} ₽</div>` : ''}
                ${canContact ? `
                    <button type="button" data-action="contact" data-kind="master" data-id="${escapeHtml(m.id)}" data-phone="${escapeHtml(m.phone || '')}" data-title="${escapeHtml(title)}"
                        class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-md">
                        Связаться
                    </button>
                ` : ''}
                ${canAdminDelete ? `
                    <button type="button" data-action="delete" data-kind="master" data-id="${escapeHtml(m.id)}"
                        class="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">
                        Удалить
                    </button>
                ` : ''}
            </article>
        `;
    }).join('');
}

export function renderOrdersFeed({ state, dom, escapeHtml, formatPrice }) {
    if (!dom.feeds || !dom.feeds.orders) return;
    const items = Array.isArray(state.orders) ? state.orders : [];
    const filtered = items.filter((o) => String(o && o.status ? o.status : 'Активен') === 'Активен');

    if (!filtered.length) {
        dom.feeds.orders.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">Активных заказов нет</div>`;
        return;
    }

    dom.feeds.orders.innerHTML = filtered.map((o) => {
        const title = String(o.title || 'Заказ');
        const cat = String(o.cat || '');
        const price = o.price ? `${formatPrice(o.price)} ₽` : '';

        const addr = String(o.address || '');
        const canContact = true;
        const canAdminDelete = Boolean(state.session && state.session.isAdmin);
        return `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="font-bold text-gray-900">${escapeHtml(title)}</div>
                ${cat ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(cat)}</div>` : ''}
                ${addr ? `<div class="text-sm text-gray-600 mt-2 line-clamp-2">${escapeHtml(addr)}</div>` : ''}
                ${price ? `<div class="mt-2 font-bold text-green-600">${escapeHtml(price)}</div>` : ''}
                ${canContact ? `
                    <button type="button" data-action="contact" data-kind="order" data-id="${escapeHtml(o.id)}" data-phone="${escapeHtml(o.phone || '')}" data-title="${escapeHtml(title)}"
                        class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-md">
                        Откликнуться
                    </button>
                ` : ''}
                ${canAdminDelete ? `
                    <button type="button" data-action="delete" data-kind="order" data-id="${escapeHtml(o.id)}"
                        class="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">
                        Удалить
                    </button>
                ` : ''}
            </article>
        `;
    }).join('');
}

export function renderMy({ state, dom, escapeHtml, formatPrice, normalizePhone, requireAuth, applyRoleUI }) {
    if (!dom.my || !dom.my.content) return;
    if (!requireAuth('my')) return;
    applyRoleUI();

    const myPhone = state.session && state.session.phone ? normalizePhone(state.session.phone) : null;
    const blocks = [];

    const section = (title, itemsHtml) => {
        if (!itemsHtml || !itemsHtml.length) return;
        blocks.push(`
            <div class="col-span-full">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">${escapeHtml(title)}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    ${itemsHtml.join('')}
                </div>
            </div>
        `);
    };

    const isInProgressOrder = (st) => st === 'Выполняется' || st.startsWith('Ожидает подтверждения');

    const myClientOrders = (state.orders || []).filter((o) => myPhone && normalizePhone(o.phone) === myPhone);
    const myClientDeals = (state.serviceDeals || []).filter((d) => myPhone && normalizePhone(d.clientPhone) === myPhone);

    const clientOrdersActive = [];
    const clientOrdersInProgress = [];
    const clientOrdersDone = [];

    for (const o of myClientOrders) {
        const st = String(o && o.status ? o.status : 'Активен').trim();
        const canCancel = st === 'Выполняется';
        const canConfirm = st.startsWith('Ожидает подтверждения');
        const canDelete = !isInProgressOrder(st);
        const card = `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold">${escapeHtml(o.title || 'Заказ')}</div>
                    ${renderStatusBadge({ escapeHtml }, st)}
                </div>
                ${o.address ? `<div class="text-sm text-gray-600 mt-2 line-clamp-2">${escapeHtml(o.address)}</div>` : ''}
                ${canConfirm ? `<button type="button" data-action="deal-confirm" data-id="${escapeHtml(o.id)}" class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold">Подтвердить завершение</button>` : ''}
                ${canCancel ? `<button type="button" data-action="deal-cancel-client" data-id="${escapeHtml(o.id)}" class="w-full mt-3 bg-yellow-50 text-yellow-800 py-3 rounded-2xl font-bold">Отменить выполнение</button>` : ''}
                ${canDelete ? `<button type="button" data-action="order-delete" data-id="${escapeHtml(o.id)}" class="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">Удалить</button>` : ''}
            </article>
        `;
        if (st === 'Активен') clientOrdersActive.push(card);
        else if (isInProgressOrder(st)) clientOrdersInProgress.push(card);
        else clientOrdersDone.push(card);
    }

    const clientDealsWaiting = [];
    const clientDealsInProgress = [];
    const clientDealsDone = [];

    for (const d of myClientDeals) {
        const st = String(d.status || '').trim();
        const canConfirm = st.startsWith('Ожидает подтверждения');
        const canCancel = st === 'Ожидает мастера';
        const canDelete = st === 'Отказан' || st === 'Отменен' || st === 'Завершен';
        const card = `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold">${escapeHtml(d.serviceTitle || 'Услуга')}</div>
                    ${renderStatusBadge({ escapeHtml }, st)}
                </div>
                ${d.masterName ? `<div class="text-sm text-gray-600 mt-2">Мастер: <b>${escapeHtml(d.masterName)}</b></div>` : ''}
                ${canConfirm ? `<button type="button" data-action="service-deal-confirm" data-id="${escapeHtml(d.id)}" class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold">Подтвердить завершение</button>` : ''}
                ${canCancel ? `<button type="button" data-action="service-deal-cancel-client" data-id="${escapeHtml(d.id)}" class="w-full mt-3 bg-yellow-50 text-yellow-800 py-3 rounded-2xl font-bold">Отменить заявку</button>` : ''}
                ${canDelete ? `<button type="button" data-action="service-deal-delete" data-id="${escapeHtml(d.id)}" class="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">Удалить из истории</button>` : ''}
            </article>
        `;
        if (st === 'Ожидает мастера') clientDealsWaiting.push(card);
        else if (st === 'Выполняется' || st.startsWith('Ожидает подтверждения')) clientDealsInProgress.push(card);
        else clientDealsDone.push(card);
    }

    section('Мои как клиент · Заказы · Активные', clientOrdersActive);
    section('Мои как клиент · Заказы · В работе', clientOrdersInProgress);
    section('Мои как клиент · Заказы · Завершенные', clientOrdersDone);

    section('Мои как клиент · Заявки на услуги · Ожидают мастера', clientDealsWaiting);
    section('Мои как клиент · Заявки на услуги · В работе', clientDealsInProgress);
    section('Мои как клиент · Заявки на услуги · Завершенные', clientDealsDone);

    const myPublishedServices = (state.masters || []).filter((m) => myPhone && normalizePhone(m.phone) === myPhone);
    const myAssignedOrders = (state.orders || []).filter((o) => myPhone && normalizePhone(o.assignedMasterPhone) === myPhone);
    const incomingDeals = (state.serviceDeals || []).filter((d) => myPhone && normalizePhone(d.masterPhone) === myPhone);

    const masterServices = myPublishedServices.map((m) => {
        const title = String(m.title || m.name || 'Моя услуга');
        const desc = String(m.desc || m.description || '').trim();
        const cat = String(m.cat || m.category || '');
        const priceFrom = m.priceFrom || m.price || '';
        return `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="font-bold text-gray-900">${escapeHtml(title)}</div>
                ${cat ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(cat)}</div>` : ''}
                ${desc ? `<div class="text-sm text-gray-600 mt-2 line-clamp-2">${escapeHtml(desc)}</div>` : ''}
                ${priceFrom ? `<div class="mt-2 font-bold text-green-600">от ${escapeHtml(formatPrice(priceFrom))} ₽</div>` : ''}
                <button type="button" data-action="service-delete" data-id="${escapeHtml(m.id)}" class="w-full mt-4 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">Удалить</button>
            </article>
        `;
    });

    const masterOrdersInProgress = [];
    const masterOrdersDone = [];
    for (const o of myAssignedOrders) {
        const st = String(o.status || '').trim();
        const canFinish = st === 'Выполняется';
        const canCancel = st === 'Выполняется';
        const card = `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold">${escapeHtml(o.title || 'Заказ')}</div>
                    ${renderStatusBadge({ escapeHtml }, st)}
                </div>
                ${canFinish ? `<button type="button" data-action="deal-finish" data-id="${escapeHtml(o.id)}" class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold">Отметить выполненным</button>` : ''}
                ${canCancel ? `<button type="button" data-action="deal-cancel-master" data-id="${escapeHtml(o.id)}" class="w-full mt-3 bg-yellow-50 text-yellow-800 py-3 rounded-2xl font-bold">Отказаться</button>` : ''}
            </article>
        `;
        if (st === 'Выполняется' || st.startsWith('Ожидает подтверждения')) masterOrdersInProgress.push(card);
        else masterOrdersDone.push(card);
    }

    const masterDealsWaiting = [];
    const masterDealsInProgress = [];
    const masterDealsDone = [];

    for (const d of incomingDeals) {
        const st = String(d.status || '').trim();
        const canAccept = st === 'Ожидает мастера';
        const canDecline = st === 'Ожидает мастера';
        const canFinish = st === 'Выполняется';
        const card = `
            <article class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold">${escapeHtml(d.serviceTitle || 'Услуга')}</div>
                    ${renderStatusBadge({ escapeHtml }, st)}
                </div>
                ${d.clientName ? `<div class="text-sm text-gray-600 mt-2">Клиент: <b>${escapeHtml(d.clientName)}</b></div>` : ''}
                ${canAccept ? `<button type="button" data-action="service-deal-accept" data-id="${escapeHtml(d.id)}" class="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-bold">Принять</button>` : ''}
                ${canDecline ? `<button type="button" data-action="service-deal-decline" data-id="${escapeHtml(d.id)}" class="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-2xl font-bold">Отказать</button>` : ''}
                ${canFinish ? `<button type="button" data-action="service-deal-finish" data-id="${escapeHtml(d.id)}" class="w-full mt-3 bg-green-50 text-green-700 py-3 rounded-2xl font-bold">Завершить</button>` : ''}
            </article>
        `;
        if (st === 'Ожидает мастера') masterDealsWaiting.push(card);
        else if (st === 'Выполняется' || st.startsWith('Ожидает подтверждения')) masterDealsInProgress.push(card);
        else masterDealsDone.push(card);
    }

    section('Мои как мастер · Мои услуги', masterServices);
    section('Мои как мастер · Заказы · В работе', masterOrdersInProgress);
    section('Мои как мастер · Заказы · Завершенные', masterOrdersDone);
    section('Мои как мастер · Заявки на услуги · Ожидают меня', masterDealsWaiting);
    section('Мои как мастер · Заявки на услуги · В работе', masterDealsInProgress);
    section('Мои как мастер · Заявки на услуги · Завершенные', masterDealsDone);

    dom.my.content.innerHTML = blocks.length ? blocks.join('') : `<div class="col-span-full text-center text-gray-400 py-10">Пока пусто</div>`;
}

export function renderFeeds(ctx) {
    renderMastersFeed(ctx);
    renderOrdersFeed(ctx);
}
