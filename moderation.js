export function escapeRegExp(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeForModeration(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const FORBIDDEN_WORDS = ['шлюха', 'проститутка', 'эскорт', 'вызов девушки', 'секс', 'интим', 'нарко', 'гашиш', 'меф', 'спайс', 'гашиш', 'нарка', 'мяумяу', 'гашиш',
    'вызов девушки', 'девушка по вызову', 'шмаль', 'кокс', 'какоин', 'какаин', 'кокоин', 'наркота', 'дурь'
];

const FORBIDDEN_REGEX = FORBIDDEN_WORDS
    .map((w) => normalizeForModeration(w))
    .filter(Boolean)
    .map((w) => new RegExp(escapeRegExp(w).replace(/\s+/g, '\\s*'), 'i'));

export function hasForbiddenWords(text) {
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

export function ensureCleanField(value, fieldLabel) {
    if (!value) return true;
    if (!hasForbiddenWords(value)) return true;
    alert(`${fieldLabel} содержит недопустимые слова. Исправьте текст и попробуйте снова.`);
    return false;
}
