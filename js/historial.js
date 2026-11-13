// HISTORIAL DE DÍAS
// Al reiniciar el día se guarda un resumen; se ve desde la fila "Historial".
const HISTORIAL_KEY = 'ornela_historial';
const HISTORIAL_MAX = 120;

function leerHistorial() {
    try { return JSON.parse(localStorage.getItem(HISTORIAL_KEY)) || []; } catch (e) { return []; }
}

function guardarEnHistorial() {
    if (!hasAnyDataRegistered()) return;
    const yape = state.yapes.reduce((a, b) => a + b, 0);
    const efectivo = parseFloat(state.fin.efectivo) || 0;
    const dia = {
        id: Date.now(),
        fecha: state.turno_inicio || Date.now(),
        puesto: getPuestoActual(),
        yape,
        efectivo,
        total: yape + efectivo,
        informe: getRawConsolidadoText()
    };
    const lista = [dia, ...leerHistorial()].slice(0, HISTORIAL_MAX);
    try { localStorage.setItem(HISTORIAL_KEY, JSON.stringify(lista)); } catch (e) {}
}

function formatoFechaCorta(ms) {
    const t = new Date(ms).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function renderHistorial() {
    const lista = leerHistorial();
    const cont = document.getElementById('historial_lista');

    // Resumen: últimos 7 días y mejor día
    const hace7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const semana = lista.filter(d => d.fecha >= hace7).reduce((a, d) => a + d.total, 0);
    const mejor = lista.reduce((m, d) => (!m || d.total > m.total ? d : m), null);
    document.getElementById('hist_semana').innerText = `S/ ${semana.toFixed(2)}`;
    document.getElementById('hist_mejor').innerText = mejor ? `S/ ${mejor.total.toFixed(2)}` : '—';
    document.getElementById('hist_mejor_fecha').innerText = mejor ? formatoFechaCorta(mejor.fecha) : 'Sin datos';

    if (lista.length === 0) {
        cont.innerHTML = `<div class="hist-vacio"><i class="fa-solid fa-calendar-days"></i><p>Aún no hay días guardados.<br>Se guardan al tocar <strong>Reiniciar día</strong>.</p></div>`;
        return;
    }

    cont.innerHTML = lista.map(d => `
        <button type="button" class="hist-item" onclick="verDiaHistorial(${d.id})">
            <div>
                <div class="hist-fecha">${formatoFechaCorta(d.fecha)}</div>
                <div class="hist-sub">${d.puesto} · Yape S/ ${d.yape.toFixed(2)} · Efectivo S/ ${d.efectivo.toFixed(2)}</div>
            </div>
            <div class="hist-total">S/ ${d.total.toFixed(2)}</div>
        </button>`).join('');
}

let diaAbierto = null;
let borrarTimer = null;

function verDiaHistorial(id) {
    const dia = leerHistorial().find(d => d.id === id);
    if (!dia) return;
    diaAbierto = id;
    resetBotonBorrar();
    document.getElementById('hist_detalle_titulo').innerText = `${formatoFechaCorta(dia.fecha)} · ${dia.puesto}`;
    document.getElementById('result_historial').value = dia.informe;
    document.getElementById('historial_lista_vista').classList.add('d-none');
    document.getElementById('historial_detalle_vista').classList.remove('d-none');
    document.getElementById('historial_footer').classList.remove('d-none');
}

// Primer toque pide confirmar; el segundo (dentro de 3 s) borra el día
function borrarDiaHistorial() {
    const btn = document.getElementById('btn_borrar_dia');
    if (!btn.classList.contains('is-confirm')) {
        btn.classList.add('is-confirm');
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> ¿Borrar?';
        clearTimeout(borrarTimer);
        borrarTimer = setTimeout(resetBotonBorrar, 3000);
        return;
    }
    const lista = leerHistorial().filter(d => d.id !== diaAbierto);
    try { localStorage.setItem(HISTORIAL_KEY, JSON.stringify(lista)); } catch (e) {}
    resetBotonBorrar();
    volverHistorial();
    renderHistorial();
    showToast('Día eliminado del historial');
}

function resetBotonBorrar() {
    clearTimeout(borrarTimer);
    const btn = document.getElementById('btn_borrar_dia');
    if (!btn) return;
    btn.classList.remove('is-confirm');
    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
}

function volverHistorial() {
    document.getElementById('historial_detalle_vista').classList.add('d-none');
    document.getElementById('historial_footer').classList.add('d-none');
    document.getElementById('historial_lista_vista').classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalHistorial');
    if (modal) modal.addEventListener('show.bs.modal', () => { volverHistorial(); renderHistorial(); });
});
