// ==========================================
// 1) STATE (состояние приложения)
// ==========================================

const STORAGE_KEYS = {
    userId: 'userId',
    userPhone: 'userPhone',
    userName: 'userName',
    userAvatar: 'userAvatar',
    userProvider: 'userProvider',
    userIsAdmin: 'userIsAdmin',
    userSubActive: 'userSubActive',
    userSubUntil: 'userSubUntil',
    userRole: 'userRole',
    userCity: 'userCity',
    userDistrict: 'userDistrict',
    userLat: 'userLat',
    userLon: 'userLon',
    masters: 'masters',
    orders: 'orders',
    masterResponses: 'masterResponses',
    serviceDeals: 'serviceDeals',
    notificationsUnread: 'notificationsUnread',
    notifications: 'notifications'
};

const state = {
    session: {
        id: localStorage.getItem(STORAGE_KEYS.userId) || null,
        phone: localStorage.getItem(STORAGE_KEYS.userPhone) || null,
        name: localStorage.getItem(STORAGE_KEYS.userName) || null,
        avatar: localStorage.getItem(STORAGE_KEYS.userAvatar) || null,
        provider: localStorage.getItem(STORAGE_KEYS.userProvider) || null,
        isAdmin: localStorage.getItem(STORAGE_KEYS.userIsAdmin) === '1',
        subActive: localStorage.getItem(STORAGE_KEYS.userSubActive) === '1',
        subUntil: Number(localStorage.getItem(STORAGE_KEYS.userSubUntil)) || null
    },
    notificationsUnread: Number(localStorage.getItem(STORAGE_KEYS.notificationsUnread)) || 0,
    notifications: (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.notifications) || '[]');
        } catch {
            return [];
        }
    })(),
    userRole: localStorage.getItem(STORAGE_KEYS.userRole) || 'client',
    adminPhone: '+79509822033',
    adminCode: '1218',
    activeFeed: 'masters',
    activeChip: 'all',
    pendingAfterAuth: null,
    pendingContact: null,
    location: {
        city: localStorage.getItem(STORAGE_KEYS.userCity) || 'Красноярск',
        district: localStorage.getItem(STORAGE_KEYS.userDistrict) || '',
        lat: Number(localStorage.getItem(STORAGE_KEYS.userLat)) || null,
        lon: Number(localStorage.getItem(STORAGE_KEYS.userLon)) || null
    },
    masterResponses: (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.masterResponses) || '[]');
        } catch {
            return [];
        }
    })(),
    rating: {
        isOpen: false,
        selectedStars: 0,
        orderId: null,
        masterPhone: null
    },
    masters: (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.masters) || '[]');
        } catch {
            return [];
        }
    })(),
    orders: (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
        } catch {
            return [];
        }
    })(),
    serviceDeals: (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.serviceDeals) || '[]');
        } catch {
            return [];
        }
    })()
};

// ==========================================
// 1.5) CLOUD (Firebase / Firestore)
// ==========================================

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAaYedR9Fd_zN4JysvBkUYbil4S6xgkQhU',
    authDomain: 'sosed-9a6bc.firebaseapp.com',
    projectId: 'sosed-9a6bc',
    storageBucket: 'sosed-9a6bc.firebasestorage.app',
    messagingSenderId: '441158905440',
    appId: '1:441158905440:web:4e1a1b7b8d2355a9205d05',
    measurementId: 'G-CCTTZEVTTN'
};

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
            firebase.initializeApp(FIREBASE_CONFIG);
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

