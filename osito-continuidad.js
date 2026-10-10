/* =====================================================================
 * V99 — Continuidad de la música de fondo entre index.html e ia.html
 *
 * En celular la IA es OTRA página (ia.html). Al cambiar de página el navegador
 * corta el audio, así que antes se perdía la música al entrar a la IA.
 *
 *  - index.html guarda (justo antes de salir) qué canción sonaba y en qué segundo.
 *  - ia.html la retoma desde ese mismo punto con el volumen bajo (25 %).
 *  - Al volver al Sótano, index.html la retoma desde donde la dejó la IA.
 *
 * Si la persona había pausado la música, NO se enciende sola.
 * Si el navegador bloquea el audio sin toque previo, arranca en el primer toque.
 * ===================================================================== */
(function () {
    'use strict';

    var CLAVE = 'osito_music_continuity';
    var VOLUMEN_EN_IA = 0.25;      // 25 % (pedido: entre 20 % y 30 %)
    var VIGENCIA_MS = 25000;       // el estado guardado solo vale unos segundos
    var audioIA = null;

    function leer() {
        try {
            var raw = localStorage.getItem(CLAVE);
            if (!raw) return null;
            var d = JSON.parse(raw);
            return d && typeof d === 'object' ? d : null;
        } catch (e) { return null; }
    }
    function escribir(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) {} }
    function borrar() { try { localStorage.removeItem(CLAVE); } catch (e) {} }
    function vigente(d) { return !!(d && d.at && (Date.now() - d.at) < VIGENCIA_MS); }

    function alPrimerToque(fn) {
        // Solo estos eventos cuentan como "gesto" para reproducir audio en el celular.
        var evs = ['touchend', 'pointerup', 'click', 'keydown'];
        var h = function () {
            evs.forEach(function (e) { document.removeEventListener(e, h, true); });
            fn();
        };
        evs.forEach(function (e) { document.addEventListener(e, h, { capture: true, passive: true }); });
    }

    function intentarPlay(el, siBloquea) {
        try {
            var p = el.play();
            if (p && typeof p.catch === 'function') p.catch(function () { if (siBloquea) siBloquea(); });
        } catch (e) { if (siBloquea) siBloquea(); }
    }

    function posicionEstimada(d, el) {
        var t = Number(d.t) || 0;
        if (d.playing) t += (Date.now() - d.at) / 1000;
        var dur = el && isFinite(el.duration) ? el.duration : 0;
        if (dur > 0) t = t % dur;
        return Math.max(0, t);
    }

    /* ---------- index.html: guardar justo antes de salir ---------- */
    function guardarDesdeElemento(el) {
        if (!el) return;
        var src = el.getAttribute('src') || el.currentSrc || '';
        if (!src) return;
        escribir({
            src: src,
            t: Number(el.currentTime) || 0,
            playing: !el.paused && !el.ended,
            vol: Number(el.volume),
            at: Date.now()
        });
    }
    function guardarMusica() { guardarDesdeElemento(document.getElementById('bg-music')); }

    /* ---------- index.html: retomar al volver ---------- */
    function aplicarEnIndex(audio) {
        if (!audio) return false;
        var d = leer();
        if (!vigente(d) || !d.playing) return false;
        var mismo = false;
        try { mismo = new URL(d.src, location.href).href === new URL(audio.getAttribute('src') || '', location.href).href; } catch (e) {}
        if (!mismo) return false;
        var ir = function () { try { audio.currentTime = posicionEstimada(d, audio); } catch (e) {} };
        if (audio.readyState >= 1) ir();
        else audio.addEventListener('loadedmetadata', ir, { once: true });
        borrar();
        return true;
    }
    function reanudarEnIndex() {
        var audio = document.getElementById('bg-music');
        if (!audio) return;
        var d = leer();
        if (!vigente(d) || !d.playing) return;
        if (!audio.paused) { borrar(); return; }
        if (!aplicarEnIndex(audio)) return;
        intentarPlay(audio, function () { alPrimerToque(function () { intentarPlay(audio); }); });
    }

    /* ---------- ia.html: seguir sonando, bajita ---------- */
    function iniciarEnIA() {
        var d = leer();
        if (!vigente(d) || !d.playing || !d.src) return;     // pausada o sin estado: no se enciende sola
        if (audioIA) return;

        var el = new Audio();
        el.id = 'bg-music-ia';
        el.loop = true;
        el.preload = 'auto';
        el.setAttribute('playsinline', '');
        var volUsuario = (typeof d.vol === 'number' && isFinite(d.vol)) ? d.vol : VOLUMEN_EN_IA;
        el.volume = Math.max(0, Math.min(VOLUMEN_EN_IA, volUsuario));   // nunca más fuerte que 25 %
        el.src = d.src;
        audioIA = el;
        window.__ositoMusicaIA = el;

        el.addEventListener('loadedmetadata', function () {
            try { el.currentTime = posicionEstimada(d, el); } catch (e) {}
        }, { once: true });

        intentarPlay(el, function () { alPrimerToque(function () { intentarPlay(el); }); });
    }

    function guardarAlSalirDeIA() {
        if (audioIA) guardarDesdeElemento(audioIA);
        else { var d = leer(); if (d) { d.at = Date.now(); escribir(d); } }
    }

    window.OsitoContinuidad = {
        VOLUMEN_EN_IA: VOLUMEN_EN_IA,
        guardarMusica: guardarMusica,
        aplicarEnIndex: aplicarEnIndex,
        reanudarEnIndex: reanudarEnIndex,
        iniciarEnIA: iniciarEnIA,
        alPrimerToque: alPrimerToque
    };

    var esIA = /\/ia(\.html)?\/?$/i.test(location.pathname);

    if (esIA) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarEnIA);
        else iniciarEnIA();
        window.addEventListener('pagehide', guardarAlSalirDeIA);
    } else {
        // index.html: guardar siempre al salir (además del guardado explícito al abrir la IA)
        window.addEventListener('pagehide', guardarMusica);
        window.addEventListener('pageshow', function (e) { if (e.persisted) reanudarEnIndex(); });
    }
})();
