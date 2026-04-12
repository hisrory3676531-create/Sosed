export function initEvents(ctx) {
    const {
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
    } = ctx;

    // --- Навигация ---
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
                    await openConfirm({ title: 'Подписка', text: 'Подписка уже активна', okText: 'OK', cancelText: 'Закрыть' });
                    return;
                }
                await requireSubscription('Оформление подписки');
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

    // --- Авторизация ---
    dom.auth.next.addEventListener('click', authSendCode);
    if (dom.auth.detectLocation) dom.auth.detectLocation.addEventListener('click', detectLocation);
    dom.auth.cancel.addEventListener('click', closeAuthModal);
    dom.auth.back.addEventListener('click', authBackToPhone);
    dom.auth.login.addEventListener('click', authVerify);

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

    // --- Геолокация ---
    if (dom.header.detectLocation) dom.header.detectLocation.addEventListener('click', detectLocation);
    if (dom.profile.detectLocation) dom.profile.detectLocation.addEventListener('click', detectLocation);

    // --- Уведомления ---
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

    // --- Управление "Моими" ---
    dom.my.content.addEventListener('click', handleMyClick);

    // --- Рейтинг ---
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

    // --- Ленты ---
    dom.feeds.masters.addEventListener('click', handleFeedClick);
    dom.feeds.orders.addEventListener('click', handleFeedClick);
}