function isCloudReady() {
    return Boolean(cloud.enabled && cloud.db);
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

                    // Для мастера: при отмене клиентом assignedMasterPhone сбрасывается в null,
                    // поэтому ориентируемся на предыдущее закрепление за мной.
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

                // Если я мастер: чистим список "Откликнулся" — оставляем только реально закреплённые за мной заказы в работе.
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

async function cancelOrder(orderId, actorRole) {
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

// ==========================================
// 2) DOM (ссылки на элементы)
// ==========================================

const dom = {
    screens: {
        home: document.getElementById('screen-home'),
        profile: document.getElementById('screen-profile'),
        'create-order': document.getElementById('screen-create-order'),
        notifications: document.getElementById('screen-notifications'),
        'add-service': document.getElementById('screen-add-service'),
        my: document.getElementById('screen-my')
    },

    tabs: {
        masters: document.getElementById('tab-masters'),
        orders: document.getElementById('tab-orders')
    },
    feeds: {
        masters: document.getElementById('feed-masters'),
        orders: document.getElementById('feed-orders')
    },
    nav: {
        home: document.getElementById('nav-home'),
        my: document.getElementById('nav-my'),
        notifications: document.getElementById('nav-notifications'),
        profile: document.getElementById('nav-profile'),
        plus: document.getElementById('main-plus-btn')
    },
    header: {
        locationText: document.getElementById('header-location'),
        roleBadge: document.getElementById('header-role-badge'),
        detectLocation: document.getElementById('btn-detect-location'),
        notifications: document.getElementById('btn-notifications'),
        notifBadge: document.getElementById('notif-badge')
    },
    profile: {
        name: document.getElementById('profile-name'),
        phone: document.getElementById('profile-phone'),
        avatar: document.getElementById('profile-avatar'),
        subStatus: document.getElementById('profile-sub-status'),
        editName: document.getElementById('profile-edit-name'),
        editPhone: document.getElementById('profile-edit-phone'),
        avatarFile: document.getElementById('profile-avatar-file'),
        changeAvatar: document.getElementById('btn-profile-change-avatar'),
        save: document.getElementById('btn-profile-save'),
        subtitle: document.getElementById('profile-subtitle'),
        city: document.getElementById('profile-city'),
        district: document.getElementById('profile-district'),
        detectLocation: document.getElementById('btn-profile-detect-location'),
        roleClient: document.getElementById('btn-role-client'),
        roleMaster: document.getElementById('btn-role-master'),
        logout: document.getElementById('btn-logout'),
        subscribe: document.getElementById('btn-subscribe')
    },

    forms: {
        'create-order': document.getElementById('form-create-order'),
        'add-service': document.getElementById('form-add-service')
    },
    inputs: {
        orderTitle: document.getElementById('new-order-title'),
        orderCat: document.getElementById('new-order-cat'),
        orderPrice: document.getElementById('new-order-price'),
        orderAddress: document.getElementById('new-order-address'),
        orderCity: document.getElementById('new-order-city'),
        orderDistrict: document.getElementById('new-order-district'),
        serviceCat: document.getElementById('new-service-cat'),
        serviceDesc: document.getElementById('new-service-desc'),
        servicePrice: document.getElementById('new-service-price'),
        serviceAddress: document.getElementById('new-service-address'),
        serviceCity: document.getElementById('new-service-city'),
        serviceDistrict: document.getElementById('new-service-district')
    },
    modals: {
        auth: document.getElementById('auth-modal'),
        contact: document.getElementById('contact-modal'),
        rating: document.getElementById('rating-modal')
    },
    auth: {

        step1: document.getElementById('auth-step-1'),
        step2: document.getElementById('auth-step-2'),
        step2Text: document.getElementById('auth-step-2-text'),
        phone: document.getElementById('user-phone'),
        code: document.getElementById('sms-code'),
        next: document.getElementById('btn-auth-next'),
        detectLocation: document.getElementById('btn-auth-detect-location'),
        cancel: document.getElementById('btn-auth-cancel'),
        login: document.getElementById('btn-auth-login'),
        back: document.getElementById('btn-auth-back'),
        vk: document.getElementById('btn-auth-vk'),
        max: document.getElementById('btn-auth-max')
    },
    contact: {
        info: document.getElementById('contact-info'),
        phoneHidden: document.getElementById('contact-phone-hidden'),
        phoneShown: document.getElementById('contact-phone-shown'),
        phone: document.getElementById('contact-phone'),
        showPhone: document.getElementById('btn-contact-show-phone'),
        copyPhone: document.getElementById('btn-contact-copy-phone'),
        close: document.getElementById('btn-contact-close')
    },
    chips: {
        container: document.getElementById('category-chips')
    },
    my: {
        roleBadge: document.getElementById('my-role-badge'),
        content: document.getElementById('my-content')
    },
    rating: {
        title: document.getElementById('rating-title'),
        stars: document.getElementById('rating-stars'),
        text: document.getElementById('rating-text'),
        cancel: document.getElementById('btn-rating-cancel'),
        submit: document.getElementById('btn-rating-submit')
    },
    dialog: {
        modal: document.getElementById('dialog-modal'),
        title: document.getElementById('dialog-title'),
        text: document.getElementById('dialog-text'),
        input: document.getElementById('dialog-input'),
        ok: document.getElementById('btn-dialog-ok'),
        cancel: document.getElementById('btn-dialog-cancel')
    },
    notifications: {
        list: document.getElementById('notifications-list'),
        clear: document.getElementById('btn-notifications-clear')
    }
};

// ==========================================
// 3) HELPERS
// ==========================================

const FORBIDDEN_WORDS = ['шлюха', 'проститутка', 'эскорт', 'вызов девушки', 'секс', 'интим', 'нарко', 'гашиш','меф','спайс','гашиш','нарка', 'мяумяу', 'гашиш'
, 'вызов девушки', 'девушка по вызову', 'шмаль', 'кокс', 'какоин', 'какаин', 'кокоин' , 'наркота', 'дурь'
];

function normalizeForModeration(input) {
    let s = String(input || '').toLowerCase();
    if (!s) return '';

    s = s.replace(/ё/g, 'е');

    // Схожая латиница -> кириллица (частые обходы)
    const map = {
        a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
        i: 'и', j: 'ј'
    };
    s = s.replace(/[abcehkmoptxyij]/g, (ch) => map[ch] || ch);

    // Убираем пробелы/пунктуацию/разделители, чтобы ловить "ш л ю х а" и т.п.
    s = s.replace(/[\s\u00A0_\-.,:;|/\\'"`()\[\]{}<>!?@#$%^&*+=~]/g, '');

    // Схлопываем повторяющиеся буквы: "шлюююха" -> "шлюха"
    s = s.replace(/(.)\1{2,}/g, '$1');

    return s;
}

const FORBIDDEN_REGEX = [
    /шлюх/,
    /проститут/,
    /эскорт/,
    /интим/,
    /секс/,
    /отсос/,
    /наркот/,
    /нарко/,
    /меф/,
    /спайс/,
    /гашиш/,
    /шмал/,
    /кокс/,
    /кокаин/,
    /дурь/
];

function hasForbiddenWords(text) {
    const normalized = normalizeForModeration(text);
    if (!normalized) return false;

    for (const re of FORBIDDEN_REGEX) {
        if (re.test(normalized)) return true;
    }

    return FORBIDDEN_WORDS.some((w) => {
        const ww = normalizeForModeration(w);
        return ww && normalized.includes(ww);
    });
}

function ensureCleanField(value, fieldLabel) {
    if (!value) return true;
    if (!hasForbiddenWords(value)) return true;
    alert(`${fieldLabel} содержит недопустимые слова. Исправьте текст и попробуйте снова.`);
    return false;
}

const uiState = {
    dialog: {
        resolver: null
    },
    contact: {
        phone: null,
        title: null,
        kind: null
    },
    ordersById: {},
    serviceDealsById: {}
};

function openDialog({ title, text, okText, cancelText, input }) {
    if (!dom.dialog || !dom.dialog.modal) return Promise.resolve(false);

    if (dom.dialog.title) dom.dialog.title.textContent = title || '';
    if (dom.dialog.text) dom.dialog.text.textContent = text || '';
    if (dom.dialog.ok) dom.dialog.ok.textContent = okText || 'OK';
    if (dom.dialog.cancel) dom.dialog.cancel.textContent = cancelText || 'Отмена';

    if (dom.dialog.input) {
        if (input) {
            dom.dialog.input.classList.remove('hidden');
            dom.dialog.input.type = input.type || 'text';
            dom.dialog.input.placeholder = input.placeholder || '';
            dom.dialog.input.value = input.value || '';
        } else {
            dom.dialog.input.classList.add('hidden');
            dom.dialog.input.value = '';
        }
    }

    openModal(dom.dialog.modal);
    return new Promise((resolve) => {
        uiState.dialog.resolver = resolve;
    });
}

function closeDialog(result) {
    if (!dom.dialog || !dom.dialog.modal) return;
    closeModal(dom.dialog.modal);
    const r = uiState.dialog.resolver;
    uiState.dialog.resolver = null;
    if (typeof r === 'function') r(result);
}

function openConfirm({ title, text, okText, cancelText }) {
    return openDialog({
        title,
        text,
        okText: okText || 'OK',
        cancelText: cancelText || 'Отмена'
    }).then((v) => Boolean(v));
}

function openPrompt({ title, text, placeholder, value, type, okText, cancelText }) {
    return openDialog({
        title,
        text,
        okText: okText || 'OK',
        cancelText: cancelText || 'Отмена',
        input: {
            placeholder: placeholder || '',
            value: value || '',
            type: type || 'text'
        }
    }).then((v) => {
        if (v === false) return null;
        return String(v || '');
    });
}

function persistNotificationsUnread() {
    localStorage.setItem(STORAGE_KEYS.notificationsUnread, String(Number(state.notificationsUnread) || 0));
}

function persistNotifications() {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(state.notifications || []));
}

function renderNotificationsBadge() {
    const n = Number(state.notificationsUnread) || 0;
    if (!dom || !dom.header || !dom.header.notifBadge) return;
    if (n > 0) {
        dom.header.notifBadge.textContent = String(n);
        dom.header.notifBadge.classList.remove('hidden');
    } else {
        dom.header.notifBadge.classList.add('hidden');
    }
}

function playBellSound() {
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

function pushNotification(payload) {
    state.notificationsUnread = (Number(state.notificationsUnread) || 0) + 1;
    if (payload) {
        state.notifications = (state.notifications || []).concat(payload);
        persistNotifications();
    }
    persistNotificationsUnread();
    renderNotificationsBadge();
    playBellSound();
}

function clearNotifications() {
    state.notificationsUnread = 0;
    state.notifications = [];
    persistNotifications();
    persistNotificationsUnread();
    renderNotificationsBadge();
}

function isClean(text) {
    return !hasForbiddenWords(text);
}

function openModal(el) {
    el.classList.remove('hidden');
    el.classList.add('flex');
}

function closeModal(el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
}

function isValidPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10;
}

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    // РФ-номера: приводим к +7XXXXXXXXXX
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;

    // Иные форматы оставляем как "+" + digits, чтобы сравнения были стабильными
    return digits.startsWith('0') ? digits : `+${digits}`;
}

function isLoggedIn() {
    return Boolean(state.session && state.session.id);
}

function getUserKey() {
    if (!state.session) return null;
    return state.session.phone || state.session.id;
}

async function ensureUserPhone() {
    if (state.session && state.session.phone && isValidPhone(state.session.phone)) return true;
    if (!isLoggedIn()) return false;

    const userPhone = await openPrompt({
        title: 'Номер телефона',
        text: 'Укажите номер телефона для связи',
        placeholder: '+7...',
        value: state.session.phone || '+7',
        type: 'tel',
        okText: 'Сохранить',
        cancelText: 'Отмена'
    });

    if (!userPhone) return false;
    if (!isValidPhone(userPhone)) {
        await openConfirm({ title: 'Ошибка', text: 'Введите корректный номер телефона', okText: 'OK', cancelText: 'Закрыть' });
        return false;
    }

    setSession({ phone: normalizePhone(userPhone) });
    renderProfile();
    return true;
}

function hasSubscription() {
    if (!state.session) return false;
    if (!state.session.subActive) return false;
    const until = Number(state.session.subUntil);
    if (!Number.isFinite(until) || until <= 0) return false;
    return Date.now() < until;
}

function getSubscriptionDaysLeft() {
    if (!hasSubscription()) return 0;
    const until = Number(state.session.subUntil);
    const msLeft = until - Date.now();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

async function requireSubscription(contextLabel) {
    if (!isLoggedIn()) return false;
    if (hasSubscription()) return true;

    const text = contextLabel
        ? `Подписка не активна.\n\nДействие: ${contextLabel}`
        : 'Подписка не активна.';

    const ok = await openConfirm({
        title: 'Подписка',
        text,
        okText: 'Оформить (тест)',
        cancelText: 'Отмена'
    });
    if (!ok) return false;

    const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
    setSession({ subActive: true, subUntil: until });
    renderProfile();
    return true;
}

function setSession(patch) {
    state.session = { ...state.session, ...patch };

    if (state.session.id) localStorage.setItem(STORAGE_KEYS.userId, state.session.id);
    else localStorage.removeItem(STORAGE_KEYS.userId);

    if (state.session.phone) localStorage.setItem(STORAGE_KEYS.userPhone, state.session.phone);
    else localStorage.removeItem(STORAGE_KEYS.userPhone);

    if (state.session.name) localStorage.setItem(STORAGE_KEYS.userName, state.session.name);
    else localStorage.removeItem(STORAGE_KEYS.userName);

    if (state.session.avatar) localStorage.setItem(STORAGE_KEYS.userAvatar, state.session.avatar);
    else localStorage.removeItem(STORAGE_KEYS.userAvatar);

    if (state.session.provider) localStorage.setItem(STORAGE_KEYS.userProvider, state.session.provider);
    else localStorage.removeItem(STORAGE_KEYS.userProvider);

    localStorage.setItem(STORAGE_KEYS.userIsAdmin, state.session.isAdmin ? '1' : '0');

    localStorage.setItem(STORAGE_KEYS.userSubActive, state.session.subActive ? '1' : '0');

    if (state.session.subUntil) localStorage.setItem(STORAGE_KEYS.userSubUntil, String(state.session.subUntil));
    else localStorage.removeItem(STORAGE_KEYS.userSubUntil);
}

function formatPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('ru-RU');
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function persistOrders() {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders || []));
}

function persistMasters() {
    localStorage.setItem(STORAGE_KEYS.masters, JSON.stringify(state.masters || []));
}

function persistServiceDeals() {
    localStorage.setItem(STORAGE_KEYS.serviceDeals, JSON.stringify(state.serviceDeals || []));
}

function persistResponses() {
    localStorage.setItem(STORAGE_KEYS.masterResponses, JSON.stringify(state.masterResponses || []));
}

function requireAuth(pendingScreen) {
    if (isLoggedIn()) return true;
    state.pendingAfterAuth = pendingScreen || null;
    openAuthModal();
    return false;
}

function applyRoleUI() {
    if (dom.profile && dom.profile.roleClient && dom.profile.roleMaster) {
        const isClient = state.userRole === 'client';
        dom.profile.roleClient.className = `flex-1 py-2 rounded-lg font-bold text-sm ${isClient ? 'role-active' : 'role-inactive'}`;
        dom.profile.roleMaster.className = `flex-1 py-2 rounded-lg font-bold text-sm ${!isClient ? 'role-active' : 'role-inactive'}`;
    }
    if (dom.header && dom.header.roleBadge) {
        dom.header.roleBadge.textContent = state.userRole === 'master' ? 'Мастер' : 'Клиент';
    }
    if (dom.my && dom.my.roleBadge) {
        dom.my.roleBadge.textContent = state.userRole === 'master' ? 'Мастер' : 'Клиент';
    }
}

function setRole(role) {
    const next = role === 'master' ? 'master' : 'client';
    state.userRole = next;
    localStorage.setItem(STORAGE_KEYS.userRole, next);
    applyRoleUI();
    renderFeeds();
    if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
}

function renderLocationUI() {
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

function renderProfile() {
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

function handlePlusClick() {
    if (!requireAuth('plus')) return;
    if (state.userRole === 'master') setActiveScreen('add-service');
    else setActiveScreen('create-order');
}

function renderRatingLine(item) {
    const rating = Number(item && item.rating);
    const count = Number(item && item.ratingCount);
    if (!rating || !count) return '';
    return `<div class="text-xs text-gray-500 mt-1">⭐ ${escapeHtml(String(rating))} (${escapeHtml(String(count))})</div>`;
}

function renderMastersFeed() {
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
                ${renderRatingLine(m)}
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

function renderOrdersFeed() {
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

function renderStatusBadge(status) {
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

function renderMy() {
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

    // --- Мои (как клиент) ---
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
                    ${renderStatusBadge(st)}
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
                    ${renderStatusBadge(st)}
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

    // --- Мои (как мастер) ---
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
                    ${renderStatusBadge(st)}
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
                    ${renderStatusBadge(st)}
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

function renderFeeds() {
    renderMastersFeed();
    renderOrdersFeed();
}

function openContactModal({ phone, title, kind }) {
    uiState.contact.phone = phone || null;
    uiState.contact.title = title || null;
    uiState.contact.kind = kind || null;
    if (dom.contact && dom.contact.info) dom.contact.info.textContent = title ? `Контакт: ${title}` : 'Контакт';
    if (dom.contact.phone) dom.contact.phone.textContent = '';
    if (dom.contact.phoneHidden) dom.contact.phoneHidden.classList.remove('hidden');
    if (dom.contact.phoneShown) dom.contact.phoneShown.classList.add('hidden');
    openModal(dom.modals.contact);
}

function closeContactModal() {
    uiState.contact.phone = null;
    uiState.contact.title = null;
    uiState.contact.kind = null;
    closeModal(dom.modals.contact);
}

async function acceptOrder(orderId) {
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

async function handleFeedClick(e) {
    const btnDelete = e.target.closest('button[data-action="delete"]');
    if (btnDelete) {
        if (!state.session || !state.session.isAdmin) return;

        const kind = String(btnDelete.dataset.kind || '');
        const id = String(btnDelete.dataset.id || '');

        if (kind === 'order') {
            const order = (state.orders || []).find((o) => String(o.id) === id);
            if (!order) return;
            const st = String(order.status || 'Активен').trim();
            if (st === 'Выполняется' || st.startsWith('Ожидает подтверждения')) {
                alert('Нельзя удалить заказ, пока он в работе. Сначала завершите или отмените выполнение.');
                return;
            }
            const ok = await openConfirm({
                title: 'Удалить заказ?',
                text: `Заказ: ${String(order.title || '')}`,
                okText: 'Удалить',
                cancelText: 'Отмена'
            });
            if (!ok) return;
            const idx = (state.orders || []).findIndex((o) => String(o.id) === id);
            if (idx >= 0) state.orders.splice(idx, 1);
            persistOrders();
            cloudDelete('orders', id);
            renderFeeds();
            if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
            return;
        }

        if (kind === 'master') {
            const m = (state.masters || []).find((x) => String(x.id) === id);
            const ok = await openConfirm({
                title: 'Удалить услугу мастера?',
                text: m ? `Услуга: ${String(m.title || m.name || '')}` : 'Удалить?',
                okText: 'Удалить',
                cancelText: 'Отмена'
            });
            if (!ok) return;
            const idx = (state.masters || []).findIndex((x) => String(x.id) === id);
            if (idx >= 0) state.masters.splice(idx, 1);
            persistMasters();
            cloudDelete('masters', id);
            renderFeeds();
            if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();
            return;
        }

        return;
    }

    const btn = e.target.closest('button[data-action="contact"]');
    if (!btn) return;

    const kind = String(btn.dataset.kind || '');
    const id = String(btn.dataset.id || '');
    const phone = String(btn.dataset.phone || '');
    const title = String(btn.dataset.title || '');

    if (kind === 'order') {
        if (state.userRole !== 'master') {
            const okSwitch = await openConfirm({
                title: 'Нужна роль «Мастер»',
                text: 'Чтобы откликнуться на заказ, переключитесь в роль «Мастер». Переключить сейчас?',
                okText: 'Переключить',
                cancelText: 'Отмена'
            });
            if (!okSwitch) return;
            setRole('master');
        }
        const ok = await openConfirm({
            title: 'Принять заказ?',
            text: `Заказ: ${title}`,
            okText: 'Принять',
            cancelText: 'Отмена'
        });
        if (!ok) return;
        const accepted = await acceptOrder(id);
        if (!accepted) return;
        pushNotification({ ts: Date.now(), kind: 'order_taken', orderId: id, title, text: `✅ Вы приняли заказ: ${title}` });
        openContactModal({ phone: normalizePhone(phone), title, kind: 'order' });
        renderFeeds();
        return;
    }

    if (kind === 'master') {
        if (state.userRole !== 'client') {
            const okSwitch = await openConfirm({
                title: 'Нужна роль «Клиент»',
                text: 'Чтобы связаться с мастером, переключитесь в роль «Клиент». Переключить сейчас?',
                okText: 'Переключить',
                cancelText: 'Отмена'
            });
            if (!okSwitch) return;
            setRole('client');
        }
        if (!requireAuth('my')) return;
        if (!await ensureUserPhone()) return;

        const masterPhone = normalizePhone(phone);
        const clientPhone = normalizePhone(state.session.phone);

        const dealExists = (state.serviceDeals || []).some((d) => (
            normalizePhone(d.masterPhone) === masterPhone
            && normalizePhone(d.clientPhone) === clientPhone
            && String(d.status || '') !== 'Отменен'
        ));

        if (!dealExists) {
            const deal = {
                id: String(Date.now()),
                createdAt: Date.now(),
                status: 'Ожидает мастера',
                serviceTitle: title,
                masterPhone,
                masterName: title,
                clientPhone,
                clientName: state.session.name || 'Клиент'
            };
            state.serviceDeals = (state.serviceDeals || []).concat(deal);
            persistServiceDeals();
            cloudUpsert('serviceDeals', deal);
        }

        openContactModal({ phone: masterPhone, title, kind: 'master' });
        renderMy();
        return;
    }
}

async function submitOrder() {
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

async function submitService() {
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

function setActiveScreen(screen) {
    Object.values(dom.screens).forEach((el) => el.classList.add('hidden'));
    dom.screens[screen].classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-gray-400');
        if (btn.dataset.target === screen) btn.classList.add('text-blue-600');
    });

    if (screen === 'home') renderFeeds();
    if (screen === 'my') renderMy();
    if (screen === 'notifications') renderNotificationsScreen();
}

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

function setActiveFeed(feed) {
    state.activeFeed = feed;
    const isMasters = feed === 'masters';
    dom.tabs.masters.className = `flex-1 py-2 rounded-xl text-sm font-bold ${isMasters ? 'tab-active' : 'tab-inactive'}`;
    dom.tabs.orders.className = `flex-1 py-2 rounded-xl text-sm font-bold ${!isMasters ? 'tab-active' : 'tab-inactive'}`;
    dom.feeds.masters.classList.toggle('hidden', !isMasters);
    dom.feeds.orders.classList.toggle('hidden', isMasters);
}

async function handleMyClick(e) {
    const btnFinish = e.target.closest('button[data-action="deal-finish"]');
    if (btnFinish) {
        const id = btnFinish.dataset.id;
        const order = state.orders.find((o) => o.id === id);
        if (!order) return;
        order.status = 'Ожидает подтверждения';
        persistOrders();
        cloudUpsert('orders', order);
        renderMy();
        renderFeeds();
        return;
    }

    const btnConfirm = e.target.closest('button[data-action="deal-confirm"]');
    if (btnConfirm) {
        const id = btnConfirm.dataset.id;
        const order = state.orders.find((o) => o.id === id);
        if (!order) return;
        if (!order.assignedMasterPhone) {
            alert('Нет данных о мастере для оценки');
            return;
        }
        openRatingModal(order.id, order.assignedMasterPhone, order.title);
        return;
    }

    const btnCancelMaster = e.target.closest('button[data-action="deal-cancel-master"]');
    if (btnCancelMaster) {
        const id = String(btnCancelMaster.dataset.id || '');
        const ok = await openConfirm({
            title: 'Отказаться от выполнения?',
            text: 'Заказ вернётся в ленту и станет доступен другим мастерам.',
            okText: 'Отказаться',
            cancelText: 'Отмена'
        });
        if (!ok) return;
        await cancelOrder(id, 'master');
        return;
    }

    const btnCancelClient = e.target.closest('button[data-action="deal-cancel-client"]');
    if (btnCancelClient) {
        const id = String(btnCancelClient.dataset.id || '');
        const ok = await openConfirm({
            title: 'Отказаться от услуги?',
            text: 'Заказ снова появится в ленте, чтобы другие мастера могли откликнуться.',
            okText: 'Вернуть в ленту',
            cancelText: 'Отмена'
        });
        if (!ok) return;
        await cancelOrder(id, 'client');
        return;
    }

    const btnDelete = e.target.closest('button[data-action="service-delete"]');
    if (btnDelete) {
        const id = btnDelete.dataset.id;
        const userPhone = normalizePhone(getUserKey());
        const idx = state.masters.findIndex((m) => m.id === id && (state.session.isAdmin || normalizePhone(m.phone) === userPhone));
        if (idx >= 0) state.masters.splice(idx, 1);
        persistMasters();
        cloudDelete('masters', id);
        renderMy();
        renderFeeds();
        return;
    }

    const btnOrderDelete = e.target.closest('button[data-action="order-delete"]');
    if (btnOrderDelete) {
        const id = btnOrderDelete.dataset.id;
        const idx = state.orders.findIndex((o) => o.id === id && (state.session.isAdmin || normalizePhone(o.phone) === normalizePhone(getUserKey())));
        const order = idx >= 0 ? state.orders[idx] : null;
        if (order && !state.session.isAdmin) {
            const st = String(order.status || 'Активен').trim();
            if (st === 'Выполняется' || st.startsWith('Ожидает подтверждения')) {
                alert('Удалить заказ нельзя, пока он в работе. Сначала завершите или отмените выполнение.');
                return;
            }
        }
        if (idx >= 0) state.orders.splice(idx, 1);
        persistOrders();
        cloudDelete('orders', id);
        renderMy();
        renderFeeds();
        return;
    }

    const btnDealAccept = e.target.closest('button[data-action="service-deal-accept"]');
    if (btnDealAccept) {
        const id = String(btnDealAccept.dataset.id || '');
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
        if (!deal) return;
        deal.status = 'Выполняется';
        persistServiceDeals();
        cloudUpsert('serviceDeals', deal);
        renderMy();
        return;
    }

    const btnDealDecline = e.target.closest('button[data-action="service-deal-decline"]');
    if (btnDealDecline) {
        const id = String(btnDealDecline.dataset.id || '');
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
        if (!deal) return;
        deal.status = 'Отказан';
        persistServiceDeals();
        cloudUpsert('serviceDeals', deal);
        renderMy();
        return;
    }

    const btnDealFinish = e.target.closest('button[data-action="service-deal-finish"]');
    if (btnDealFinish) {
        const id = String(btnDealFinish.dataset.id || '');
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
        if (!deal) return;
        deal.status = 'Ожидает подтверждения клиента';
        persistServiceDeals();
        cloudUpsert('serviceDeals', deal);
        renderMy();
        return;
    }

    const btnDealConfirmClient = e.target.closest('button[data-action="service-deal-confirm"]');
    if (btnDealConfirmClient) {
        const id = String(btnDealConfirmClient.dataset.id || '');
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
        if (!deal) return;
        if (!deal.masterPhone) {
            alert('Нет данных о мастере для оценки');
            return;
        }
        openRatingModalForServiceDeal(deal.id, deal.masterPhone, deal.serviceTitle || 'Услуга');
        return;
    }

    const btnDealCancelClient = e.target.closest('button[data-action="service-deal-cancel-client"]');
    if (btnDealCancelClient) {
        const id = String(btnDealCancelClient.dataset.id || '');
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === id);
        if (!deal) return;
        const ok = await openConfirm({
            title: 'Отменить заявку?',
            text: 'Заявка будет отменена и уйдёт в историю.',
            okText: 'Отменить',
            cancelText: 'Назад'
        });
        if (!ok) return;
        deal.status = 'Отменен';
        persistServiceDeals();
        cloudUpsert('serviceDeals', deal);
        renderMy();
        return;
    }

    const btnDealDelete = e.target.closest('button[data-action="service-deal-delete"]');
    if (btnDealDelete) {
        const id = String(btnDealDelete.dataset.id || '');
        const idx = (state.serviceDeals || []).findIndex((d) => String(d.id) === id);
        if (idx >= 0) state.serviceDeals.splice(idx, 1);
        persistServiceDeals();
        cloudDelete('serviceDeals', id);
        renderMy();
        return;
    }
}

// ==========================================
// 5.6) RATING MODAL
// ==========================================

function openRatingModal(orderId, masterPhone, title) {
    state.rating.isOpen = true;
    state.rating.selectedStars = 0;
    state.rating.orderId = orderId;
    state.rating.dealId = null;
    state.rating.masterPhone = masterPhone;
    dom.rating.title.textContent = `Заказ: ${title}`;
    dom.rating.text.value = '';
    updateRatingStarsUI();
    openModal(dom.modals.rating);
}

function openRatingModalForServiceDeal(dealId, masterPhone, title) {
    state.rating.isOpen = true;
    state.rating.selectedStars = 0;
    state.rating.orderId = null;
    state.rating.dealId = dealId;
    state.rating.masterPhone = masterPhone;
    dom.rating.title.textContent = `Услуга: ${title}`;
    dom.rating.text.value = '';
    updateRatingStarsUI();
    openModal(dom.modals.rating);
}

function closeRatingModal() {
    state.rating.isOpen = false;
    state.rating.selectedStars = 0;
    state.rating.orderId = null;
    state.rating.dealId = null;
    state.rating.masterPhone = null;
    closeModal(dom.modals.rating);
}

function updateRatingStarsUI() {
    const selected = state.rating.selectedStars;
    dom.rating.stars.querySelectorAll('button[data-star]').forEach((btn) => {
        const n = Number(btn.dataset.star);
        btn.innerHTML = n <= selected ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    });
}

function submitRating() {
    const stars = state.rating.selectedStars;
    if (!stars || stars < 1 || stars > 5) {
        alert('Поставьте оценку от 1 до 5');
        return;
    }

    const reviewText = dom.rating && dom.rating.text ? String(dom.rating.text.value || '').trim() : '';
    const phone = state.rating.masterPhone;
    const mastersToUpdate = state.masters.filter((m) => m.phone === phone);
    mastersToUpdate.forEach((m) => {
        const count = Number(m.ratingCount) || 0;
        const old = Number(m.rating) || 0;
        const next = (old * count + stars) / (count + 1);
        m.rating = Math.round(next * 10) / 10;
        m.ratingCount = count + 1;
        if (reviewText) {
            m.lastReviewText = reviewText;
            m.lastReviewStars = stars;
            m.lastReviewAt = Date.now();
        }
        cloudUpsert('masters', m);
    });

    const dealId = state.rating.dealId;
    if (dealId) {
        const deal = (state.serviceDeals || []).find((d) => String(d.id) === String(dealId));
        if (deal) {
            deal.status = 'Завершен';
            persistMasters();
            persistServiceDeals();
            cloudUpsert('serviceDeals', deal);
        }
    } else {
        const order = state.orders.find((o) => o.id === state.rating.orderId);
        if (!order) {
            closeRatingModal();
            return;
        }
        order.status = 'Завершен';
        persistMasters();
        persistOrders();
        cloudUpsert('orders', order);
    }

    closeRatingModal();
    renderFeeds();
    renderMy();
}

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json'
        }
    });
    if (!res.ok) throw new Error('Reverse geocoding failed');
    return res.json();
}

async function detectLocation() {
    if (!navigator.geolocation) {
        alert('Геолокация не поддерживается в этом браузере');
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            const data = await reverseGeocode(lat, lon);
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.state || 'Красноярск';
            const district = addr.suburb || addr.city_district || addr.neighbourhood || '';

            state.location.city = city;
            state.location.district = district;
            state.location.lat = lat;
            state.location.lon = lon;

            localStorage.setItem(STORAGE_KEYS.userCity, city);
            localStorage.setItem(STORAGE_KEYS.userDistrict, district);
            localStorage.setItem(STORAGE_KEYS.userLat, String(lat));
            localStorage.setItem(STORAGE_KEYS.userLon, String(lon));

            renderLocationUI();
            renderFeeds();
            if (!dom.screens.my.classList.contains('hidden')) renderMy();
        } catch (e) {
            console.error(e);
            alert('Не удалось определить район. Попробуйте позже.');
        }
    }, () => {
        alert('Доступ к геолокации запрещён');
    }, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
    });
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.userPhone);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.userName);
    localStorage.removeItem(STORAGE_KEYS.userAvatar);
    localStorage.removeItem(STORAGE_KEYS.userProvider);
    localStorage.removeItem(STORAGE_KEYS.userIsAdmin);
    localStorage.removeItem(STORAGE_KEYS.userSubActive);
    localStorage.removeItem(STORAGE_KEYS.userSubUntil);
    state.session = {
        id: null,
        phone: null,
        name: null,
        avatar: null,
        provider: null,
        isAdmin: false,
        subActive: false,
        subUntil: null
    };
    renderProfile();
}

