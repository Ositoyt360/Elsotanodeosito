/**
 * V49.6 — La cara de LAIA duerme de noche.
 *  - De 9:00 pm a 5:30 am (hora de El Salvador) la cara se queda dormida: ojos cerrados, Zzz, burbujita,
 *    cabeceo y respiración. Los ronquidos los pone face-sound.js (con pausas para no cansar).
 *  - Si la tocas, le pasas el cursor, abres el panel, le das Me gusta o le preguntas algo, despierta
 *    (bosteza) y vuelve a dormirse sola cuando se queda quieta unos segundos.
 *  - Para probarlo de día: OsitoNight.forzar(true)  ·  volver a la hora real: OsitoNight.forzar(null)
 */
(function () {
    'use strict';
    var F = window.OsitoFace;
    if (!F || !F.caras || !F.caras.length) return;
    var caras = F.caras;
    var durmiendo = false;
    var ultimaConCara = Date.now() - 20000; // al cargar de noche se duerme enseguida
    var forzado = null;
    try { var fz = localStorage.getItem('osito_forzar_noche'); forzado = fz === '1' ? true : (fz === '0' ? false : null); } catch (e) {}

    var INICIO = 21, FIN = 5.5, ESPERA = 12000;

    function esNoche() {
        if (forzado !== null) return forzado;
        var d = new Date(Date.now() - 6 * 3600 * 1000); // El Salvador = UTC-6 todo el año
        var h = d.getUTCHours() + d.getUTCMinutes() / 60;
        return h >= INICIO || h < FIN;
    }
    function visible(c) { return !!(c.offsetParent || (c.getClientRects && c.getClientRects().length)); }

    // Zzz y burbujita de ronquido
    caras.forEach(function (c) {
        if (c.querySelector('.of-zzz')) return;
        c.insertAdjacentHTML('beforeend', '<i class="of-zzz z1">z</i><i class="of-zzz z2">Z</i><i class="of-zzz z3">Z</i><i class="of-bub"></i>');
    });

    function dormir() {
        durmiendo = true;
        caras.forEach(function (c) { F.poner(c, 'sleeping', 0); });
    }
    // sinBostezo = true cuando otra reacción (like, panel, mensaje) toma el control enseguida
    function tocar(sinBostezo) {
        ultimaConCara = Date.now();
        if (!durmiendo) return;
        durmiendo = false;
        caras.forEach(function (c) { if (c.getAttribute('data-expr') === 'sleeping') F.poner(c, null, 0); });
        if (!sinBostezo) F.paraTodas('yawn', 2300);
    }

    function ocupada() {
        return caras.some(function (c) { var e = c.dataset.estado; return e && e !== 'idle'; });
    }
    function exprAjena() { // alguna cara visible con otra emoción (que no sea dormir)
        return caras.some(function (c) { var e = c.getAttribute('data-expr'); return visible(c) && e && e !== 'sleeping' && e !== 'sleepy'; });
    }

    setInterval(function () {
        if (document.hidden) return;
        var noche = esNoche();
        if (!noche) { if (durmiendo) tocar(false); return; }
        if (ocupada()) { if (durmiendo) tocar(true); ultimaConCara = Date.now(); return; }
        if (durmiendo) {
            if (exprAjena()) { durmiendo = false; ultimaConCara = Date.now(); return; } // alguien más la despertó
            // Si algo le quitó la cara de dormir (p. ej. un parpadeo suelto), se la devolvemos.
            caras.forEach(function (c) { if (c.getAttribute('data-expr') !== 'sleeping') F.poner(c, 'sleeping', 0); });
            return;
        }
        if (Date.now() - ultimaConCara > ESPERA && !exprAjena()) dormir();
    }, 1500);

    // Todo lo que la persona hace con la cara la despierta
    caras.forEach(function (c) {
        c.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') tocar(false); });
        c.addEventListener('click', function () { tocar(false); });
    });
    var burbuja = document.querySelector('.ia-toggle-bubble');
    if (burbuja) burbuja.addEventListener('click', function () { tocar(true); });
    var campo = document.getElementById('ai-input');
    if (campo) { campo.addEventListener('input', function () { tocar(true); }, { passive: true }); campo.addEventListener('focus', function () { tocar(true); }); }
    var panel = document.getElementById('ai-section');
    if (panel) panel.addEventListener('pointerdown', function () { ultimaConCara = Date.now(); }, { passive: true });

    window.OsitoNight = {
        duerme: function () { return durmiendo; },
        esNoche: esNoche,
        tocar: tocar,
        dormir: function () { ultimaConCara = 0; dormir(); },
        forzar: function (v) {
            forzado = (v === true || v === false) ? v : null;
            try { if (forzado === null) localStorage.removeItem('osito_forzar_noche'); else localStorage.setItem('osito_forzar_noche', forzado ? '1' : '0'); } catch (e) {}
            if (forzado === true) { ultimaConCara = 0; }
            return esNoche();
        }
    };
}());
