import { dom } from './dom.js';
import { uiState, openModal, closeModal } from './ui.js';

export function openContactModal({ phone, title, kind }) {
    uiState.contact.phone = phone || null;
    uiState.contact.title = title || null;
    uiState.contact.kind = kind || null;
    if (dom.contact && dom.contact.info) dom.contact.info.textContent = title ? `Контакт: ${title}` : 'Контакт';
    if (dom.contact.phone) dom.contact.phone.textContent = '';
    if (dom.contact.phoneHidden) dom.contact.phoneHidden.classList.remove('hidden');
    if (dom.contact.phoneShown) dom.contact.phoneShown.classList.add('hidden');
    openModal(dom.modals.contact);
}

export function closeContactModal() {
    uiState.contact.phone = null;
    uiState.contact.title = null;
    uiState.contact.kind = null;
    closeModal(dom.modals.contact);
}