// ==========================================
// 6) AUTH MODAL
// ==========================================

function openAuthModal() {
    dom.auth.step1.classList.remove('hidden');
    dom.auth.step2.classList.add('hidden');
    dom.auth.code.value = '';
    openModal(dom.modals.auth);
}

function closeAuthModal() {
    closeModal(dom.modals.auth);
    state.pendingAfterAuth = null;
    state.pendingContact = null;
}

async function authSendCode() {
    const phone = dom.auth.phone.value.trim();
    if (!isValidPhone(phone)) {
        await openConfirm({ title: 'Ошибка', text: 'Введите корректный номер телефона', okText: 'OK', cancelText: 'Закрыть' });
        return;
    }
    
    // ПРОВЕРКА АДМИНА: Только номер из state.adminPhone может идти дальше
    if (normalizePhone(phone) !== state.adminPhone) {
        await openConfirm({ title: 'Вход', text: 'Вход по номеру временно недоступен. Пожалуйста, используйте VK или MAX.', okText: 'OK', cancelText: 'Закрыть' });
        dom.auth.phone.value = "+7"; 
        return;
    }

    dom.auth.step2Text.textContent = `Код отправлен на номер ${phone}`;
    dom.auth.step1.classList.add('hidden');
    dom.auth.step2.classList.remove('hidden');

    console.log(`Код для входа: ${state.adminCode}`);
}

