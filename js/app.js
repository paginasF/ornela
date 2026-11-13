let sectionToClear = null;
let ultimoAvance = null;
let ultimaCelebracion = 0;
let state = {
    puesto: 'Puesto 1',
    inicio: { carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', text: '', timestamp: null, generated: false },
    yapes: [],
    yapes_horas: [],
    turno_inicio: null,
    yapes_text: '',
    yape_timestamp: null,
    needs: {
        cucharas_chicas: '', cucharas_grandes: '', servilletas: '', sorbetes: '', bolsas_chicas: '', bolsas_medianas: '',
        carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '',
        tapas_8: '', tapas_12: '', tapas_medio: '', tapas_litro: '',
        lejia: false, trapo: false, detergente: false, guantes: false, text: '', timestamp: null, generated: false
    },
    ingresos: {
        cucharas_chicas: '', cucharas_grandes: '', servilletas: '', sorbetes: '', bolsas_chicas: '', bolsas_medianas: '',
        carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '',
        tapas_8: '', tapas_12: '', tapas_medio: '', tapas_litro: '',
        lejia: false, trapo: false, detergente: false, guantes: false, text: '', timestamp: null, generated: false
    },
    gastos: { bebidas: false, sueldo: false, cochera: false, guarderia: false, sueldo_personas: '', otros_detalle: '', text: '', timestamp: null, generated: false },
    fin: { carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', efectivo: '', text: '', timestamp: null, generated: false }
};

window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 600);
    }, 1000);

    const saved = localStorage.getItem('ornela_arqueo_v25');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            // Fusionamos cuidadosamente para asegurar integridad de cada sección
            for (const key in parsed) {
                const def = state[key], val = parsed[key];
                if (def && typeof def === 'object' && !Array.isArray(def) && val && typeof val === 'object') {
                    state[key] = { ...def, ...val };
                } else {
                    state[key] = val;
                }
            }
        } catch(e){}
    }

    // Yapes guardados antes de existir la hora: se completan vacíos para no desalinear
    while (state.yapes_horas.length < state.yapes.length) state.yapes_horas.push('');
    if (!state.turno_inicio) {
        state.turno_inicio = Date.now();
        localStorage.setItem('ornela_arqueo_v25', JSON.stringify(state));
    }

    restoreFormValues();
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
    renderYapesList();
    toggleSueldoInput();
    checkFinLockState();
    updateStatusBadges();
    mantenerPantallaEncendida();

    const modalFinEl = document.getElementById('modalFin');
    if (modalFinEl) {
        modalFinEl.addEventListener('show.bs.modal', () => {
            checkFinLockState();
            const totalYape = state.yapes.reduce((acc, curr) => acc + curr, 0);
            document.getElementById('fin_monto_yape').value = totalYape > 0 ? totalYape.toFixed(2) : '';
        });
    }

    document.addEventListener('click', (e) => {
        const dropdownContainer = document.querySelector('.custom-puesto-dropdown');
        if (dropdownContainer && !dropdownContainer.contains(e.target)) {
            document.getElementById('puestoDropdownMenu').classList.remove('show');
        }
    });
});

