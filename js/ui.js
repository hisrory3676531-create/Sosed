import { dom } from './dom.js';

export const uiState = {
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

export function openModal(el) {
    el.classList.remove('hidden');
    el.classList.add('flex');
}

export function closeModal(el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
}

export function openDialog({ title, text, okText, cancelText, input }) {
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

export function closeDialog(result) {
    if (!dom.dialog || !dom.dialog.modal) return;
    closeModal(dom.dialog.modal);
    const r = uiState.dialog.resolver;
    uiState.dialog.resolver = null;
    if (typeof r === 'function') r(result);
}

export function openConfirm({ title, text, okText, cancelText }) {
    return openDialog({
        title,
        text,
        okText: okText || 'OK',
        cancelText: cancelText || 'Отмена'
    }).then((v) => Boolean(v));
}

export function openPrompt({ title, text, placeholder, value, type, okText, cancelText }) {
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

export function isValidPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10;
}

export function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;

    return digits.startsWith('0') ? digits : `+${digits}`;
}