function authBackToPhone() {
    dom.auth.step2.classList.add('hidden');
    dom.auth.step1.classList.remove('hidden');
    dom.auth.code.value = '';
}

// Вход через социальные сервисы (VK / MAX)
async function authViaSocial(platform) {
    const platformName = platform === 'vk' ? 'VK ID' : 'MAX';
    const name = await openPrompt({
        title: platformName,
        text: 'Как вас зовут?',
        placeholder: 'Имя',
        value: state.session.name || '',
        okText: 'Продолжить',
        cancelText: 'Отмена'
    });
    if (!name || !String(name).trim()) {
        await openConfirm({ title: 'Ошибка', text: 'Имя обязательно', okText: 'OK', cancelText: 'Закрыть' });
        return;
    }

    if (!ensureCleanField(name, 'Имя')) return;

    let phone = null;
    const wantPhone = await openConfirm({
        title: platformName,
        text: 'Добавить номер телефона для связи сейчас?',
        okText: 'Да',
        cancelText: 'Нет'
    });
    if (wantPhone) {
        const userPhone = await openPrompt({
            title: 'Номер телефона',
            text: 'Введите номер телефона',
            placeholder: '+7...',
            value: state.session.phone || '+7',
            type: 'tel',
            okText: 'Сохранить',
            cancelText: 'Отмена'
        });
        if (userPhone && isValidPhone(userPhone)) phone = normalizePhone(userPhone);
        else if (userPhone) {
            await openConfirm({ title: 'Ошибка', text: 'Введите корректный номер телефона', okText: 'OK', cancelText: 'Закрыть' });
            return;
        }
    }

    finalizeLogin({
        id: `${platform}_${Date.now()}`,
        provider: platform,
        name: String(name).trim(),
        phone,
        isAdmin: false
    });
}