function scrollToInforme(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

function togglePuestoDropdown() {
    const menu = document.getElementById('puestoDropdownMenu');
    menu.classList.toggle('show');
}

function seleccionarPuesto(puesto, guardar = true) {
    state.puesto = puesto;
    document.getElementById('puesto_selected_text').innerText = puesto;
    document.getElementById('greeting_puesto').innerText = puesto;
    
    const items = document.querySelectorAll('.puesto-dropdown-item');
    items.forEach(item => {
        const spanText = item.querySelector('span').innerText;
        const checkIcon = item.querySelector('.check-icon');
        if (spanText === puesto) {
            item.classList.add('active');
            checkIcon.classList.remove('d-none');
        } else {
            item.classList.remove('active');
            checkIcon.classList.add('d-none');
        }
    });
    
    document.getElementById('puestoDropdownMenu').classList.remove('show');
    // Al restaurar no se guarda: los campos aún están vacíos y borrarían lo guardado
    if (guardar) saveState();
}

function checkFinLockState() {
    const isInicioDone = state.inicio.generated || hasDataInicio();
    const fields = document.querySelectorAll('.fin-field');
    const notice = document.getElementById('fin_blocked_notice');
    fields.forEach(el => { el.disabled = !isInicioDone; });
    if (notice) {
        if (!isInicioDone) notice.classList.remove('d-none');
        else notice.classList.add('d-none');
    }
}

function toggleSueldoInput() {
    const isChecked = document.getElementById('gasto_sueldo').checked;
    const inputPers = document.getElementById('gasto_sueldo_personas');
    inputPers.disabled = !isChecked;
    if (!isChecked) inputPers.value = '';
}

function updateStatusBadges() {
    const bInicio = document.getElementById('badge_status_inicio');
    const bYapes = document.getElementById('badge_status_yapes');
    const bNeeds = document.getElementById('badge_status_needs');
    const bIngresos = document.getElementById('badge_status_ingresos');
    const bGastos = document.getElementById('badge_status_gastos');
    const bFin = document.getElementById('badge_status_fin');

    if (state.inicio.generated) bInicio.classList.remove('d-none'); else bInicio.classList.add('d-none');
    if (hasDataYapes()) bYapes.classList.remove('d-none'); else bYapes.classList.add('d-none');
    if (state.needs.generated) bNeeds.classList.remove('d-none'); else bNeeds.classList.add('d-none');
    if (state.ingresos.generated) bIngresos.classList.remove('d-none'); else bIngresos.classList.add('d-none');
    if (state.gastos.generated) bGastos.classList.remove('d-none'); else bGastos.classList.add('d-none');
    if (state.fin.generated) bFin.classList.remove('d-none'); else bFin.classList.add('d-none');
    document.getElementById('dash_yape_label').innerText = state.yapes.length === 1 ? 'pago' : 'pagos';

    // RESUMEN SUPERIOR (Efectivo y avance del día)
    const efectivo = parseFloat(state.fin.efectivo) || 0;
    document.getElementById('dash_efectivo').innerText = `S/ ${efectivo.toFixed(2)}`;
    const hechos = [state.inicio.generated, hasDataYapes(), state.needs.generated, state.ingresos.generated, state.gastos.generated, state.fin.generated].filter(Boolean).length;
    document.getElementById('dash_progreso').innerText = `${hechos}/6`;
    document.getElementById('dash_progreso_bar').style.width = `${(hechos / 6) * 100}%`;

    // Ícono verde en las secciones listas y resaltado en el siguiente paso
    const pasos = [[bInicio, state.inicio.generated], [bYapes, hasDataYapes()], [bNeeds, state.needs.generated], [bIngresos, state.ingresos.generated], [bGastos, state.gastos.generated], [bFin, state.fin.generated]];
    const siguiente = pasos.find(([, listo]) => !listo);
    pasos.forEach(([badge, listo]) => {
        const item = badge.closest('.action-item');
        item.classList.toggle('is-done', listo);
        item.classList.toggle('is-next', !!siguiente && badge === siguiente[0]);
    });

    // Celebrar solo cuando se pasa a 6/6 (no al abrir la página ya completa)
    if (ultimoAvance !== null && ultimoAvance < 6 && hechos === 6) celebrar();
    ultimoAvance = hechos;
}

function celebrar() {
    if (typeof confetti !== 'function' || Date.now() - ultimaCelebracion < 1500) return;
    ultimaCelebracion = Date.now();
    confetti({
        particleCount: 130,
        spread: 85,
        origin: { y: 0.7 },
        colors: ['#FF1A83', '#FFB3D4', '#8B5CF6', '#0EA5E9', '#10A36A', '#FFC93C'],
        zIndex: 2000,
        disableForReducedMotion: true
    });
}

// Muestra "✓ Generado" un momento si el informe se generó
function botonGenerado(btn, texto) {
    if (!texto) return;
    if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Generado';
    btn.classList.add('is-generated');
    clearTimeout(btn._timer);
    btn._timer = setTimeout(() => {
        btn.innerHTML = btn.dataset.original;
        btn.classList.remove('is-generated');
    }, 1600);
}

// Evita que el celular apague la pantalla mientras la página está abierta
let wakeLock = null;
async function mantenerPantallaEncendida() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', mantenerPantallaEncendida);

// Efecto de onda al tocar botones
document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn-brand, .btn-soft, .btn-ghost, .btn-icon, .btn-wa, .action-item, .theme-toggle, .puesto-btn-toggle');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const onda = document.createElement('span');
    onda.className = 'ripple';
    onda.style.width = onda.style.height = `${size}px`;
    onda.style.left = `${e.clientX - rect.left - size / 2}px`;
    onda.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(onda);
    onda.addEventListener('animationend', () => onda.remove());
});

// Sin números negativos: se bloquea el "-" y se limpia si llega pegado
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input[type="number"]') && ['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
});
document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('input[type="number"]') && parseFloat(el.value) < 0) el.value = '';
}, true);

