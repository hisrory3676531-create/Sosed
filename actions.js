export async function acceptOrder(ctx, orderId) {
    const {
        state,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        persistOrders,
        cloudUpsert,
        persistResponses
    } = ctx;

    if (state.userRole !== 'master') return false;
    if (!requireAuth('my')) return false;
    if (!await ensureUserPhone()) return false;

    const id = String(orderId || '');
    const order = (state.orders || []).find((o) => String(o.id) === id);
    if (!order) return false;
    if (String(order.status || 'Активен') !== 'Активен') return false;

    order.status = 'Выполняется';
    order.assignedMasterPhone = normalizePhone(state.session.phone);
    persistOrders();
    cloudUpsert('orders', order);

    if (!Array.isArray(state.masterResponses)) state.masterResponses = [];
    if (!state.masterResponses.includes(id)) state.masterResponses.push(id);
    persistResponses();

    return true;
}

export async function submitOrder(ctx) {
    const {
        state,
        dom,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        ensureCleanField,
        persistOrders,
        cloudUpsert,
        renderFeeds,
        setActiveScreen
    } = ctx;

    if (!requireAuth('create-order')) return;
    if (!await ensureUserPhone()) return;

    const title = dom.inputs.orderTitle.value.trim();
    const cat = dom.inputs.orderCat.value;
    const price = dom.inputs.orderPrice.value ? Number(dom.inputs.orderPrice.value) : null;
    const address = dom.inputs.orderAddress.value.trim();
    const district = dom.inputs.orderDistrict.value.trim();

    if (!title) {
        alert('Укажите что нужно сделать');
        return;
    }
    if (!ensureCleanField(title, 'Заголовок')) return;
    if (!ensureCleanField(address, 'Адрес')) return;

    const o = {
        id: String(Date.now()),
        createdAt: Date.now(),
        time: 'Только что',
        title,
        cat,
        price,
        address,
        city: state.location.city,
        district,
        phone: normalizePhone(state.session.phone),
        status: 'Активен',
        assignedMasterPhone: null
    };

    state.orders = [o, ...(state.orders || [])];
    persistOrders();
    cloudUpsert('orders', o);
    dom.forms['create-order'].reset();
    renderFeeds();
    setActiveScreen('home');
}

export async function cancelOrder(ctx, orderId, actorRole) {
    const {
        state,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        isCloudReady,
        cloudCancelOrderTransaction,
        persistOrders,
        persistResponses,
        cloudUpsert,
        renderFeeds,
        dom,
        renderMy
    } = ctx;

    if (!requireAuth('my')) return false;
    if (!await ensureUserPhone()) return false;

    const id = String(orderId || '');
    const order = state.orders.find((o) => String(o.id) === id);
    if (!order) {
        alert('Заказ не найден');
        return false;
    }

    const actorPhone = String(state.session.phone || '').trim();
    if (!actorPhone) return false;

    if (String(order.status || 'Активен') !== 'Выполняется') {
        alert('Отказ возможен только для заказов в статусе «Выполняется»');
        return false;
    }

    if (actorRole === 'master') {
        if (normalizePhone(order.assignedMasterPhone) !== normalizePhone(actorPhone)) {
            alert('Этот заказ закреплён за другим мастером');
            return false;
        }
    } else if (actorRole === 'client') {
        if (normalizePhone(order.phone) !== normalizePhone(actorPhone)) {
            alert('Это не ваш заказ');
            return false;
        }
    } else {
        alert('Ошибка отмены');
        return false;
    }

    if (isCloudReady()) {
        const ok = await cloudCancelOrderTransaction(id, actorRole, actorPhone);
        if (!ok) {
            alert('Не удалось отменить: возможно статус уже изменился. Обновите ленту.');
            return false;
        }
    }

    order.status = 'Активен';
    order.assignedMasterPhone = null;
    order.createdAt = Date.now();
    order.time = 'Только что';
    persistOrders();

    if (actorRole === 'master') {
        const idx = Array.isArray(state.masterResponses) ? state.masterResponses.indexOf(id) : -1;
        if (idx >= 0) {
            state.masterResponses.splice(idx, 1);
            persistResponses();
        }
    }

    if (!isCloudReady()) {
        cloudUpsert('orders', order);
    }

    renderFeeds();
    if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
    return true;
}

export async function acceptServiceDeal(ctx, dealId) {
    const { state, normalizePhone, persistServiceDeals, cloudUpsert, renderMy } = ctx;

    const id = String(dealId || '');
    const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
    if (!deal) return false;

    if (String(deal.status || '') !== 'Ожидает мастера') return false;
    if (state.userRole !== 'master') return false;
    const myPhone = state.session && state.session.phone ? normalizePhone(state.session.phone) : null;
    if (!myPhone) return false;
    if (normalizePhone(deal.masterPhone) !== myPhone) return false;

    deal.status = 'Выполняется';
    persistServiceDeals();
    cloudUpsert('serviceDeals', deal);
    renderMy();
    return true;
}