// Проверка СМС-кода для админа
async function authVerify() {
    const phone = dom.auth.phone.value.trim();
    const code = dom.auth.code.value.trim();

    // Если код верный — вызываем функцию входа
    if (code === state.adminCode && normalizePhone(phone) === state.adminPhone) {
        finalizeLogin({
            id: state.adminPhone,
            provider: 'admin',
            name: state.session.name || 'Администратор',
            phone: state.adminPhone,
            isAdmin: true
        });
    } else {
        await openConfirm({ title: 'Ошибка', text: `Неверный код. Попробуйте ${state.adminCode}`, okText: 'OK', cancelText: 'Закрыть' });
    }
}

function finalizeLogin(payload) {
    const patch = {
        id: payload.id,
        provider: payload.provider || null,
        name: payload.name || null,
        phone: payload.phone || null,
        isAdmin: Boolean(payload.isAdmin)
    };
    setSession(patch);

    closeModal(dom.modals.auth);
    renderProfile(); // Это обновит экран профиля и покажет номер
    renderFeeds();
    if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();

    // Если мы открыли модалку для какого-то действия (например, "+"), продолжаем его
    const pending = state.pendingAfterAuth;
    state.pendingAfterAuth = null;
    if (pending === 'plus') {
        handlePlusClick();
    } else if (pending) {
        setActiveScreen(pending);
    }
}

