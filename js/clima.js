// CLIMA DEL DÍA (Open-Meteo, gratis y sin clave)
// Usa la ubicación del celular; si no la permiten, usa Lima.
const CLIMA_LIMA = { lat: -12.0464, lon: -77.0428 };
const CLIMA_CACHE_MIN = 10;

function iconoClima(codigo, esDia) {
    if (codigo === 0) return esDia ? '☀️' : '🌙';
    if (codigo <= 2) return esDia ? '🌤️' : '☁️';
    if (codigo === 3) return '☁️';
    if (codigo === 45 || codigo === 48) return '🌫️';
    if (codigo >= 51 && codigo <= 67) return '🌧️';
    if (codigo >= 71 && codigo <= 77) return '❄️';
    if (codigo >= 80 && codigo <= 82) return '🌦️';
    if (codigo >= 95) return '⛈️';
    return '🌡️';
}

function mostrarClima(datos) {
    const el = document.getElementById('clima');
    if (!el || !datos) return;
    el.innerText = ` · ${iconoClima(datos.codigo, datos.esDia)} ${Math.round(datos.temp)}°C`;
    el.classList.remove('d-none');
}

function obtenerUbicacion() {
    return new Promise((resolve) => {
        try {
            const guardada = JSON.parse(localStorage.getItem('ornela_ubicacion'));
            if (guardada) return resolve(guardada);
        } catch (e) {}
        if (!navigator.geolocation) return resolve(CLIMA_LIMA);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const ubic = { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2) };
                try { localStorage.setItem('ornela_ubicacion', JSON.stringify(ubic)); } catch (e) {}
                resolve(ubic);
            },
            () => resolve(CLIMA_LIMA),
            { timeout: 8000, maximumAge: 3600000 }
        );
    });
}

async function actualizarClima() {
    try {
        const cache = JSON.parse(localStorage.getItem('ornela_clima'));
        if (cache && Date.now() - cache.hora < CLIMA_CACHE_MIN * 60000) return mostrarClima(cache);
    } catch (e) {}

    try {
        const { lat, lon } = await obtenerUbicacion();
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
        const json = await res.json();
        const datos = { temp: json.current.temperature_2m, codigo: json.current.weather_code, esDia: json.current.is_day === 1, hora: Date.now() };
        try { localStorage.setItem('ornela_clima', JSON.stringify(datos)); } catch (e) {}
        mostrarClima(datos);
    } catch (e) {
        // Sin internet: simplemente no se muestra el clima
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarClima();
    setInterval(actualizarClima, CLIMA_CACHE_MIN * 60000);
});