export async function declineServiceDeal(ctx, dealId) {
    const { state, persistServiceDeals, cloudUpsert, renderMy } = ctx;

    const id = String(dealId || '');
    const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
    if (!deal) return false;

    deal.status = 'Отказан';
    persistServiceDeals();
    cloudUpsert('serviceDeals', deal);
    renderMy();
    return true;
}

export async function finishServiceDeal(ctx, dealId) {
    const { state, persistServiceDeals, cloudUpsert, renderMy } = ctx;

    const id = String(dealId || '');
    const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
    if (!deal) return false;

    deal.status = 'Ожидает подтверждения клиента';
    persistServiceDeals();
    cloudUpsert('serviceDeals', deal);
    renderMy();
    return true;
}

export async function cancelServiceDealAsClient(ctx, dealId) {
    const { state, persistServiceDeals, cloudUpsert, renderMy } = ctx;

    const id = String(dealId || '');
    const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
    if (!deal) return false;

    deal.status = 'Отменен';
    persistServiceDeals();
    cloudUpsert('serviceDeals', deal);
    renderMy();
    return true;
}

export async function deleteServiceDeal(ctx, dealId) {
    const { state, persistServiceDeals, cloudDelete, renderMy } = ctx;

    const id = String(dealId || '');
    const idx = (state.serviceDeals || []).findIndex((d) => String(d.id) === id);
    if (idx < 0) return false;

    state.serviceDeals.splice(idx, 1);
    persistServiceDeals();
    cloudDelete('serviceDeals', id);
    renderMy();
    return true;
}

export async function requestServiceDeal(ctx, master) {
    const {
        state,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    } = ctx;

    if (!requireAuth('home')) return null;
    if (!await ensureUserPhone()) return null;

    const masterId = master && master.id ? String(master.id) : '';
    const masterPhone = master && master.phone ? String(master.phone) : '';
    const serviceTitle = master && master.title ? String(master.title) : '';
    if (!masterPhone) return null;

    const clientPhone = normalizePhone(state.session.phone);
    const masterPhoneN = normalizePhone(masterPhone);

    if (clientPhone && masterPhoneN && clientPhone === masterPhoneN) return null;

    const existing = (state.serviceDeals || []).find((d) => {
        if (!d) return false;
        if (normalizePhone(d.clientPhone) !== clientPhone) return false;
        if (normalizePhone(d.masterPhone) !== masterPhoneN) return false;
        if (masterId && String(d.serviceId || '') !== masterId) return false;
        const st = String(d.status || '');
        return st === 'Ожидает мастера' || st === 'Выполняется' || st === 'Ожидает подтверждения клиента';
    });
    if (existing) return { deal: existing, created: false };

    const deal = {
        id: String(Date.now()),
        createdAt: Date.now(),
        status: 'Ожидает мастера',
        clientPhone,
        masterPhone: masterPhoneN,
        serviceId: masterId,
        serviceTitle
    };

    state.serviceDeals = [deal, ...(state.serviceDeals || [])];
    persistServiceDeals();
    cloudUpsert('serviceDeals', deal);
    renderMy();
    return { deal, created: true };
}

export async function submitService(ctx) {
    const {
        state,
        dom,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        ensureCleanField,
        persistMasters,
        cloudUpsert,
        renderFeeds,
        setActiveScreen
    } = ctx;

    if (!requireAuth('add-service')) return;
    if (!await ensureUserPhone()) return;

    const cat = dom.inputs.serviceCat.value;
    const desc = dom.inputs.serviceDesc.value.trim();
    const priceFrom = dom.inputs.servicePrice.value ? Number(dom.inputs.servicePrice.value) : null;
    const address = dom.inputs.serviceAddress.value.trim();
    const district = dom.inputs.serviceDistrict.value.trim();

    if (!cat) {
        alert('Выберите категорию');
        return;
    }
    if (!ensureCleanField(desc, 'Описание')) return;

    const m = {
        id: String(Date.now()),
        createdAt: Date.now(),
        phone: normalizePhone(state.session.phone),
        name: state.session.name || 'Мастер',
        title: state.session.name || 'Мастер',
        cat,
        desc,
        priceFrom,
        address,
        city: state.location.city,
        district,
        rating: 0,
        ratingCount: 0
    };

    state.masters = [m, ...(state.masters || [])];
    persistMasters();
    cloudUpsert('masters', m);
    dom.forms['add-service'].reset();
    renderFeeds();
    setActiveScreen('home');
}
