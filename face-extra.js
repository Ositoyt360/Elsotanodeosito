/**
 * V99 — SUEÑO NATURAL de la mascota (ya no es un horario rígido).
 *
 *  - A partir de las 2:30 a. m. (hora LOCAL de cada persona) puede empezar a tener sueño. El momento exacto
 *    cambia cada día (unos minutos de diferencia) y el sueño sube poco a poco hasta la madrugada y baja por la mañana.
 *  - Con sueño y SIN interacción durante ~30 s puede quedarse dormida (no siempre al instante: depende de cuánto sueño tenga).
 *  - Dormida: respira, ronca, sueña (face-sound.js) y puede DESPERTAR POR SU CUENTA (se estira, bosteza, mira alrededor).
 *  - Si la persona la TOCA (clic / toque sobre la mascota) o usa la IA (escribe, llama), despierta y reacciona
 *    (susto → bostezo → sonrisa) y avisa a la mente (osito-mente.js) para que diga algo acorde.
 *  - Unos ~30 s después de la última interacción, si todavía tiene sueño, puede volver a dormirse.
 *  - Pasar el cursor por encima o mover la página YA NO la despierta: solo tocarla o hablarle.
 *  - Fuera de la ventana de sueño NUNCA se duerme (cinturón de seguridad intacto).
 *  - Los ronquidos y sueños los pone face-sound.js.
 */
