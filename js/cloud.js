export function createCloudController(ctx) {
    const {
        firebaseConfig,
        uiState,
        state,
        dom,
        normalizePhone,
        pushNotification,
        persistOrders,
        persistMasters,
        persistServiceDeals,
        persistResponses,
        renderFeeds,
        renderMy
    } = ctx;

    let cloud = {
        enabled: false,
        db: null,
        unsubOrders: null,
        unsubMasters: null,
        unsubServiceDeals: null
    };

    function ensureFirebaseSdkLoaded() {
        const appUrl = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js';
        const fsUrl = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js';

        const hasApp = Boolean(document.querySelector(`script[src="${appUrl}"]`));
        const hasFs = Boolean(document.querySelector(`script[src="${fsUrl}"]`));
        if (hasApp && hasFs) return;

        if (!hasApp) {
            const s = document.createElement('script');
            s.src = appUrl;
            s.async = false;
            s.onload = () => {
                console.log('Firebase app SDK loaded');
                setTimeout(initCloud, 0);
            };
            s.onerror = (e) => console.error('Failed to load Firebase app SDK', e);
            document.head.appendChild(s);
        }
        if (!hasFs) {
            const s = document.createElement('script');
            s.src = fsUrl;
            s.async = false;
            s.onload = () => {
                console.log('Firebase Firestore SDK loaded');
                setTimeout(initCloud, 0);
            };
            s.onerror = (e) => console.error('Failed to load Firebase Firestore SDK', e);
            document.head.appendChild(s);
        }
    }

    function isCloudReady() {
        return Boolean(cloud.enabled && cloud.db);
    }

    async function cloudUpsert(kind, item) {
        if (!isCloudReady()) {
            console.warn('cloudUpsert skipped: cloud is not ready', { kind, hasDb: Boolean(cloud.db), enabled: cloud.enabled });
            return;
        }
        if (!item || !item.id) {
            console.warn('cloudUpsert skipped: missing item or id', { kind, item });
            return;
        }
        const createdAt = Number(item.createdAt) || Date.now();
        try {
            await cloud.db.collection(kind).doc(String(item.id)).set({ ...item, createdAt }, { merge: true });
        } catch (e) {
            console.error(`cloudUpsert(${kind}) failed`, e);
        }
    }

    async function cloudDelete(kind, id) {
        if (!isCloudReady()) {
            console.warn('cloudDelete skipped: cloud is not ready', { kind, id, hasDb: Boolean(cloud.db), enabled: cloud.enabled });
            return;
        }

        if (!id) {
            console.warn('cloudDelete skipped: missing id', { kind, id });
            return;
        }
        try {
            await cloud.db.collection(kind).doc(String(id)).delete();
        } catch (e) {
            console.error(`cloudDelete(${kind}) failed`, e);
        }
    }

    async function cloudCancelOrderTransaction(orderId, actorRole, actorPhone) {
        if (!isCloudReady()) return false;
        try {
            const ref = cloud.db.collection('orders').doc(String(orderId));
            await cloud.db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new Error('not_found');
                const data = snap.data() || {};

                const status = String(data.status || 'Активен');
                if (status !== 'Выполняется') throw new Error('not_in_progress');

                const orderClientPhone = normalizePhone(data.phone);
                const assigned = normalizePhone(data.assignedMasterPhone);
                const actor = normalizePhone(actorPhone);

                if (actorRole === 'master') {
                    if (!assigned || assigned !== actor) throw new Error('not_assigned_to_you');
                } else if (actorRole === 'client') {
                    if (!orderClientPhone || orderClientPhone !== actor) throw new Error('not_your_order');
                } else {
                    throw new Error('bad_actor');
                }

                tx.update(ref, {
                    status: 'Активен',
                    assignedMasterPhone: null,
                    createdAt: Date.now(),
                    time: 'Только что'
                });
            });
            return true;
        } catch (e) {
            console.warn('cloudCancelOrderTransaction failed', e);
            return false;
        }
    }

    function startCloudSubscriptions() {
        if (!isCloudReady()) return;

        if (typeof cloud.unsubOrders === 'function') cloud.unsubOrders();
        if (typeof cloud.unsubMasters === 'function') cloud.unsubMasters();
        if (typeof cloud.unsubServiceDeals === 'function') cloud.unsubServiceDeals();

        cloud.unsubOrders = cloud.db
            .collection('orders')
            .onSnapshot((snap) => {
                const next = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

                try {
                    const prevById = uiState.ordersById || {};
                    const nextById = {};

                    const myPhone = state.session && state.session.phone ? normalizePhone(state.session.phone) : null;

                    for (const o of next) {
                        nextById[String(o.id)] = o;
                        if (!myPhone) continue;

                        const prev = prevById[String(o.id)];
                        if (!prev) continue;
                        const prevStatus = String(prev.status || 'Активен');
                        const nextStatus = String(o.status || 'Активен');
                        if (prevStatus === nextStatus) continue;

                        const isMyClientOrder = normalizePhone(o.phone) === myPhone;
                        const isMyAssigned = normalizePhone(o.assignedMasterPhone) === myPhone;
                        const wasMyAssigned = normalizePhone(prev.assignedMasterPhone) === myPhone;

                        if (isMyClientOrder) {
                            if (nextStatus === 'Выполняется') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'order_accepted',
                                    orderId: String(o.id),
                                    title: String(o.title || ''),
                                    text: `✅ Заказ принят: ${String(o.title || '')}`
                                });
                            } else if (nextStatus === 'Активен') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'order_back_to_feed',
                                    orderId: String(o.id),
                                    title: String(o.title || ''),
                                    text: `❌ От заказа отказались. Он снова в ленте: ${String(o.title || '')}`
                                });
                            }
                        }

                        if (wasMyAssigned || isMyAssigned) {
                            if (nextStatus === 'Активен') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'order_canceled',
                                    orderId: String(o.id),
                                    title: String(o.title || ''),
                                    text: `❌ Клиент отказался. Заказ снова в ленте: ${String(o.title || '')}`
                                });
                            }
                        }
                    }

                    if (state.userRole === 'master' && myPhone && Array.isArray(state.masterResponses)) {
                        const nextResponses = state.masterResponses
                            .map((id) => String(id))
                            .filter((id) => {
                                const o = nextById[id];
                                if (!o) return false;
                                if (String(o.status || '') !== 'Выполняется') return false;
                                return normalizePhone(o.assignedMasterPhone) === myPhone;
                            });

                        const prev = JSON.stringify(state.masterResponses.map((x) => String(x)));
                        const now = JSON.stringify(nextResponses);
                        if (prev !== now) {
                            state.masterResponses = nextResponses;
                            persistResponses();
                        }
                    }

                    uiState.ordersById = nextById;
                } catch (e) {
                    console.warn('order status notify failed', e);
                }

                state.orders = next;
                persistOrders();
                renderFeeds();
                if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
            }, (err) => {
                console.error('orders snapshot error', err);
            });

        cloud.unsubMasters = cloud.db
            .collection('masters')
            .onSnapshot((snap) => {
                state.masters = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
                persistMasters();
                renderFeeds();
                if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
            }, (err) => {
                console.error('masters snapshot error', err);
            });

        cloud.unsubServiceDeals = cloud.db
            .collection('serviceDeals')
            .onSnapshot((snap) => {
                const next = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

                try {
                    const prevById = uiState.serviceDealsById || {};
                    const nextById = {};
                    const myPhone = state.session && state.session.phone ? normalizePhone(state.session.phone) : null;

                    for (const deal of next) {
                        nextById[String(deal.id)] = deal;
                        if (!myPhone) continue;

                        const prev = prevById[String(deal.id)];
                        const isMyAsClient = normalizePhone(deal.clientPhone) === myPhone;
                        const isMyAsMaster = normalizePhone(deal.masterPhone) === myPhone;

                        if (!prev) {
                            const st = String(deal.status || '');
                            if (isMyAsMaster && st === 'Ожидает мастера') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_new',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Новый отклик на вашу услугу: ${String(deal.serviceTitle || '')}`
                                });
                            }
                            if (isMyAsClient && st === 'Ожидает мастера') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_created',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Заявка отправлена мастеру: ${String(deal.serviceTitle || '')}`
                                });
                            }
                            continue;
                        }

                        const prevStatus = String(prev.status || '');
                        const nextStatus = String(deal.status || '');
                        if (prevStatus === nextStatus) continue;

                        if (isMyAsClient) {
                            if (nextStatus === 'Выполняется') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_accepted',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Мастер принял заявку: ${String(deal.serviceTitle || '')}`
                                });
                            } else if (nextStatus === 'Отказан') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_declined',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `❌ Мастер отказал по заявке: ${String(deal.serviceTitle || '')}`
                                });
                            } else if (nextStatus === 'Ожидает подтверждения клиента') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_finish_request',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Мастер отметил работу завершённой: ${String(deal.serviceTitle || '')}`
                                });
                            } else if (nextStatus === 'Завершен') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_done',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Заявка завершена: ${String(deal.serviceTitle || '')}`
                                });
                            }
                        }

                        if (isMyAsMaster) {
                            if (nextStatus === 'Ожидает мастера') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_new',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Новый отклик на вашу услугу: ${String(deal.serviceTitle || '')}`
                                });
                            } else if (nextStatus === 'Отменен') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_canceled',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `❌ Клиент отменил заявку: ${String(deal.serviceTitle || '')}`
                                });
                            } else if (nextStatus === 'Завершен') {
                                pushNotification({
                                    ts: Date.now(),
                                    kind: 'service_deal_done_master',
                                    orderId: String(deal.id),
                                    title: String(deal.serviceTitle || ''),
                                    text: `✅ Клиент подтвердил завершение: ${String(deal.serviceTitle || '')}`
                                });
                            }
                        }
                    }

                    uiState.serviceDealsById = nextById;
                } catch (e) {
                    console.warn('serviceDeals notify failed', e);
                }

                state.serviceDeals = next;
                persistServiceDeals();
                if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
            }, (err) => {
                console.error('serviceDeals snapshot error', err);
            });
    }

    function initCloud() {
        if (typeof firebase === 'undefined') {
            if (!cloud._initRetries) cloud._initRetries = 0;
            if (!cloud._sdkInjected) {
                cloud._sdkInjected = true;
                ensureFirebaseSdkLoaded();
            }
            if (cloud._initRetries < 30) {
                if (cloud._initRetries === 0) console.warn('Firebase SDK not loaded yet: retrying initCloud...');
                cloud._initRetries += 1;
                setTimeout(initCloud, 250);
            } else {
                console.warn('Firebase SDK not loaded: cloud sync disabled');
            }
            return;
        }

        if (typeof firebase.firestore !== 'function') {
            if (!cloud._fsRetries) cloud._fsRetries = 0;
            if (!cloud._sdkInjected) {
                cloud._sdkInjected = true;
                ensureFirebaseSdkLoaded();
            }
            if (cloud._fsRetries < 30) {
                if (cloud._fsRetries === 0) console.warn('Firestore SDK not loaded yet: retrying initCloud...');
                cloud._fsRetries += 1;
                setTimeout(initCloud, 250);
            } else {
                console.warn('Firestore SDK not loaded: cloud sync disabled');
            }
            return;
        }

        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            cloud.db = firebase.firestore();
            cloud.enabled = true;

            console.log('Cloud ready: Firestore initialized');

            startCloudSubscriptions();

            cloud.db.collection('_meta').doc('ping').set({ t: Date.now() }, { merge: true })
                .then(() => console.log('Firestore ping: OK'))
                .catch((e) => console.error('Firestore ping: FAILED', e));
        } catch (e) {
            console.error('Firebase init failed', e);
            cloud.enabled = false;
            cloud.db = null;
        }
    }

    return {
        initCloud,
        startCloudSubscriptions,
        isCloudReady,
        cloudUpsert,
        cloudDelete,
        cloudCancelOrderTransaction
    };
}