function saveProfileFromForm() {
    if (!isLoggedIn()) {
        alert('Сначала войдите');
        return;
    }

    const name = dom.profile.editName ? dom.profile.editName.value.trim() : '';

    if (!name) {
        alert('Укажите имя');
        return;
    }

    if (!ensureCleanField(name, 'Имя')) return;

    let phone = null;
    const phoneRaw = dom.profile.editPhone ? dom.profile.editPhone.value.trim() : '';

    if (phoneRaw) {
        if (!isValidPhone(phoneRaw)) {
            alert('Введите корректный номер телефона');
            return;
        }
        phone = normalizePhone(phoneRaw);
    }

    setSession({ name, phone });
    renderProfile();
    alert('Профиль сохранён');
}

function handleAvatarPick() {
    if (!isLoggedIn()) {
        alert('Сначала войдите');
        return;
    }
    if (dom.profile.avatarFile) dom.profile.avatarFile.click();
}

function handleAvatarFileChange() {
    const file = dom.profile.avatarFile && dom.profile.avatarFile.files && dom.profile.avatarFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl.startsWith('data:image/')) {
            alert('Неверный формат файла');
            return;
        }
        setSession({ avatar: dataUrl });
        renderProfile();
    };
    reader.readAsDataURL(file);
}

// ==========================================
// 7) EVENTS (подписки)
// ==========================================

