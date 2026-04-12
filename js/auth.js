export function createAuthController(ctx) {
    const {
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
    } = ctx;

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
            dom.auth.phone.value = '+7';
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
        renderProfile();
        renderFeeds();
        if (dom.screens && dom.screens.my && !dom.screens.my.classList.contains('hidden')) renderMy();

        const pending = state.pendingAfterAuth;
        state.pendingAfterAuth = null;
        if (pending === 'plus') {
            handlePlusClick();
        } else if (pending) {
            setActiveScreen(pending);
        }
    }

    function requireAuth(pendingScreen) {
        if (isLoggedIn()) return true;
        state.pendingAfterAuth = pendingScreen || null;
        openAuthModal();
        return false;
    }

    async function requireSubscription(reason) {
        if (!requireAuth('subscribe')) return false;
        if (hasSubscription()) return true;

        const ok = await openConfirm({
            title: 'Нужна подписка',
            text: reason ? `Для действия «${reason}» нужна подписка. Оформить сейчас?` : 'Для этого действия нужна подписка. Оформить сейчас?',
            okText: 'Оформить',
            cancelText: 'Отмена'
        });
        if (!ok) return false;

        const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
        setSession({ subActive: true, subUntil: until });
        renderProfile();
        return true;
    }

    return {
        openAuthModal,
        closeAuthModal,
        authSendCode,
        authBackToPhone,
        authViaSocial,
        authVerify,
        finalizeLogin,
        requireAuth,
        requireSubscription
    };
}
