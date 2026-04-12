// ==========================================
// 1) STATE (состояние приложения)
// ==========================================

import { dom } from './js/dom.js';
import {
    uiState,
    openModal,
    closeModal,
    openDialog,
    closeDialog,
    openConfirm,
    openPrompt,
    isValidPhone,
    normalizePhone
} from './js/ui.js';
import { formatPrice, escapeHtml } from './js/utils.js';
import { openContactModal, closeContactModal } from './js/contact.js';
import {
    persistNotificationsUnread as persistNotificationsUnreadLib,
    persistNotifications as persistNotificationsLib,
    renderNotificationsBadge as renderNotificationsBadgeLib,
    pushNotification as pushNotificationLib,
    clearNotifications as clearNotificationsLib
} from './js/notifications.js';
import {
    renderLocationUI as renderLocationUILib,
    renderProfile as renderProfileLib,
    renderFeeds as renderFeedsLib,
    renderMastersFeed as renderMastersFeedLib,
    renderOrdersFeed as renderOrdersFeedLib,
    renderMy as renderMyLib,
    renderStatusBadge as renderStatusBadgeLib
} from './js/render.js';
import {
    acceptOrder as acceptOrderLib,
    submitOrder as submitOrderLib,
    submitService as submitServiceLib,
    cancelOrder as cancelOrderLib,
    acceptServiceDeal as acceptServiceDealLib,
    declineServiceDeal as declineServiceDealLib,
    finishServiceDeal as finishServiceDealLib,
    cancelServiceDealAsClient as cancelServiceDealAsClientLib,
    deleteServiceDeal as deleteServiceDealLib,
    requestServiceDeal as requestServiceDealLib
} from './js/actions.js';
import { createCloudController } from './js/cloud.js';
import {
    STORAGE_KEYS,
    state,
    isLoggedIn,
    getUserKey,
    hasSubscription,
    getSubscriptionDaysLeft,
    setSession,
    persistOrders,
    persistMasters,
    persistServiceDeals,
    persistResponses
} from './js/state.js';
import { initEvents } from './js/events.js';
import { createAuthController } from './js/auth.js';
import { createRatingController } from './js/rating.js';
import { createLocationController } from './js/location.js';
import { createNotificationsScreenController } from './js/notificationsScreen.js';
import { ensureCleanField, hasForbiddenWords } from './js/moderation.js';

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

const cloudController = createCloudController({
    firebaseConfig: FIREBASE_CONFIG,
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
});

function initCloud() {
    return cloudController.initCloud();
}

function isCloudReady() {
    return cloudController.isCloudReady();
}

function startCloudSubscriptions() {
    return cloudController.startCloudSubscriptions();
}

async function cloudUpsert(kind, item) {
    return cloudController.cloudUpsert(kind, item);
}

async function cloudDelete(kind, id) {
    return cloudController.cloudDelete(kind, id);
}

async function cloudCancelOrderTransaction(orderId, actorRole, actorPhone) {
    return cloudController.cloudCancelOrderTransaction(orderId, actorRole, actorPhone);
}

async function cancelOrder(orderId, actorRole) {
    return cancelOrderLib({
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
    }, orderId, actorRole);
}

async function acceptServiceDeal(dealId) {
    return acceptServiceDealLib({
        state,
        normalizePhone,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    }, dealId);
}

async function declineServiceDeal(dealId) {
    return declineServiceDealLib({
        state,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    }, dealId);
}

async function finishServiceDeal(dealId) {
    return finishServiceDealLib({
        state,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    }, dealId);
}

async function cancelServiceDealAsClient(dealId) {
    return cancelServiceDealAsClientLib({
        state,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    }, dealId);
}

async function deleteServiceDeal(dealId) {
    return deleteServiceDealLib({
        state,
        persistServiceDeals,
        cloudDelete,
        renderMy
    }, dealId);
}

