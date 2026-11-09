// MODO CLARO / OSCURO
// Se aplica antes de pintar la página para evitar el parpadeo.
// Si nunca se eligió un modo, sigue el del celular.
(function () {
    let tema = null;
    try { tema = localStorage.getItem('ornela_tema'); } catch (e) {}
    if (tema !== 'dark' && tema !== 'light') {
        tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-bs-theme', tema);
})();

function toggleTema() {
    const nuevo = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', nuevo);
    try { localStorage.setItem('ornela_tema', nuevo); } catch (e) {}
    actualizarIconoTema();
}

function actualizarIconoTema() {
    const oscuro = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const btn = document.getElementById('btn_tema');
    if (btn) btn.innerHTML = oscuro ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oscuro ? '#9D1259' : '#FF1A83');
}

document.addEventListener('DOMContentLoaded', actualizarIconoTema);