dom.nav.home.addEventListener('click', () => setActiveScreen('home'));
dom.nav.my.addEventListener('click', () => {
    if (!requireAuth('my')) return;
    setActiveScreen('my');
});
if (dom.nav.notifications) {
    dom.nav.notifications.addEventListener('click', () => setActiveScreen('notifications'));
}
dom.nav.profile.addEventListener('click', () => {
    renderProfile();
    setActiveScreen('profile');
});
dom.nav.plus.addEventListener('click', handlePlusClick);

// --- Табы (Мастера / Заказы) ---
dom.tabs.masters.addEventListener('click', () => {
    state.activeFeed = 'masters';
    setActiveFeed('masters');
});
dom.tabs.orders.addEventListener('click', () => {
    state.activeFeed = 'orders';
    setActiveFeed('orders');
});

// --- Профиль и Роли ---
dom.profile.roleClient.addEventListener('click', () => setRole('client'));
dom.profile.roleMaster.addEventListener('click', () => setRole('master'));
dom.profile.logout.addEventListener('click', logout);

if (dom.profile.subscribe) {
    dom.profile.subscribe.addEventListener('click', () => {
        if (!requireAuth('subscribe')) return;
        (async () => {
            if (hasSubscription()) {
                const days = getSubscriptionDaysLeft();
                await openConfirm({
                    title: 'Подписка',
                    text: days > 0 ? `Подписка уже активна. Осталось дней: ${days}` : 'Подписка уже активна.',
                    okText: 'OK',
                    cancelText: 'Закрыть'
                });
                return;
            }

            const ok = await openConfirm({
                title: 'Подписка на 30 дней',
                text: 'Срок действия: 30 дней.\nСтоимость: 150 ₽ в месяц.\n\nОформить подписку? (тестовый режим)',
                okText: 'Оформить',
                cancelText: 'Отмена'
            });
            if (!ok) return;
            const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
            setSession({ subActive: true, subUntil: until });
            renderProfile();
        })();
    });
}