async function requestServiceDeal(masterId) {
    const m = (state.masters || []).find((x) => String(x.id) === String(masterId));
    if (!m) return null;
    const res = await requestServiceDealLib({
        state,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        persistServiceDeals,
        cloudUpsert,
        renderMy
    }, m);
    if (res && res.created === false) {
        await openConfirm({
            title: 'Заявка уже отправлена',
            text: 'Эта заявка уже активна. Дождитесь ответа мастера в разделе «Мои».',
            okText: 'OK',
            cancelText: 'Закрыть'
        });
    }
    openContactModal({ phone: normalizePhone(m.phone), title: m.title, kind: 'master' });
    return res;
}

// ==========================================
// 3) HELPERS
// ==========================================

function persistNotificationsUnread() {
    persistNotificationsUnreadLib({ STORAGE_KEYS, state });
}

function persistNotifications() {
    persistNotificationsLib({ STORAGE_KEYS, state });
}

function renderNotificationsBadge() {
    renderNotificationsBadgeLib({ state });
}

function pushNotification(payload) {
    pushNotificationLib({ STORAGE_KEYS, state, payload });
}

function clearNotifications() {
    clearNotificationsLib({ STORAGE_KEYS, state });
}

function isClean(text) {
    return !hasForbiddenWords(text);
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

const authController = createAuthController({
    dom,
    state,
    isLoggedIn,
    openModal,
    closeModal,
    openConfirm,
    openPrompt,
    isValidPhone,
    normalizePhone,
    ensureCleanField,
    setSession,
    renderProfile,
    renderFeeds,
    renderMy,
    handlePlusClick,
    setActiveScreen,
    hasSubscription
});

const {
    openAuthModal,
    closeAuthModal,
    authSendCode,
    authBackToPhone,
    authVerify,
    authViaSocial,
    requireAuth,
    requireSubscription
} = authController;

const ratingController = createRatingController({
    dom,
    state,
    openModal,
    closeModal,
    cloudUpsert,
    persistMasters,
    persistOrders,
    persistServiceDeals,
    renderFeeds,
    renderMy
});

const {
    openRatingModal,
    openRatingModalForServiceDeal,
    closeRatingModal,
    updateRatingStarsUI,
    submitRating
} = ratingController;

const locationController = createLocationController({
    state,
    STORAGE_KEYS,
    renderLocationUI: renderLocationUILib,
    renderFeeds: renderFeedsLib,
    renderMy: renderMyLib,
    dom
});

const { detectLocation } = locationController;

const notificationsScreenController = createNotificationsScreenController({
    dom,
    state,
    escapeHtml,
    persistNotificationsUnread,
    renderNotificationsBadge
});

const { renderNotificationsScreen } = notificationsScreenController;

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
    renderLocationUILib({ state, dom, escapeHtml });
}

function renderProfile() {
    renderProfileLib({
        state,
        dom,
        isLoggedIn,
        hasSubscription,
        getSubscriptionDaysLeft,
        applyRoleUI
    });
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
    renderMastersFeedLib({ state, dom, escapeHtml, formatPrice });
}

function renderOrdersFeed() {
    renderOrdersFeedLib({ state, dom, escapeHtml, formatPrice });
}

function renderStatusBadge(status) {
    return renderStatusBadgeLib({ escapeHtml }, status);
}

function renderMy() {
    renderMyLib({ state, dom, escapeHtml, formatPrice, normalizePhone, requireAuth, applyRoleUI });
}

function renderFeeds() {
    renderFeedsLib({ state, dom, escapeHtml, formatPrice });
}

async function acceptOrder(orderId) {
    return acceptOrderLib({
        state,
        requireAuth,
        ensureUserPhone,
        normalizePhone,
        persistOrders,
        persistResponses,
        cloudUpsert
    }, orderId);
}

