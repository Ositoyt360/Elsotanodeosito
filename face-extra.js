/**
 * V51.2 — La cara de LAIA solo duerme dentro del horario nocturno configurado.
 *  - De 12:30 am a 5:30 am (hora de El Salvador) la cara duerme normalmente.
 *  - Fuera de ese horario NO hay siesta automática ni apagado por inactividad.
 *  - La entrada al sueño nocturno se comprueba al llegar a las 00:30.
 *  - Los ronquidos los pone face-sound.js.
 *  - El horario es estricto: ninguna bandera de localStorage puede adelantar el sueño.
 */
(function () {
    'use strict';
    var F = window.OsitoFace;
    if (!F || !F.caras || !F.caras.length) return;
    var caras = F.caras;
    var durmiendo = false;
    var enSiesta = false;
    var timerSiesta = null;
    var ULTIMO_GUARDADO = 0;
    var ultimaConCara = Date.now();
    var ultimaActividad = Date.now();
    // IMPORTANTE: el sueño NO puede ser forzado por localStorage ni por otra rutina.
    // Versiones anteriores de Claude dejaron una bandera `osito_forzar_noche=1`
    // que podía quedarse guardada y hacer que la cara creyera que siempre era de noche.
    try { localStorage.removeItem('osito_forzar_noche'); } catch (e) {}

    var INICIO = 0.5, FIN = 5.5; // duerme de 12:30 am a 5:30 am (hora de El Salvador)

    function esNoche() {
        // El Salvador es UTC-6 y no usa horario de verano.
        // Usamos UTC directamente para evitar doble conversión con la zona del navegador.
        var d = new Date();
        var utc = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
        var h = utc - 6;
        if (h < 0) h += 24;
        return h >= INICIO && h < FIN;
    }
    if (esNoche()) ultimaConCara = 0; // si abren la página entre 00:30 y 05:30, ya está dormida
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
        // BLOQUEO ABSOLUTO: si no son las 00:30–05:30, jamás entrar en sleeping.
        if (!esNoche()) {
            durmiendo = false; enSiesta = false; limpiarTimerSiesta();
            caras.forEach(function (c) {
                if (c.getAttribute('data-expr') === 'sleeping' || c.getAttribute('data-expr') === 'sleepy') F.poner(c, 'smile', 900);
            });
            return false;
        }
        limpiarTimerSiesta();
        durmiendo = true;
        enSiesta = !!esSiesta;
        caras.forEach(function (c) { F.poner(c, 'sleeping', 0); });
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

    // CINTURÓN PRINCIPAL: cualquier llamada externa a OsitoFace.poner('sleeping'/'sleepy')
    // queda bloqueada durante el día. Esto incluye personalidades, Claude y código antiguo.
    var ponerOriginal = F.poner;
    if (typeof ponerOriginal === 'function' && !F.__ositoSleepGuard) {
        F.poner = function (cara, expr, ms) {
            if (!esNoche() && (expr === 'sleeping' || expr === 'sleepy')) {
                expr = 'smile';
                ms = ms || 900;
            }
            return ponerOriginal.call(F, cara, expr, ms);
        };
        F.__ositoSleepGuard = true;
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
            // Sueño nocturno: no depende de inactividad. Si son las 00:30–05:30, duerme;
            // antes de las 00:30 jamás debe entrar en sleeping por ningún temporizador.
            if (!durmiendo && !exprAjena()) dormir(false);
            return;
        }

        // A las 05:30 termina el sueño nocturno y la cara vuelve a estar activa.
        if (durmiendo && !enSiesta) {
            tocar(true);
        }
        // De día: NUNCA se duerme automáticamente por inactividad.
        // El único sueño automático es el nocturno de 00:30 a 05:30.
        if (durmiendo) {
            tocar(true);
        }
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

    // CINTURÓN DE SEGURIDAD: fuera de 00:30–05:30 ninguna otra rutina puede dejar
    // la cara en 'sleeping'/'sleepy'. Esto también protege contra código antiguo en caché
    // o una personalidad que intente lanzar una expresión de sueño durante el día.
    function corregirSuenoFueraDeHorario() {
        if (esNoche()) return;
        var ahora = Date.now();
        if (ahora - ULTIMO_GUARDADO < 250) return;
        ULTIMO_GUARDADO = ahora;
        caras.forEach(function (c) {
            var e = c.getAttribute('data-expr');
            if (e === 'sleeping' || e === 'sleepy') {
                F.poner(c, 'smile', 900);
            }
        });
        if (durmiendo) { durmiendo = false; enSiesta = false; limpiarTimerSiesta(); }
    }
    setInterval(corregirSuenoFueraDeHorario, 200);

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
        // Se conserva el nombre por compatibilidad, pero ya NO permite alterar el horario real.
        forzar: function () {
            try { localStorage.removeItem('osito_forzar_noche'); } catch (e) {}
            return esNoche();
        }
    };
}());
