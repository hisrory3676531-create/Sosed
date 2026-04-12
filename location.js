export function createLocationController(ctx) {
    const {
        state,
        STORAGE_KEYS,
        renderLocationUI,
        renderFeeds,
        renderMy,
        dom
    } = ctx;

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

    return {
        detectLocation
    };
}