function saveState() {
    // INICIO
    state.inicio.carton_8 = document.getElementById('init_carton_8').value;
    state.inicio.carton_12 = document.getElementById('init_carton_12').value;
    state.inicio.carton_medio = document.getElementById('init_carton_medio').value;
    state.inicio.carton_litro = document.getElementById('init_carton_litro').value;
    state.inicio.plastico_8 = document.getElementById('init_plastico_8').value;
    state.inicio.plastico_12 = document.getElementById('init_plastico_12').value;
    state.inicio.plastico_medio = document.getElementById('init_plastico_medio').value;
    state.inicio.text = document.getElementById('result_inicio').value;

    // YAPES
    state.yapes_text = document.getElementById('result_yape').value;

    // NECESIDADES
    state.needs.cucharas_chicas = document.getElementById('need_cucharas_chicas').value;
    state.needs.cucharas_grandes = document.getElementById('need_cucharas_grandes').value;
    state.needs.servilletas = document.getElementById('need_servilletas').value;
    state.needs.sorbetes = document.getElementById('need_sorbetes').value;
    state.needs.bolsas_chicas = document.getElementById('need_bolsas_chicas').value;
    state.needs.bolsas_medianas = document.getElementById('need_bolsas_medianas').value;
    state.needs.carton_8 = document.getElementById('need_carton_8').value;
    state.needs.carton_12 = document.getElementById('need_carton_12').value;
    state.needs.carton_medio = document.getElementById('need_carton_medio').value;
    state.needs.carton_litro = document.getElementById('need_carton_litro').value;
    state.needs.plastico_8 = document.getElementById('need_plastico_8').value;
    state.needs.plastico_12 = document.getElementById('need_plastico_12').value;
    state.needs.plastico_medio = document.getElementById('need_plastico_medio').value;
    state.needs.tapas_8 = document.getElementById('need_tapas_8').value;
    state.needs.tapas_12 = document.getElementById('need_tapas_12').value;
    state.needs.tapas_medio = document.getElementById('need_tapas_medio').value;
    state.needs.tapas_litro = document.getElementById('need_tapas_litro').value;
    state.needs.lejia = document.getElementById('clean_lejia').checked;
    state.needs.trapo = document.getElementById('clean_trapo').checked;
    state.needs.detergente = document.getElementById('clean_detergente').checked;
    state.needs.guantes = document.getElementById('clean_guantes').checked;
    state.needs.text = document.getElementById('result_needs').value;

    // INGRESOS
    state.ingresos.cucharas_chicas = document.getElementById('ing_cucharas_chicas').value;
    state.ingresos.cucharas_grandes = document.getElementById('ing_cucharas_grandes').value;
    state.ingresos.servilletas = document.getElementById('ing_servilletas').value;
    state.ingresos.sorbetes = document.getElementById('ing_sorbetes').value;
    state.ingresos.bolsas_chicas = document.getElementById('ing_bolsas_chicas').value;
    state.ingresos.bolsas_medianas = document.getElementById('ing_bolsas_medianas').value;
    state.ingresos.carton_8 = document.getElementById('ing_carton_8').value;
    state.ingresos.carton_12 = document.getElementById('ing_carton_12').value;
    state.ingresos.carton_medio = document.getElementById('ing_carton_medio').value;
    state.ingresos.carton_litro = document.getElementById('ing_carton_litro').value;
    state.ingresos.plastico_8 = document.getElementById('ing_plastico_8').value;
    state.ingresos.plastico_12 = document.getElementById('ing_plastico_12').value;
    state.ingresos.plastico_medio = document.getElementById('ing_plastico_medio').value;
    state.ingresos.tapas_8 = document.getElementById('ing_tapas_8').value;
    state.ingresos.tapas_12 = document.getElementById('ing_tapas_12').value;
    state.ingresos.tapas_medio = document.getElementById('ing_tapas_medio').value;
    state.ingresos.tapas_litro = document.getElementById('ing_tapas_litro').value;
    state.ingresos.lejia = document.getElementById('ing_clean_lejia').checked;
    state.ingresos.trapo = document.getElementById('ing_clean_trapo').checked;
    state.ingresos.detergente = document.getElementById('ing_clean_detergente').checked;
    state.ingresos.guantes = document.getElementById('ing_clean_guantes').checked;
    state.ingresos.text = document.getElementById('result_ingresos').value;

    // GASTOS
    state.gastos.bebidas = document.getElementById('gasto_bebidas').checked;
    state.gastos.sueldo = document.getElementById('gasto_sueldo').checked;
    state.gastos.cochera = document.getElementById('gasto_cochera').checked;
    state.gastos.guarderia = document.getElementById('gasto_guarderia').checked;
    state.gastos.sueldo_personas = document.getElementById('gasto_sueldo_personas').value;
    state.gastos.otros_detalle = document.getElementById('gasto_otros_detalle').value;
    state.gastos.text = document.getElementById('result_gastos').value;

    // FIN
    state.fin.carton_8 = document.getElementById('fin_carton_8').value;
    state.fin.carton_12 = document.getElementById('fin_carton_12').value;
    state.fin.carton_medio = document.getElementById('fin_carton_medio').value;
    state.fin.carton_litro = document.getElementById('fin_carton_litro').value;
    state.fin.plastico_8 = document.getElementById('fin_plastico_8').value;
    state.fin.plastico_12 = document.getElementById('fin_plastico_12').value;
    state.fin.plastico_medio = document.getElementById('fin_plastico_medio').value;
    state.fin.efectivo = document.getElementById('fin_monto_efectivo').value;
    state.fin.text = document.getElementById('result_fin').value;

    localStorage.setItem('ornela_arqueo_v25', JSON.stringify(state));
    checkFinLockState();
    updateStatusBadges();
}

