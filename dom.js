export const dom = {
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