(function () {
    'use strict';
    var F = window.OsitoFace;
    if (!F || !F.caras || !F.caras.length) return;
    var caras = F.caras;
    var durmiendo = false;
    var despertoSola = false;      // se despertó por iniciativa propia (no por la persona)
    var ULTIMO_GUARDADO = 0;
    var ahora0 = Date.now();
    var ultimaInteraccion = ahora0; // última vez que la persona interactuó CON ELLA (tocarla, escribirle, llamarla)
    var durmioDesde = 0;
    var proximoDespertar = 0;       // si duerme: cuándo se despertará sola
    var seguiraDespiertaHasta = 0;  // tras despertar sola o por un toque: ratito mínimo despierta
    // IMPORTANTE: el sueño NO se puede forzar desde localStorage.
    try { localStorage.removeItem('osito_forzar_noche'); } catch (e) {}

    var INACTIVIDAD_PARA_DORMIR = 30000; // ~30 s sin interacción
    var INICIO_H = 2.5;                  // 2:30 a. m. = primera hora a la que puede tener sueño
    var FIN_H = 7.25;                    // hacia las 7 de la mañana se le va el sueño

    /* ---------- Sueño variable (sin horario rígido) ---------- */
    function semilla(fecha) { // número estable 0..1 por día (para que el sueño de hoy no cambie cada minuto)
        var s = fecha.getFullYear() * 400 + (fecha.getMonth() + 1) * 31 + fecha.getDate();
        var x = Math.sin(s * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    }
    function ventanaDeHoy(d) {
        // Si son las 00:00–02:29 pertenece a la "noche" que empezó el día anterior: la ventana es la de hoy igualmente.
        var r1 = semilla(d), r2 = semilla(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 97));
        var ini = INICIO_H + r1 * 0.75;       // entre 2:30 y 3:15
        var fin = FIN_H - 0.5 + r2 * 1.0;     // entre ~6:45 y ~7:45
        return { ini: ini, fin: fin, pico: ini + (fin - ini) * 0.42 };
    }
    function horaDecimal(d) { return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
    function nivelSueno(fecha) {
        try {
            var d = fecha || new Date();
            var h = horaDecimal(d), v = ventanaDeHoy(d);
            if (h < v.ini || h >= v.fin) return 0;
            if (h <= v.pico) return 0.38 + 0.62 * ((h - v.ini) / Math.max(0.01, v.pico - v.ini));
            return 1 - 0.6 * ((h - v.pico) / Math.max(0.01, v.fin - v.pico));
        } catch (e) { return 0; }
    }
    function esNoche() { return nivelSueno() > 0; }

    function visible(c) { return !!(c.offsetParent || (c.getClientRects && c.getClientRects().length)); }
    function mente() { return window.OsitoMente || null; }
    function aviso(evento, datos) { try { var M = mente(); if (M && M.alEventoSueno) M.alEventoSueno(evento, datos || {}); } catch (e) {} }
    function azar(a, b) { return a + Math.random() * (b - a); }

    // Zzz y burbujita de ronquido
    caras.forEach(function (c) {
        if (c.querySelector('.of-zzz')) return;
        c.insertAdjacentHTML('beforeend', '<i class="of-zzz z1">z</i><i class="of-zzz z2">Z</i><i class="of-zzz z3">Z</i><i class="of-bub"></i>');
    });

    function dormir(forzado) {
        // BLOQUEO ABSOLUTO: fuera de la ventana de sueño jamás se entra en sleeping.
        if (!esNoche()) {
            durmiendo = false; despertoSola = false;
            caras.forEach(function (c) {
                if (c.getAttribute('data-expr') === 'sleeping' || c.getAttribute('data-expr') === 'sleepy') F.poner(c, 'smile', 900);
            });
            return false;
        }
        durmiendo = true;
        despertoSola = false;
        durmioDesde = Date.now();
        // entre ~5 y ~22 min de sueño antes de que pueda despertarse sola (más sueño = más tiempo dormida)
        proximoDespertar = durmioDesde + azar(5, 22) * 60000 * (0.6 + 0.6 * nivelSueno());
        caras.forEach(function (c) { F.poner(c, 'sleeping', 0); });
        aviso('dormida', { forzado: !!forzado });
        return true;
    }

    /* Despertar. porPersona = la tocaron / le hablaron. sinBostezo = otra reacción toma el control enseguida. */
    function tocar(sinBostezo, porPersona) {
        var ahora = Date.now();
        if (porPersona !== false) ultimaInteraccion = ahora;
        if (!durmiendo) return false;
        durmiendo = false;
        despertoSola = false;
        seguiraDespiertaHasta = ahora + 8000;
        caras.forEach(function (c) { if (c.getAttribute('data-expr') === 'sleeping') F.poner(c, null, 0); });
        if (!sinBostezo) {
            // susto suave → bostezo → sonrisa (la mente puede añadir palabras y gestos)
            F.paraTodas('wow', 650);
            caras.forEach(function (c) { if (visible(c)) { c.classList.remove('of-boing'); void c.offsetWidth; c.classList.add('of-boing'); setTimeout(function () { c.classList.remove('of-boing'); }, 600); } });
            setTimeout(function () { F.paraTodas('yawn', 2300); }, 700);
        }
        aviso('despierta-por-persona', { toque: !sinBostezo });
        return true;
    }

    function despertarSola() {
        if (!durmiendo) return;
        var ahora = Date.now();
        durmiendo = false;
        despertoSola = true;
        seguiraDespiertaHasta = ahora + azar(40, 150) * 1000;
        caras.forEach(function (c) { if (c.getAttribute('data-expr') === 'sleeping') F.poner(c, null, 0); });
        F.paraTodas('yawn', 2300);
        aviso('despierta-sola', {});
    }

    // CINTURÓN PRINCIPAL: cualquier llamada externa a OsitoFace.poner('sleeping'/'sleepy') queda bloqueada fuera de la ventana de sueño.
    var ponerOriginal = F.poner;
    if (typeof ponerOriginal === 'function' && !F.__ositoSleepGuard) {
        F.poner = function (cara, expr, ms) {
            if (!esNoche() && (expr === 'sleeping' || expr === 'sleepy')) {
                expr = 'smile';
                ms = ms || 900;
            }
            // Dormida, ninguna animación automática (personalidades, entrenamiento...) la despierta: solo la persona o ella misma.
            if (durmiendo && expr && expr !== 'sleeping' && expr !== 'sleepy') return;
            return ponerOriginal.call(F, cara, expr, ms);
        };
        F.__ositoSleepGuard = true;
    }

    function ocupada() {
        return caras.some(function (c) { var e = c.dataset.estado; return e && e !== 'idle'; });
    }
    function enUsoIA() { // panel de IA, llamada o chat en vivo abiertos = la persona está interactuando con ella
        try {
            if (window.ositoEnLlamadaIA) return true;
            var a = document.activeElement;
            if (a && (a.id === 'ai-input' || a.id === 'livechat-input')) return true;
            var p = document.getElementById('ai-section');
            // En ia.html el panel SIEMPRE está 'active': no cuenta como presencia por sí solo.
            if (p && p.classList.contains('active') && !document.body.classList.contains('ia-page')) return true;
            var c = document.getElementById('livechat-section');
            if (c && (c.classList.contains('open') || c.classList.contains('active') || c.classList.contains('show'))) return true;
        } catch (e) {}
        return false;
    }

    setInterval(function () {
        if (document.hidden) return;
        var ahora = Date.now();
        var nivel = nivelSueno();

        if (nivel <= 0) {
            // Terminó la madrugada: si dormía, despierta por la mañana (estirándose).
            if (durmiendo) { despertarSola(); }
            return;
        }

        // ---- Dentro de la ventana de sueño ----
        if (enUsoIA()) {
            // La persona está usando la IA (panel / llamada / escribiendo): despierta y no se duerme.
            ultimaInteraccion = ahora;
            if (durmiendo) tocar(true, true);
            return;
        }
        if (ocupada()) { // pensando / hablando / escuchando
            ultimaInteraccion = ahora;
            if (durmiendo) tocar(true, true);
            return;
        }

        if (durmiendo) {
            // Despertar por iniciativa propia (ratos de sueño ligero).
            if (ahora >= proximoDespertar) despertarSola();
            else caras.forEach(function (c) { if (visible(c) && c.getAttribute('data-expr') !== 'sleeping') ponerOriginal.call(F, c, 'sleeping', 0); });
            return;
        }

        // Despierta: ¿le da sueño? (~30 s sin interacción, sin objetos en uso intensivo, y según el nivel de sueño)
        if (ahora < seguiraDespiertaHasta) return;
        if (ahora - ultimaInteraccion < INACTIVIDAD_PARA_DORMIR) return;
        var M = mente();
        if (M && M.enEscena && M.enEscena()) return;           // está en medio de algo (hablando, reaccionando)
        var p = 0.10 + 0.38 * nivel;                              // probabilidad por revisión (1.5 s)
        if (despertoSola) p *= 0.6;
        if (Math.random() < p) dormir(false);
    }, 1500);

    /* Lo que SÍ la despierta: tocarla (clic/toque), doble clic, tocar la burbuja, escribirle. */
    function alToque(ev) {
        if (ev && ev.isTrusted === false) return;
        ultimaInteraccion = Date.now();
        if (durmiendo) tocar(false, true);
    }
    caras.forEach(function (c) {
        c.addEventListener('pointerdown', alToque, { passive: true });
        c.addEventListener('click', alToque);
        // Pasar el cursor por encima ya NO la despierta: solo se mueve un poquito en sueños.
        c.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'touch') return;
            if (durmiendo) aviso('roce', {});
        });
    });
    var burbuja = document.querySelector('.ia-toggle-bubble');
    if (burbuja) {
        burbuja.addEventListener('pointerdown', alToque, { passive: true });
        burbuja.addEventListener('click', function () { ultimaInteraccion = Date.now(); if (durmiendo) tocar(true, true); });
    }
    var campo = document.getElementById('ai-input');
    if (campo) {
        campo.addEventListener('input', function () { ultimaInteraccion = Date.now(); if (durmiendo) tocar(true, true); }, { passive: true });
        campo.addEventListener('focus', function () { ultimaInteraccion = Date.now(); if (durmiendo) tocar(true, true); });
    }
    // Mensajes del chat de la IA (de la persona o de la mascota) cuentan como interacción.
    document.addEventListener('osito:ia-message', function () {
        ultimaInteraccion = Date.now();
        if (durmiendo) tocar(true, true);
    });
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evento) {
        document.addEventListener(evento, function (ev) {
            // Tocar OTRA cosa de la página no la despierta, pero si es dentro del panel de la IA sí cuenta.
            var t = ev && ev.target;
            if (t && t.closest && t.closest('#ai-section, .ia-toggle-bubble, .osito-face')) {
                ultimaInteraccion = Date.now();
                if (durmiendo && evento !== 'keydown') tocar(true, true);
            }
        }, { passive: true, capture: true });
    });

    // CINTURÓN DE SEGURIDAD: fuera de la ventana de sueño ninguna otra rutina puede dejar la cara en 'sleeping'/'sleepy'.
    function corregirSuenoFueraDeHorario() {
        if (document.hidden || esNoche()) return;
        var ahora = Date.now();
        if (ahora - ULTIMO_GUARDADO < 900) return;
        ULTIMO_GUARDADO = ahora;
        caras.forEach(function (c) {
            var e = c.getAttribute('data-expr');
            if (e === 'sleeping' || e === 'sleepy') F.poner(c, 'smile', 900);
        });
        if (durmiendo) { durmiendo = false; despertoSola = false; }
    }
    setInterval(corregirSuenoFueraDeHorario, 2200);

    // Reacción extra de la mascota al hacer doble clic
    var ANIM_MASCOTA_EXTRA = ['of-spin-joy', 'of-wiggle', 'of-flip-3d', 'of-party-bounce'];
    var SONIDOS_MASCOTA_EXTRA = ['magic', 'party', 'jump', 'robot'];
    caras.forEach(function (c) {
        c.addEventListener('dblclick', function () {
            var anim = ANIM_MASCOTA_EXTRA[Math.floor(Math.random() * ANIM_MASCOTA_EXTRA.length)];
            var snd = SONIDOS_MASCOTA_EXTRA[Math.floor(Math.random() * SONIDOS_MASCOTA_EXTRA.length)];
            c.classList.remove('of-spin-joy', 'of-wiggle', 'of-flip-3d', 'of-party-bounce');
            void c.offsetWidth;
            c.classList.add(anim);
            F.poner(c, 'excited', 1600);
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                window.OsitoFaceSound.reproducir(snd);
            }
            setTimeout(function () { c.classList.remove(anim); }, 700);
        });
    });

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
        esNoche: esNoche,                       // ¿estamos en la ventana en la que PUEDE tener sueño?
        nivelSueno: nivelSueno,                 // 0 (nada) … 1 (muchísimo sueño)
        ventana: function () { var v = ventanaDeHoy(new Date()); return { desde: v.ini, hasta: v.fin, pico: v.pico }; },
        tocar: function (sinBostezo) { return tocar(!!sinBostezo, true); },
        despertar: function (motivo) { return tocar(false, motivo !== 'sola'); },
        dormir: function () { ultimaInteraccion = Date.now() - INACTIVIDAD_PARA_DORMIR - 1; seguiraDespiertaHasta = 0; return dormir(true); },
        despertoSola: function () { return despertoSola; },
        ultimaInteraccion: function () { return ultimaInteraccion; },
        interactuar: function () { ultimaInteraccion = Date.now(); },
        // Se conserva el nombre por compatibilidad, pero NO permite alterar el horario real.
        forzar: function () {
            try { localStorage.removeItem('osito_forzar_noche'); } catch (e) {}
            return esNoche();
        }
    };
}());