if (dom.profile.district) {
    dom.profile.district.addEventListener('input', () => {
        const v = dom.profile.district.value.trim();
        if (!ensureCleanField(v, 'Район')) return;
        state.location.district = v;
        localStorage.setItem(STORAGE_KEYS.userDistrict, state.location.district);
        renderLocationUI();
        renderFeeds();
        if (!dom.screens.my.classList.contains('hidden')) renderMy();
    });
}

// --- Формы создания ---
dom.forms['create-order'].addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitOrder();
});
dom.forms['add-service'].addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitService();
});

// --- Авторизация (ГЛАВНОЕ) ---
dom.auth.next.addEventListener('click', authSendCode);
if (dom.auth.detectLocation) dom.auth.detectLocation.addEventListener('click', detectLocation);
dom.auth.cancel.addEventListener('click', closeAuthModal);
dom.auth.back.addEventListener('click', authBackToPhone);
dom.auth.login.addEventListener('click', authVerify);

// Кнопки соцсетей (теперь они работают сами по себе, а не внутри чипов)
if (dom.auth.vk) dom.auth.vk.addEventListener('click', () => authViaSocial('vk'));
if (dom.auth.max) dom.auth.max.addEventListener('click', () => authViaSocial('max'));

dom.modals.auth.addEventListener('click', (e) => {
    if (e.target === dom.modals.auth) closeAuthModal();
});

// --- Контакты ---
dom.contact.close.addEventListener('click', closeContactModal);
dom.modals.contact.addEventListener('click', (e) => {
    if (e.target === dom.modals.contact) closeContactModal();
});

if (dom.contact.showPhone) {
    dom.contact.showPhone.addEventListener('click', async () => {
        if (!uiState.contact.phone) return;
        if (uiState.contact.kind === 'order') {
            if (!hasSubscription()) {
                const ok = await requireSubscription('Показ телефона');
                if (!ok) return;
            }
        }

        if (dom.contact.phone) dom.contact.phone.textContent = uiState.contact.phone;
        if (dom.contact.phoneHidden) dom.contact.phoneHidden.classList.add('hidden');
        if (dom.contact.phoneShown) dom.contact.phoneShown.classList.remove('hidden');
    });
}

if (dom.contact.copyPhone) {
    dom.contact.copyPhone.addEventListener('click', async () => {
        const p = uiState.contact.phone;
        if (!p) return;
        try {
            await navigator.clipboard.writeText(p);
            await openConfirm({ title: 'Готово', text: 'Номер скопирован', okText: 'OK', cancelText: 'Закрыть' });
        } catch {
            await openConfirm({ title: 'Ошибка', text: 'Не удалось скопировать номер', okText: 'OK', cancelText: 'Закрыть' });
        }
    });
}

// --- Геолокация (в шапке и профиле) ---
if (dom.header.detectLocation) dom.header.detectLocation.addEventListener('click', detectLocation);
if (dom.profile.detectLocation) dom.profile.detectLocation.addEventListener('click', detectLocation);

// --- Уведомления (колокольчик) ---
if (dom.header.notifications) {
    dom.header.notifications.addEventListener('click', () => setActiveScreen('notifications'));
}

if (dom.notifications && dom.notifications.clear) {
    dom.notifications.clear.addEventListener('click', () => {
        clearNotifications();
        renderNotificationsScreen();
    });
}

// --- Dialog modal ---
if (dom.dialog && dom.dialog.ok) {
    dom.dialog.ok.addEventListener('click', () => {
        const hasInput = dom.dialog.input && !dom.dialog.input.classList.contains('hidden');
        closeDialog(hasInput ? dom.dialog.input.value : true);
    });
}

if (dom.dialog && dom.dialog.cancel) {
    dom.dialog.cancel.addEventListener('click', () => closeDialog(false));
}

if (dom.dialog && dom.dialog.modal) {
    dom.dialog.modal.addEventListener('click', (e) => {
        if (e.target === dom.dialog.modal) closeDialog(false);
    });
}

// --- Профиль: сохранить / сменить аватар ---
if (dom.profile.save) dom.profile.save.addEventListener('click', saveProfileFromForm);
if (dom.profile.changeAvatar) dom.profile.changeAvatar.addEventListener('click', handleAvatarPick);
if (dom.profile.avatarFile) dom.profile.avatarFile.addEventListener('change', handleAvatarFileChange);

// --- Чипы категорий ---
if (dom.chips.container) {
    dom.chips.container.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-chip]');
        if (!btn) return;
        state.activeChip = btn.dataset.chip;

        dom.chips.container.querySelectorAll('button[data-chip]').forEach((b) => {
            const isActive = b.dataset.chip === state.activeChip;
            b.classList.toggle('tab-active', isActive);
            b.classList.toggle('tab-inactive', !isActive);
        });

        renderFeeds();
    });
}

// --- Управление "Моими" заказами ---
dom.my.content.addEventListener('click', handleMyClick);

// --- Рейтинг и отзывы ---
dom.rating.stars.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-star]');
    if (!btn) return;
    state.rating.selectedStars = Number(btn.dataset.star);
    updateRatingStarsUI();
});
dom.rating.cancel.addEventListener('click', closeRatingModal);
dom.rating.submit.addEventListener('click', submitRating);
dom.modals.rating.addEventListener('click', (e) => {
    if (e.target === dom.modals.rating) closeRatingModal();
});

// --- Ленты (Клик по кнопкам "Связаться" или "Удалить") ---
dom.feeds.masters.addEventListener('click', handleFeedClick);
dom.feeds.orders.addEventListener('click', handleFeedClick);

// ==========================================
// 8) INIT
// ==========================================

initCloud();
renderProfile();
applyRoleUI();
renderLocationUI();
renderNotificationsBadge();
renderFeeds();
setActiveScreen('home');

startCloudSubscriptions();