function restoreFormValues() {
    seleccionarPuesto(state.puesto || 'Puesto 1', false);

    // INICIO
    document.getElementById('init_carton_8').value = state.inicio.carton_8 || '';
    document.getElementById('init_carton_12').value = state.inicio.carton_12 || '';
    document.getElementById('init_carton_medio').value = state.inicio.carton_medio || '';
    document.getElementById('init_carton_litro').value = state.inicio.carton_litro || '';
    document.getElementById('init_plastico_8').value = state.inicio.plastico_8 || '';
    document.getElementById('init_plastico_12').value = state.inicio.plastico_12 || '';
    document.getElementById('init_plastico_medio').value = state.inicio.plastico_medio || '';
    document.getElementById('result_inicio').value = state.inicio.text || '';

    // YAPES
    document.getElementById('result_yape').value = state.yapes_text || '';

    // NECESIDADES
    document.getElementById('need_cucharas_chicas').value = state.needs.cucharas_chicas || '';
    document.getElementById('need_cucharas_grandes').value = state.needs.cucharas_grandes || '';
    document.getElementById('need_servilletas').value = state.needs.servilletas || '';
    document.getElementById('need_sorbetes').value = state.needs.sorbetes || '';
    document.getElementById('need_bolsas_chicas').value = state.needs.bolsas_chicas || '';
    document.getElementById('need_bolsas_medianas').value = state.needs.bolsas_medianas || '';
    document.getElementById('need_carton_8').value = state.needs.carton_8 || '';
    document.getElementById('need_carton_12').value = state.needs.carton_12 || '';
    document.getElementById('need_carton_medio').value = state.needs.carton_medio || '';
    document.getElementById('need_carton_litro').value = state.needs.carton_litro || '';
    document.getElementById('need_plastico_8').value = state.needs.plastico_8 || '';
    document.getElementById('need_plastico_12').value = state.needs.plastico_12 || '';
    document.getElementById('need_plastico_medio').value = state.needs.plastico_medio || '';
    document.getElementById('need_tapas_8').value = state.needs.tapas_8 || '';
    document.getElementById('need_tapas_12').value = state.needs.tapas_12 || '';
    document.getElementById('need_tapas_medio').value = state.needs.tapas_medio || '';
    document.getElementById('need_tapas_litro').value = state.needs.tapas_litro || '';
    document.getElementById('clean_lejia').checked = state.needs.lejia || false;
    document.getElementById('clean_trapo').checked = state.needs.trapo || false;
    document.getElementById('clean_detergente').checked = state.needs.detergente || false;
    document.getElementById('clean_guantes').checked = state.needs.guantes || false;
    document.getElementById('result_needs').value = state.needs.text || '';

    // INGRESOS
    if (state.ingresos) {
        document.getElementById('ing_cucharas_chicas').value = state.ingresos.cucharas_chicas || '';
        document.getElementById('ing_cucharas_grandes').value = state.ingresos.cucharas_grandes || '';
        document.getElementById('ing_servilletas').value = state.ingresos.servilletas || '';
        document.getElementById('ing_sorbetes').value = state.ingresos.sorbetes || '';
        document.getElementById('ing_bolsas_chicas').value = state.ingresos.bolsas_chicas || '';
        document.getElementById('ing_bolsas_medianas').value = state.ingresos.bolsas_medianas || '';
        document.getElementById('ing_carton_8').value = state.ingresos.carton_8 || '';
        document.getElementById('ing_carton_12').value = state.ingresos.carton_12 || '';
        document.getElementById('ing_carton_medio').value = state.ingresos.carton_medio || '';
        document.getElementById('ing_carton_litro').value = state.ingresos.carton_litro || '';
        document.getElementById('ing_plastico_8').value = state.ingresos.plastico_8 || '';
        document.getElementById('ing_plastico_12').value = state.ingresos.plastico_12 || '';
        document.getElementById('ing_plastico_medio').value = state.ingresos.plastico_medio || '';
        document.getElementById('ing_tapas_8').value = state.ingresos.tapas_8 || '';
        document.getElementById('ing_tapas_12').value = state.ingresos.tapas_12 || '';
        document.getElementById('ing_tapas_medio').value = state.ingresos.tapas_medio || '';
        document.getElementById('ing_tapas_litro').value = state.ingresos.tapas_litro || '';
        document.getElementById('ing_clean_lejia').checked = state.ingresos.lejia || false;
        document.getElementById('ing_clean_trapo').checked = state.ingresos.trapo || false;
        document.getElementById('ing_clean_detergente').checked = state.ingresos.detergente || false;
        document.getElementById('ing_clean_guantes').checked = state.ingresos.guantes || false;
        document.getElementById('result_ingresos').value = state.ingresos.text || '';
    }

    // GASTOS
    if (state.gastos) {
        document.getElementById('gasto_bebidas').checked = state.gastos.bebidas || false;
        document.getElementById('gasto_sueldo').checked = state.gastos.sueldo || false;
        document.getElementById('gasto_cochera').checked = state.gastos.cochera || false;
        document.getElementById('gasto_guarderia').checked = state.gastos.guarderia || false;
        document.getElementById('gasto_sueldo_personas').value = state.gastos.sueldo_personas || '';
        document.getElementById('gasto_otros_detalle').value = state.gastos.otros_detalle || '';
        document.getElementById('result_gastos').value = state.gastos.text || '';
    }

    // FIN
    document.getElementById('fin_carton_8').value = state.fin.carton_8 || '';
    document.getElementById('fin_carton_12').value = state.fin.carton_12 || '';
    document.getElementById('fin_carton_medio').value = state.fin.carton_medio || '';
    document.getElementById('fin_carton_litro').value = state.fin.carton_litro || '';
    document.getElementById('fin_plastico_8').value = state.fin.plastico_8 || '';
    document.getElementById('fin_plastico_12').value = state.fin.plastico_12 || '';
    document.getElementById('fin_plastico_medio').value = state.fin.plastico_medio || '';
    document.getElementById('fin_monto_efectivo').value = state.fin.efectivo || '';
    document.getElementById('result_fin').value = state.fin.text || '';
}

document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', saveState);
    element.addEventListener('change', saveState);
});

function actualizarReloj() {
    const now = new Date();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    document.getElementById('live-date').innerText = `${now.getDate()} ${meses[now.getMonth()]}. ${now.getFullYear()}`;
    document.getElementById('live-time').innerText = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const hora = now.getHours();
    const saludo = hora >= 5 && hora < 12 ? 'Buenos días ☀️' : hora >= 12 && hora < 19 ? 'Buenas tardes 🍧' : 'Buenas noches 🌙';
    document.getElementById('greeting_text').innerText = saludo;}

