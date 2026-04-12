export const STORAGE_KEYS = {
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

export const state = {
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
        dealId: null,
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

export function isLoggedIn() {
    return Boolean(state.session && state.session.id);
}

export function getUserKey() {
    if (!state.session) return null;
    return state.session.phone || state.session.id;
}

export function hasSubscription() {
    if (!state.session) return false;
    if (!state.session.subActive) return false;
    const until = Number(state.session.subUntil);
    if (!Number.isFinite(until) || until <= 0) return false;
    return Date.now() < until;
}

export function getSubscriptionDaysLeft() {
    if (!hasSubscription()) return 0;
    const until = Number(state.session.subUntil);
    const msLeft = until - Date.now();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

export function setSession(patch) {
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

export function persistOrders() {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders || []));
}

export function persistMasters() {
    localStorage.setItem(STORAGE_KEYS.masters, JSON.stringify(state.masters || []));
}

export function persistServiceDeals() {
    localStorage.setItem(STORAGE_KEYS.serviceDeals, JSON.stringify(state.serviceDeals || []));
}

export function persistResponses() {
    localStorage.setItem(STORAGE_KEYS.masterResponses, JSON.stringify(state.masterResponses || []));
}