async function handleFeedClick(e) {
    const btnDelete = e.target.closest('button[data-action="delete"]');
    if (btnDelete) {
        // ...
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
        if (state.session && state.session.phone && normalizePhone(phone) === normalizePhone(state.session.phone)) {
            await openConfirm({
                title: 'Нельзя откликнуться на своё',
                text: 'Вы не можете связаться с собственной услугой.',
                okText: 'OK',
                cancelText: 'Закрыть'
            });
            return;
        }

        if (state.userRole === 'master') {
            const okSwitch = await openConfirm({
                title: 'Нужна роль «Клиент»',
                text: 'Чтобы связаться с мастером, переключитесь в роль «Клиент». Переключить сейчас?',
                okText: 'Переключить',
                cancelText: 'Отмена'
            });
            if (!okSwitch) return;
            setRole('client');
        }

        const ok = await openConfirm({
            title: 'Отправить заявку мастеру?',
            text: 'Мастер получит уведомление и сможет принять или отклонить заявку в разделе «Мои».',
            okText: 'Отправить',
            cancelText: 'Отмена'
        });
        if (!ok) return;

        const res = await requestServiceDeal(id);
        if (res && res.created === false) {
            await openConfirm({
                title: 'Заявка уже отправлена',
                text: 'Эта заявка уже активна. Дождитесь ответа мастера в разделе «Мои».',
                okText: 'OK',
                cancelText: 'Закрыть'
            });
        }
        openContactModal({ phone: normalizePhone(phone), title, kind: 'master' });
        return;
    }
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
        openRatingModal(id, order.assignedMasterPhone, order.title);
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
        if (state.userRole !== 'master') {
            const okSwitch = await openConfirm({
                title: 'Нужна роль «Мастер»',
                text: 'Чтобы принять заявку, переключитесь в роль «Мастер». Переключить сейчас?',
                okText: 'Переключить',
                cancelText: 'Отмена'
            });
            if (!okSwitch) return;
            setRole('master');
        }
        const ok = await acceptServiceDeal(id);
        if (!ok) alert('Не удалось принять заявку. Проверьте, что это ваша заявка и она ещё ожидает вас.');
        return;
    }

    const btnDealDecline = e.target.closest('button[data-action="service-deal-decline"]');
    if (btnDealDecline) {
        const id = String(btnDealDecline.dataset.id || '');
        await declineServiceDeal(id);
        return;
    }

    const btnDealFinish = e.target.closest('button[data-action="service-deal-finish"]');
    if (btnDealFinish) {
        const id = String(btnDealFinish.dataset.id || '');
        await finishServiceDeal(id);
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
        await cancelServiceDealAsClient(id);
        return;
    }

    const btnDealDelete = e.target.closest('button[data-action="service-deal-delete"]');
    if (btnDealDelete) {
        const id = String(btnDealDelete.dataset.id || '');
        await deleteServiceDeal(id);
        return;
    }
}

async function submitOrder() {
    return submitOrderLib({
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
    });
}

async function submitService() {
    return submitServiceLib({
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
    });
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

function setActiveFeed(feed) {
    state.activeFeed = feed;
    const isMasters = feed === 'masters';
    dom.tabs.masters.className = `flex-1 py-2 rounded-xl text-sm font-bold ${isMasters ? 'tab-active' : 'tab-inactive'}`;
    dom.tabs.orders.className = `flex-1 py-2 rounded-xl text-sm font-bold ${!isMasters ? 'tab-active' : 'tab-inactive'}`;
    dom.feeds.masters.classList.toggle('hidden', !isMasters);
    dom.feeds.orders.classList.toggle('hidden', isMasters);
}

async function logout() {
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

initEvents({
    dom,
    uiState,
    STORAGE_KEYS,
    state,
    setActiveScreen,
    requireAuth,
    renderProfile,
    handlePlusClick,
    setActiveFeed,
    setRole,
    logout,
    hasSubscription,
    ensureCleanField,
    ensureUserPhone,
    submitOrder,
    submitService,
    authSendCode,
    detectLocation,
    closeAuthModal,
    authBackToPhone,
    authVerify,
    authViaSocial,
    closeContactModal,
    openConfirm,
    clearNotifications,
    renderNotificationsScreen,
    closeDialog,
    saveProfileFromForm,
    handleAvatarPick,
    handleAvatarFileChange,
    handleMyClick,
    updateRatingStarsUI,
    closeRatingModal,
    submitRating,
    handleFeedClick,
    renderFeeds,
    renderMy,
    renderLocationUI,
    renderNotificationsBadge,
    renderStatusBadge,
    requireSubscription
});

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
