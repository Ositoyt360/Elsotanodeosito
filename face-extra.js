/**
 * V51.1 — La cara de LAIA duerme de noche (9:00 pm a 5:30 am) y de día se duerme tras 8 min sin actividad.
 *  - De 9:00 pm a 5:30 am (hora de El Salvador) la cara duerme normalmente.
 *  - De día, si pasan 8 minutos sin actividad del usuario, se echa una siesta de 15 minutos.
 *  - Cualquier actividad del usuario durante la siesta la despierta inmediatamente.
 *  - Los ronquidos los pone face-sound.js.
 *  - Para probarlo de día: OsitoNight.forzar(true)  ·  volver a la hora real: OsitoNight.forzar(null)
 */
(function () {
    'use strict';
    var F = window.OsitoFace;
    if (!F || !F.caras || !F.caras.length) return;
    var caras = F.caras;
    var durmiendo = false;
    var enSiesta = false;
    var timerSiesta = null;
    var ultimaConCara = Date.now();
    var ultimaActividad = Date.now();
    var forzado = null;
    try { var fz = localStorage.getItem('osito_forzar_noche'); forzado = fz === '1' ? true : (fz === '0' ? false : null); } catch (e) {}

    var INICIO = 21, FIN = 5.5;
    var ESPERA_NOCHE = 30 * 1000; // de noche duerme tras 30 s sin tocarla (así no se duerme mientras alguien escribe)
    var ESPERA_SIESTA = 8 * 60 * 1000;
    var DURACION_SIESTA = 15 * 60 * 1000;

    function esNoche() {
        if (forzado !== null) return forzado;
        var d = new Date(Date.now() - 6 * 3600 * 1000); // El Salvador = UTC-6 todo el año
        var h = d.getUTCHours() + d.getUTCMinutes() / 60;
        return h >= INICIO || h < FIN;
    }
    if (esNoche()) ultimaConCara = 0; // si abren la página entre 9 pm y 5:30 am, ya está dormida
    function visible(c) { return !!(c.offsetParent || (c.getClientRects && c.getClientRects().length)); }

    // Zzz y burbujita de ronquido
    caras.forEach(function (c) {
        if (c.querySelector('.of-zzz')) return;
        c.insertAdjacentHTML('beforeend', '<i class="of-zzz z1">z</i><i class="of-zzz z2">Z</i><i class="of-zzz z3">Z</i><i class="of-bub"></i>');
    });

    function limpiarTimerSiesta() {
        if (timerSiesta) { clearTimeout(timerSiesta); timerSiesta = null; }
    }
    function dormir(esSiesta) {
        limpiarTimerSiesta();
        durmiendo = true;
        enSiesta = !!esSiesta;
        caras.forEach(function (c) { F.poner(c, 'sleeping', 0); });
        if (enSiesta) {
            timerSiesta = setTimeout(function () {
                timerSiesta = null;
                if (durmiendo && enSiesta && !document.hidden) tocar(false);
            }, DURACION_SIESTA);
        }
    }
    // sinBostezo = true cuando otra reacción toma el control enseguida.
    function tocar(sinBostezo) {
        ultimaConCara = Date.now();
        ultimaActividad = Date.now();
        if (!durmiendo) { enSiesta = false; limpiarTimerSiesta(); return; }
        var eraSiesta = enSiesta;
        durmiendo = false;
        enSiesta = false;
        limpiarTimerSiesta();
        caras.forEach(function (c) { if (c.getAttribute('data-expr') === 'sleeping') F.poner(c, null, 0); });
        if (!sinBostezo) F.paraTodas('yawn', 2300);
        return eraSiesta;
    }

    function registrarActividad(ev) {
        // Ignora eventos falsos de scripts y el scroll automático de carruseles/chat: solo cuenta la persona.
        if (ev && ev.isTrusted === false) return;
        if (ev && ev.type === 'scroll' && ev.target !== document && ev.target !== document.documentElement && ev.target !== document.body) return;
        ultimaActividad = Date.now();
        ultimaConCara = ultimaActividad;
        if (durmiendo && !esNoche()) tocar(true);
    }

    function ocupada() {
        return caras.some(function (c) { var e = c.dataset.estado; return e && e !== 'idle'; });
    }
    function exprAjena() { // alguna cara visible con otra emoción (que no sea dormir)
        return caras.some(function (c) { var e = c.getAttribute('data-expr'); return visible(c) && e && e !== 'sleeping' && e !== 'sleepy'; });
    }

    setInterval(function () {
        if (document.hidden) return;
        var ahora = Date.now();
        var noche = esNoche();
        if (noche) {
            if (enSiesta) { limpiarTimerSiesta(); enSiesta = false; }
            if (ocupada()) { if (durmiendo) tocar(true); ultimaConCara = ahora; return; }
            if (durmiendo) {
                if (exprAjena()) { tocar(true); return; }
                caras.forEach(function (c) { if (c.getAttribute('data-expr') !== 'sleeping') F.poner(c, 'sleeping', 0); });
                return;
            }
            // Sueño nocturno igual que antes: solo se duerme tras estar quieta.
            if (ahora - ultimaConCara > ESPERA_NOCHE && !exprAjena()) dormir(false);
            return;
        }

        // De día NO entra el sueño nocturno: solo una siesta después de 8 min sin actividad.
        if (durmiendo) {
            if (exprAjena()) { tocar(true); return; }
            caras.forEach(function (c) { if (c.getAttribute('data-expr') !== 'sleeping') F.poner(c, 'sleeping', 0); });
            return;
        }
        if (!ocupada() && !exprAjena() && ahora - ultimaActividad >= ESPERA_SIESTA) dormir(true);
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
    if (panel) panel.addEventListener('pointerdown', registrarActividad, { passive: true });

    // Actividad real de la página: cualquier toque/clic/tecla/scroll despierta la siesta.
    ['pointerdown','keydown','touchstart','wheel','scroll','click'].forEach(function (evento) {
        document.addEventListener(evento, registrarActividad, { passive: true, capture: true });
    });
    document.addEventListener('pointermove', function () {
        // No actualizamos en cada píxel; basta una vez por ~1 s.
        var ahora = Date.now();
        if (ahora - ultimaActividad > 900) registrarActividad();
    }, { passive: true, capture: true });

    // V51.1: cada emoción nueva lanza su emoji UNA vez (si la emoción no cambia, no se repite).
    function reiniciarEmoji(c) {
        var sp = c.querySelector('.of-spark');
        if (!sp) return;
        sp.style.setProperty('animation', 'none', 'important');
        void sp.offsetWidth;
        sp.style.removeProperty('animation');
    }
    if ('MutationObserver' in window) {
        caras.forEach(function (c) {
            new MutationObserver(function (lista) {
                lista.forEach(function (m) {
                    var ahora = c.getAttribute(m.attributeName) || '';
                    if (ahora && ahora !== (m.oldValue || '')) reiniciarEmoji(c);
                });
            }).observe(c, { attributes: true, attributeFilter: ['data-expr', 'data-estado'], attributeOldValue: true });
        });
    }

    window.OsitoNight = {
        duerme: function () { return durmiendo; },
        esNoche: esNoche,
        tocar: tocar,
        dormir: function () { ultimaConCara = 0; ultimaActividad = Date.now(); dormir(false); },
        forzar: function (v) {
            forzado = (v === true || v === false) ? v : null;
            try { if (forzado === null) localStorage.removeItem('osito_forzar_noche'); else localStorage.setItem('osito_forzar_noche', forzado ? '1' : '0'); } catch (e) {}
            if (forzado === true) { ultimaConCara = 0; }
            return esNoche();
        }
    };
}());
