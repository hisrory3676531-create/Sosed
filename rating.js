export function createRatingController(ctx) {
    const {
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
    } = ctx;

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

    return {
        openRatingModal,
        openRatingModalForServiceDeal,
        closeRatingModal,
        updateRatingStarsUI,
        submitRating
    };
}