function getFechaHoraActual() {
    return new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function getPuestoActual() {
    return state.puesto || 'Puesto 1';
}

function hasDataInicio() {
    const i = state.inicio;
    return !!(i.carton_8 || i.carton_12 || i.carton_medio || i.carton_litro || i.plastico_8 || i.plastico_12 || i.plastico_medio);
}

function hasDataYapes() { return state.yapes.length > 0; }

function hasAnyDataRegistered() {
    return state.inicio.generated || hasDataYapes() || state.needs.generated || state.ingresos.generated || state.gastos.generated || state.fin.generated;
}

function confirmarLimpiarModal(tipo, nombreSeccion) {
    sectionToClear = tipo;
    document.getElementById('clear_section_title').innerText = nombreSeccion;
    new bootstrap.Modal(document.getElementById('modalConfirmClear')).show();
}

function ejecutarLimpiarModal() {
    if (!sectionToClear) return;
    const tipo = sectionToClear;
    if (tipo === 'inicio') { 
        state.inicio = { carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', text: '', timestamp: null, generated: false }; 
        document.getElementById('result_inicio').value = ''; 
    }
    else if (tipo === 'yape') { 
        state.yapes = [];
        state.yapes_horas = [];
        state.yapes_text = ''; 
        state.yape_timestamp = null; 
        document.getElementById('result_yape').value = ''; 
    }
    else if (tipo === 'needs') { 
        state.needs = { cucharas_chicas: '', cucharas_grandes: '', servilletas: '', sorbetes: '', bolsas_chicas: '', bolsas_medianas: '', carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', tapas_8: '', tapas_12: '', tapas_medio: '', tapas_litro: '', lejia: false, trapo: false, detergente: false, guantes: false, text: '', timestamp: null, generated: false }; 
        document.getElementById('result_needs').value = ''; 
    }
    else if (tipo === 'ingresos') { 
        state.ingresos = { cucharas_chicas: '', cucharas_grandes: '', servilletas: '', sorbetes: '', bolsas_chicas: '', bolsas_medianas: '', carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', tapas_8: '', tapas_12: '', tapas_medio: '', tapas_litro: '', lejia: false, trapo: false, detergente: false, guantes: false, text: '', timestamp: null, generated: false }; 
        document.getElementById('result_ingresos').value = ''; 
    }
    else if (tipo === 'gastos') { 
        state.gastos = { bebidas: false, sueldo: false, cochera: false, guarderia: false, sueldo_personas: '', otros_detalle: '', text: '', timestamp: null, generated: false }; 
        document.getElementById('result_gastos').value = ''; 
    }
    else if (tipo === 'fin') { 
        state.fin = { carton_8: '', carton_12: '', carton_medio: '', carton_litro: '', plastico_8: '', plastico_12: '', plastico_medio: '', efectivo: '', text: '', timestamp: null, generated: false }; 
        document.getElementById('result_fin').value = ''; 
    }

    restoreFormValues();
    saveState();
    renderYapesList();
    toggleSueldoInput();

    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalConfirmClear'));
    if (modalInstance) modalInstance.hide();
    sectionToClear = null;
    showToast("Sección limpiada correctamente");
}

function generarInformeInicio() {
    saveState();
    if (!hasDataInicio()) { showToast("Faltan datos en Inicio", true); document.getElementById('result_inicio').value = ""; state.inicio.generated = false; saveState(); return ""; }
    if (!state.inicio.timestamp) { state.inicio.timestamp = getFechaHoraActual(); }
    state.inicio.generated = true;
    const i = state.inicio;
    const texto = `☀️ INFORME DE INICIO DE DÍA - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${state.inicio.timestamp}\n---------------------------------------------\n📦 Stock Inicial de Vasos:\n📄 CARTÓN:\n- 8 oz: ${i.carton_8 || 0}\n- 12 oz: ${i.carton_12 || 0}\n- Medio Litro: ${i.carton_medio || 0}\n- Litro: ${i.carton_litro || 0}\n\n🥤 PLÁSTICO:\n- 8 oz: ${i.plastico_8 || 0}\n- 12 oz: ${i.plastico_12 || 0}\n- Medio Litro: ${i.plastico_medio || 0}\n---------------------------------------------\nEstado: Día iniciado correctamente.`;
    document.getElementById('result_inicio').value = texto;
    state.inicio.text = texto;
    saveState();
    updateStatusBadges();
    scrollToInforme('result_inicio');
    return texto;
}

function agregarYape() {
    const input = document.getElementById('yape_input_monto');
    const val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) return;
    state.yapes.push(val);
    state.yapes_horas.push(getHoraCorta());
    if (!state.yape_timestamp) state.yape_timestamp = getFechaHoraActual();
    input.value = '';
    saveState();
    renderYapesList();
}

function getHoraCorta() {
    return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function eliminarYape(idx) {
    // Copia para poder deshacer
    const borrado = { idx, monto: state.yapes[idx], hora: state.yapes_horas[idx], timestamp: state.yape_timestamp, teniaInforme: !!state.yapes_text };
    state.yapes.splice(idx, 1);
    state.yapes_horas.splice(idx, 1);
    showToast(`Yape de S/ ${borrado.monto.toFixed(2)} eliminado`, false, () => deshacerYape(borrado));
    if (state.yapes.length === 0) {
        state.yape_timestamp = null;
        state.yapes_text = '';
        document.getElementById('result_yape').value = '';
    } else if (state.yapes_text) {
        generarInformeYapes();
    }
    saveState();
    renderYapesList();
}

function deshacerYape(b) {
    state.yapes.splice(b.idx, 0, b.monto);
    state.yapes_horas.splice(b.idx, 0, b.hora);
    if (!state.yape_timestamp) state.yape_timestamp = b.timestamp;
    if (b.teniaInforme) generarInformeYapes();
    saveState();
    renderYapesList();
}

function renderYapesList() {
    const container = document.getElementById('yapes_lista_container');
    const total = state.yapes.reduce((a,b)=>a+b, 0);
    document.getElementById('dash_yape_count').innerText = state.yapes.length;
    document.getElementById('dash_yape_total').innerText = `S/ ${total.toFixed(2)}`;
    const finYapeEl = document.getElementById('fin_monto_yape');
    if(finYapeEl) finYapeEl.value = total > 0 ? total.toFixed(2) : '';

    if (state.yapes.length === 0) {
        container.innerHTML = `<span class="text-muted small fst-italic">No hay Yapes ingresados.</span>`;
        document.getElementById('yape_cadena_preview').innerText = "0";
        document.getElementById('yape_count_preview').innerText = "0";
        document.getElementById('yape_total_preview').innerText = "S/ 0.00";
        updateStatusBadges();
        return;
    }

    let html = '';
    state.yapes.forEach((m, idx) => {
        html += `<div class="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom"><span class="small fw-semibold">#${idx + 1} - S/ ${m.toFixed(2)}${state.yapes_horas[idx] ? ` <span class="yape-hora">· ${state.yapes_horas[idx]}</span>` : ''}</span><button class="btn btn-sm text-danger p-0" onclick="eliminarYape(${idx})"><i class="fa-solid fa-xmark"></i></button></div>`;
    });
    container.innerHTML = html;
    document.getElementById('yape_cadena_preview').innerText = state.yapes.join(' + ');
    document.getElementById('yape_count_preview').innerText = state.yapes.length;
    document.getElementById('yape_total_preview').innerText = `S/ ${total.toFixed(2)}`;
    updateStatusBadges();
}

function generarInformeYapes() {
    if (!hasDataYapes()) { showToast("No hay Yapes ingresados", true); document.getElementById('result_yape').value = ""; state.yapes_text = ""; saveState(); return ""; }
    if (!state.yape_timestamp) { state.yape_timestamp = getFechaHoraActual(); }
    const total = state.yapes.reduce((a,b)=>a+b, 0);
    const texto = `📱 INFORME DE YAPES DEL DÍA - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${state.yape_timestamp}\n---------------------------------------------\n🔢 Desglose:\n${state.yapes.join(' + ')}\n\n📊 Resumen:\n- Total Yapes: ${state.yapes.length}\n- 💵 MONTO TOTAL: S/ ${total.toFixed(2)}\n---------------------------------------------`;
    document.getElementById('result_yape').value = texto;
    state.yapes_text = texto;
    saveState();
    updateStatusBadges();
    return texto;
}

function generarInformeNeeds() {
    saveState();
    if (!state.needs.timestamp) { state.needs.timestamp = getFechaHoraActual(); }
    state.needs.generated = true;
    const txt = getRawNeedsText();
    document.getElementById('result_needs').value = txt;
    state.needs.text = txt;
    saveState();
    updateStatusBadges();
    scrollToInforme('result_needs');
    return txt;
}

function getRawNeedsText() {
    const n = state.needs;
    let arr = [];
    if (parseInt(n.cucharas_chicas) > 0) arr.push(`- Cucharas chicas: ${n.cucharas_chicas} paq.`);
    if (parseInt(n.cucharas_grandes) > 0) arr.push(`- Cucharas grandes: ${n.cucharas_grandes} paq.`);
    if (parseInt(n.servilletas) > 0) arr.push(`- Servilletas: ${n.servilletas} paq.`);
    if (parseInt(n.sorbetes) > 0) arr.push(`- Sorbetes: ${n.sorbetes} paq.`);
    if (parseInt(n.bolsas_chicas) > 0) arr.push(`- Bolsas chicas: ${n.bolsas_chicas} paq.`);
    if (parseInt(n.bolsas_medianas) > 0) arr.push(`- Bolsas medianas: ${n.bolsas_medianas} paq.`);
    if (parseInt(n.carton_8) > 0) arr.push(`- Vasos Cartón 8oz: ${n.carton_8} paq.`);
    if (parseInt(n.carton_12) > 0) arr.push(`- Vasos Cartón 12oz: ${n.carton_12} paq.`);
    if (parseInt(n.carton_medio) > 0) arr.push(`- Vasos Cartón 1/2L: ${n.carton_medio} paq.`);
    if (parseInt(n.carton_litro) > 0) arr.push(`- Vasos Cartón 1L: ${n.carton_litro} paq.`);
    if (parseInt(n.plastico_8) > 0) arr.push(`- Vasos Plástico 8oz: ${n.plastico_8} paq.`);
    if (parseInt(n.plastico_12) > 0) arr.push(`- Vasos Plástico 12oz: ${n.plastico_12} paq.`);
    if (parseInt(n.plastico_medio) > 0) arr.push(`- Vasos Plástico 1/2L: ${n.plastico_medio} paq.`);
    if (parseInt(n.tapas_8) > 0) arr.push(`- Tapas Cartón 8oz: ${n.tapas_8} paq.`);
    if (parseInt(n.tapas_12) > 0) arr.push(`- Tapas Cartón 12oz: ${n.tapas_12} paq.`);
    if (parseInt(n.tapas_medio) > 0) arr.push(`- Tapas Cartón 1/2L: ${n.tapas_medio} paq.`);
    if (parseInt(n.tapas_litro) > 0) arr.push(`- Tapas Cartón 1L: ${n.tapas_litro} paq.`);

    let clean = [];
    if (n.lejia) clean.push("Lejía");
    if (n.trapo) clean.push("Trapo");
    if (n.detergente) clean.push("Detergente");
    if (n.guantes) clean.push("Guantes");

    let texto = `🛒 INFORME DE NECESIDADES - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${n.timestamp || getFechaHoraActual()}\n---------------------------------------------`;
    if (arr.length > 0) texto += `\n📦 INSUMOS / EMPAQUES:\n` + arr.join('\n');
    if (clean.length > 0) texto += `\n\n🧹 LIMPIEZA:\n- ` + clean.join(', ');
    if (arr.length === 0 && clean.length === 0) texto += `\n(Sin faltantes registrados)`;
    texto += `\n---------------------------------------------`;
    return texto;
}

function generarInformeIngresos() {
    saveState();
    if (!state.ingresos.timestamp) { state.ingresos.timestamp = getFechaHoraActual(); }
    state.ingresos.generated = true;
    const txt = getRawIngresosText();
    document.getElementById('result_ingresos').value = txt;
    state.ingresos.text = txt;
    saveState();
    updateStatusBadges();
    scrollToInforme('result_ingresos');
    return txt;
}

function getRawIngresosText() {
    const ing = state.ingresos;
    let arr = [];
    if (parseInt(ing.cucharas_chicas) > 0) arr.push(`- Cucharas chicas: ${ing.cucharas_chicas} paq.`);
    if (parseInt(ing.cucharas_grandes) > 0) arr.push(`- Cucharas grandes: ${ing.cucharas_grandes} paq.`);
    if (parseInt(ing.servilletas) > 0) arr.push(`- Servilletas: ${ing.servilletas} paq.`);
    if (parseInt(ing.sorbetes) > 0) arr.push(`- Sorbetes: ${ing.sorbetes} paq.`);
    if (parseInt(ing.bolsas_chicas) > 0) arr.push(`- Bolsas chicas: ${ing.bolsas_chicas} paq.`);
    if (parseInt(ing.bolsas_medianas) > 0) arr.push(`- Bolsas medianas: ${ing.bolsas_medianas} paq.`);
    if (parseInt(ing.carton_8) > 0) arr.push(`- Vasos Cartón 8oz: ${ing.carton_8}`);
    if (parseInt(ing.carton_12) > 0) arr.push(`- Vasos Cartón 12oz: ${ing.carton_12}`);
    if (parseInt(ing.carton_medio) > 0) arr.push(`- Vasos Cartón 1/2L: ${ing.carton_medio}`);
    if (parseInt(ing.carton_litro) > 0) arr.push(`- Vasos Cartón 1L: ${ing.carton_litro}`);
    if (parseInt(ing.plastico_8) > 0) arr.push(`- Vasos Plástico 8oz: ${ing.plastico_8}`);
    if (parseInt(ing.plastico_12) > 0) arr.push(`- Vasos Plástico 12oz: ${ing.plastico_12}`);
    if (parseInt(ing.plastico_medio) > 0) arr.push(`- Vasos Plástico 1/2L: ${ing.plastico_medio}`);
    if (parseInt(ing.tapas_8) > 0) arr.push(`- Tapas Cartón 8oz: ${ing.tapas_8} paq.`);
    if (parseInt(ing.tapas_12) > 0) arr.push(`- Tapas Cartón 12oz: ${ing.tapas_12} paq.`);
    if (parseInt(ing.tapas_medio) > 0) arr.push(`- Tapas Cartón 1/2L: ${ing.tapas_medio} paq.`);
    if (parseInt(ing.tapas_litro) > 0) arr.push(`- Tapas Cartón 1L: ${ing.tapas_litro} paq.`);

    let clean = [];
    if (ing.lejia) clean.push("Lejía");
    if (ing.trapo) clean.push("Trapo");
    if (ing.detergente) clean.push("Detergente");
    if (ing.guantes) clean.push("Guantes");

    let texto = `📦 INFORME DE INGRESOS DE STOCK - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${ing.timestamp || getFechaHoraActual()}\n---------------------------------------------`;
    if (arr.length > 0) texto += `\n📦 INSUMOS / EMPAQUES INGRESADOS:\n` + arr.join('\n');
    if (clean.length > 0) texto += `\n\n🧹 LIMPIEZA INGRESADA:\n- ` + clean.join(', ');
    if (arr.length === 0 && clean.length === 0) texto += `\n(Sin ingresos registrados)`;
    texto += `\n---------------------------------------------`;
    return texto;
}

function generarInformeGastos() {
    saveState();
    const g = state.gastos;
    if (g.sueldo && (!g.sueldo_personas || parseInt(g.sueldo_personas) <= 0)) {
        showToast("Ingresa la cantidad de personas para Sueldo", true);
        document.getElementById('result_gastos').value = "";
        state.gastos.generated = false;
        saveState();
        return "";
    }
    if (!state.gastos.timestamp) { state.gastos.timestamp = getFechaHoraActual(); }
    state.gastos.generated = true;

    let arrGastos = [];
    if (g.bebidas) arrGastos.push("- Consumo de Bebidas");
    if (g.sueldo) arrGastos.push(`- Sueldo Personal (${g.sueldo_personas} pers.)`);
    if (g.cochera) arrGastos.push("- Cochera");
    if (g.guarderia) arrGastos.push("- Guardería");
    if (g.otros_detalle && g.otros_detalle.trim().length > 0) arrGastos.push(`- Otros: ${g.otros_detalle.trim()}`);

    let texto = `💸 INFORME DE GASTOS DEL DÍA - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${state.gastos.timestamp}\n---------------------------------------------\n📋 GASTOS REGISTRADOS:\n` + (arrGastos.length > 0 ? arrGastos.join('\n') : "(Sin gastos marcados)") + `\n---------------------------------------------`;
    document.getElementById('result_gastos').value = texto;
    state.gastos.text = texto;
    saveState();
    updateStatusBadges();
    scrollToInforme('result_gastos');
    return texto;
}

function generarInformeFin() {
    saveState();
    if (!state.inicio.generated && !hasDataInicio()) { showToast("Primero registra el Inicio del Día", true); document.getElementById('result_fin').value = ""; state.fin.generated = false; saveState(); return ""; }
    if (!hasDataFin()) { showToast("Faltan datos en el cierre", true); document.getElementById('result_fin').value = ""; state.fin.generated = false; saveState(); return ""; }
    if (!state.fin.timestamp) { state.fin.timestamp = getFechaHoraActual(); }
    const primerCierre = !state.fin.generated;
    state.fin.generated = true;

    const ini = state.inicio, ing = state.ingresos, fin = state.fin;
    const calcVentas = (i, ingreso, f) => Math.max(0, ((parseInt(i) || 0) + (parseInt(ingreso) || 0)) - (parseInt(f) || 0));
    const montoYape = state.yapes.reduce((a,b)=>a+b,0);
    const montoEfectivo = parseFloat(fin.efectivo) || 0;

    const texto = `🌙 INFORME DE CIERRE - ORNELA CREMOLADAS\n📅 Fecha y Hora: ${state.fin.timestamp}\n---------------------------------------------\n🥤 Vasos Vendidos / Sobrantes:\n📄 CARTÓN:\n- 8 oz: ${calcVentas(ini.carton_8, ing.carton_8, fin.carton_8)} (Sobran: ${fin.carton_8||0})\n- 12 oz: ${calcVentas(ini.carton_12, ing.carton_12, fin.carton_12)} (Sobran: ${fin.carton_12||0})\n- Medio Litro: ${calcVentas(ini.carton_medio, ing.carton_medio, fin.carton_medio)} (Sobran: ${fin.carton_medio||0})\n- Litro: ${calcVentas(ini.carton_litro, ing.carton_litro, fin.carton_litro)} (Sobran: ${fin.carton_litro||0})\n\n🥤 PLÁSTICO:\n- 8 oz: ${calcVentas(ini.plastico_8, ing.plastico_8, fin.plastico_8)} (Sobran: ${fin.plastico_8||0})\n- 12 oz: ${calcVentas(ini.plastico_12, ing.plastico_12, fin.plastico_12)} (Sobran: ${fin.plastico_12||0})\n- Medio Litro: ${calcVentas(ini.plastico_medio, ing.plastico_medio, fin.plastico_medio)} (Sobran: ${fin.plastico_medio||0})\n\n💰 Dinero:\n- Yape: S/ ${montoYape.toFixed(2)}\n- Efectivo: S/ ${montoEfectivo.toFixed(2)}\n- 💵 TOTAL: S/ ${(montoYape + montoEfectivo).toFixed(2)}\n---------------------------------------------`;
    document.getElementById('result_fin').value = texto;
    state.fin.text = texto;
    saveState();
    updateStatusBadges();
    scrollToInforme('result_fin');
    if (primerCierre) {
        celebrar();
        showToast(`¡Buen trabajo! Hoy hiciste S/ ${(montoYape + montoEfectivo).toFixed(2)} 🎉`);
    }
    return texto;
}

function hasDataFin() {
    const f = state.fin;
    return !!(f.carton_8 || f.carton_12 || f.carton_medio || f.carton_litro || f.plastico_8 || f.plastico_12 || f.plastico_medio || f.efectivo);
}

function getRawConsolidadoText() {
    saveState();
    if (!hasAnyDataRegistered()) {
        return "Aún no hay datos ingresados para consolidar.";
    }

    let bloques = [];

    if (state.inicio.generated) {
        let txt = document.getElementById('result_inicio').value || generarInformeInicio();
        if (txt) bloques.push(txt);
    }
    if (hasDataYapes()) {
        let txt = document.getElementById('result_yape').value || generarInformeYapes();
        if (txt) bloques.push(txt);
    }
    if (state.needs.generated) {
        let txt = document.getElementById('result_needs').value || getRawNeedsText();
        if (txt) bloques.push(txt);
    }
    if (state.ingresos.generated) {
        let txt = document.getElementById('result_ingresos').value || getRawIngresosText();
        if (txt) bloques.push(txt);
    }
    if (state.gastos.generated) {
        let txt = document.getElementById('result_gastos').value || generarInformeGastos();
        if (txt) bloques.push(txt);
    }
    if (state.fin.generated) {
        let txt = document.getElementById('result_fin').value || generarInformeFin();
        if (txt) bloques.push(txt);
    }

    if (bloques.length === 0) return "Aún no hay datos ingresados para consolidar.";

    return `=============================================\n🌟 CONSOLIDADO GENERAL - ORNELA CREMOLADAS 🌟\n📍 PUESTO: ${getPuestoActual()}\n📅 Fecha y Hora: ${getFechaHoraActual()}\n=============================================\n\n` + bloques.join('\n\n') + `\n\n=============================================\n✅ Fin del Reporte Consolidado del Turno`;
}

function abrirConsolidadoModal() {
    const textoGeneral = getRawConsolidadoText();
    document.getElementById('result_consolidado').value = textoGeneral;
    new bootstrap.Modal(document.getElementById('modalConsolidado')).show();
}

function enviarWhatsApp(elementId) {
    const txt = document.getElementById(elementId).value;
    if (!txt.trim() || txt.includes("Aún no hay datos")) {
        showToast("Aún no hay datos para enviar", true);
        return;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, '_blank');
}

function copiarInforme(elementId, tipo) {
    const txtFinal = document.getElementById(elementId);
    if (tipo === 'consolidado') {
        const generado = getRawConsolidadoText();
        if (generado.includes("Aún no hay datos")) {
            showToast("No se puede copiar aún porque todavía no ingresas datos", true);
            return;
        }
        txtFinal.value = generado;
    }
    if (!txtFinal.value.trim() || txtFinal.value.includes("Aún no hay datos")) {
        showToast("No se puede copiar aún porque todavía no ingresas datos", true);
        return;
    }
    scrollToInforme(elementId);
    navigator.clipboard.writeText(txtFinal.value).then(() => showToast("¡Copiado al portapapeles!"))
    .catch(() => { txtFinal.select(); document.execCommand('copy'); showToast("¡Copiado!"); });
}

let toastTimer = null;
function showToast(msg, isError = false, accion = null) {
    const toast = document.getElementById('customToast');
    const icon = document.getElementById('toastIcon');
    const btnAccion = document.getElementById('toastAction');
    icon.className = isError ? "fa-solid fa-triangle-exclamation text-warning" : "fa-solid fa-circle-check text-success";
    document.getElementById('toastMessage').innerText = msg;
    // Botón opcional (ej. "Deshacer")
    btnAccion.classList.toggle('d-none', !accion);
    btnAccion.onclick = accion ? () => { accion(); toast.classList.remove('show'); } : null;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), accion ? 5000 : 2800);
}

function executeReset() {
    guardarEnHistorial();
    localStorage.removeItem('ornela_arqueo_v25');
    location.reload();
}
