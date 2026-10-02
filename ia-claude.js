/**
 * IA de El Sótano de Osito — cara animada + respuestas locales (V49.5, sin Claude)
 *
 * 1) Cara: estados idle / listening / thinking / speaking sobre todos los
 *    elementos .osito-face (burbuja y cabecera del panel). Los ojos se mueven
 *    solos, siguen el puntero en escritorio y la boca se anima al hablar.
 * 2) Claude: window.OsitoIA.preguntar() llama a /api/ia (el servidor guarda la
 *    llave; aquí nunca hay llaves). Si el servidor no responde se devuelve
 *    { error } y la página usa su mensaje local de siempre.
 */
(function () {
    'use strict';

    var caras = Array.prototype.slice.call(document.querySelectorAll('.osito-face'));
    var estadoTexto = document.getElementById('ia-face-status-text');
    var flags = { escuchando: false, pensando: false, hablando: false };
    var estadoActual = '';

    var TEXTOS = {
        idle: 'En línea · modo local',
        listening: 'Escuchando…',
        thinking: 'Pensando…',
        speaking: 'Hablando…'
    };

    function sinAnimaciones() {
        var c = document.body.classList;
        return c.contains('no-animations') || c.contains('ultra-performance');
    }
    // V49.4: estas dos se usaban desde aquí pero vivían en el bloque de abajo (ReferenceError silencioso).
    function quieta() { return sinAnimaciones(); }
    function paraTodas(expr, ms) { if (window.OsitoFace && window.OsitoFace.paraTodas) window.OsitoFace.paraTodas(expr, ms); }

    function pintarEstado(estado) {
        if (estado === estadoActual) return;
        estadoActual = estado;
        caras.forEach(function (cara) { cara.dataset.estado = estado; });
        if (estadoTexto) estadoTexto.textContent = TEXTOS[estado] || TEXTOS.idle;
    }

    function recalcular() {
        var estado = flags.hablando ? 'speaking' : (flags.pensando ? 'thinking' : (flags.escuchando ? 'listening' : 'idle'));
        pintarEstado(estado);
    }

    // Parpadeo desfasado para que las caras no parpadeen todas a la vez.
    caras.forEach(function (cara, i) { cara.style.setProperty('--bd', (-(i * 3.1 + 0.7)).toFixed(1) + 's'); });
    pintarEstado('idle');

    /* ---------- Mirada: movimientos solos + seguir el puntero ---------- */
    var punteroActivoHasta = 0;
    var frameMirada = 0;

    function mirar(cara, x, y) {
        cara.style.setProperty('--gx', x.toFixed(2));
        cara.style.setProperty('--gy', y.toFixed(2));
    }

    function mirarAlAzar() {
        if (document.hidden || sinAnimaciones() || Date.now() < punteroActivoHasta) return;
        if (estadoActual === 'thinking') return; // la animación de "pensar" ya mueve los ojos
        caras.forEach(function (cara) {
            if (!cara.offsetParent) return; // oculta (panel cerrado)
            var centro = Math.random() < 0.35;
            mirar(cara, centro ? 0 : (Math.random() * 2 - 1), centro ? 0 : (Math.random() * 1.4 - 0.7));
        });
    }

    (function programarMirada() {
        var espera = (estadoActual === 'speaking' ? 700 : 1800) + Math.random() * 2400;
        setTimeout(function () { mirarAlAzar(); programarMirada(); }, espera);
    }());

    var puedeSeguirPuntero = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (puedeSeguirPuntero) {
        var px = 0, py = 0;
        document.addEventListener('pointermove', function (e) {
            if (sinAnimaciones()) return;
            px = e.clientX; py = e.clientY;
            if (frameMirada) return;
            frameMirada = requestAnimationFrame(function () {
                frameMirada = 0;
                punteroActivoHasta = Date.now() + 1800;
                caras.forEach(function (cara) {
                    if (!cara.offsetParent) return;
                    var r = cara.getBoundingClientRect();
                    var dx = (px - (r.left + r.width / 2)) / Math.max(180, window.innerWidth * 0.35);
                    var dy = (py - (r.top + r.height / 2)) / Math.max(180, window.innerHeight * 0.35);
                    dx = Math.max(-1, Math.min(1, dx));
                    dy = Math.max(-1, Math.min(1, dy));
                    mirar(cara, dx, dy);
                    cara.style.setProperty('--ry', (dx * 12).toFixed(1) + 'deg');
                    cara.style.setProperty('--rx', (-dy * 10).toFixed(1) + 'deg');
                });
            });
        }, { passive: true });
        document.addEventListener('pointerleave', function () {
            caras.forEach(function (cara) { mirar(cara, 0, 0); cara.style.setProperty('--rx', '0deg'); cara.style.setProperty('--ry', '0deg'); });
        });
    }

    /* ---------- Hablar: se engancha a la voz del navegador ---------- */
    var synth = window.speechSynthesis;
    var pendientes = 0;
    var vigilante = null;

    /* Sincronía labial: la boca cambia de forma con cada "sílaba" (ancho, alto, redondez). */
    var VISEMAS = [[.5, .16, 0], [.85, .6, .2], [1, 1, 0], [.62, .95, 1], [.92, .42, 0], [.45, .1, 0], [.75, .8, .6]];
    var lipTimer = 0, visemaPrevio = -1, emphTimer = 0;
    function equipoLento() { var h = document.documentElement.classList; return h.contains('low-end-device') || h.contains('mobile-lite'); }
    function pasoLabios() {
        lipTimer = 0;
        if (!flags.hablando) return;
        var cerrar = Math.random() < .18, v;
        if (cerrar) v = [.5, .05, 0];
        else {
            var i; do { i = Math.floor(Math.random() * VISEMAS.length); } while (i === visemaPrevio);
            visemaPrevio = i; v = VISEMAS[i];
        }
        caras.forEach(function (c) {
            if (!c.offsetParent) return;
            c.style.setProperty('--mw', v[0]); c.style.setProperty('--mh', v[1]); c.style.setProperty('--mr', v[2]);
        });
        lipTimer = setTimeout(pasoLabios, (cerrar ? 110 : 75 + Math.random() * 85) * (equipoLento() ? 1.7 : 1));
    }
    function iniciarLabios() {
        if (sinAnimaciones()) return;
        caras.forEach(function (c) { c.classList.add('of-lipsync'); });
        if (!lipTimer) pasoLabios();
    }
    function detenerLabios() {
        clearTimeout(lipTimer); lipTimer = 0;
        caras.forEach(function (c) {
            c.classList.remove('of-lipsync', 'of-emph');
            c.style.removeProperty('--mw'); c.style.removeProperty('--mh'); c.style.removeProperty('--mr');
        });
    }
    // Énfasis: en cada palabra (si el navegador avisa) las cejas dan un saltito y la boca se abre más.
    function enfatizar() {
        if (!flags.hablando || sinAnimaciones()) return;
        caras.forEach(function (c) {
            if (!c.offsetParent) return;
            c.style.setProperty('--mw', 1); c.style.setProperty('--mh', 1); c.style.setProperty('--mr', 0);
            c.classList.add('of-emph');
        });
        clearTimeout(emphTimer);
        emphTimer = setTimeout(function () { caras.forEach(function (c) { c.classList.remove('of-emph'); }); }, 170);
    }

    function empezoAHablar() {
        flags.hablando = true;
        iniciarLabios();
        recalcular();
        if (!vigilante) {
            // Por si el navegador cancela la voz sin avisar: apaga la boca.
            vigilante = setInterval(function () {
                if (synth && !synth.speaking && !synth.pending) { pendientes = 0; terminoDeHablar(true); }
            }, 900);
        }
    }
    function terminoDeHablar(forzar) {
        if (!forzar) pendientes = Math.max(0, pendientes - 1);
        if (pendientes > 0) return;
        flags.hablando = false;
        detenerLabios();
        if (vigilante) { clearInterval(vigilante); vigilante = null; }
        recalcular();
    }

    if (synth && typeof synth.speak === 'function') {
        var speakOriginal = synth.speak.bind(synth);
        synth.speak = function (utterance) {
            try {
                pendientes += 1;
                utterance.addEventListener('start', empezoAHablar);
                utterance.addEventListener('boundary', enfatizar);
                utterance.addEventListener('end', function () { terminoDeHablar(false); });
                utterance.addEventListener('error', function () { terminoDeHablar(false); });
            } catch (e) { /* si algo falla, la voz sigue funcionando igual */ }
            return speakOriginal(utterance);
        };
    }

    // Escuchando / procesando (lo emite asistente-voz.js al usar el micrófono).
    document.addEventListener('voiceassistant:state', function (e) {
        var s = e && e.detail && e.detail.state;
        flags.escuchando = s === 'listening';
        if (s === 'processing') { flags.pensando = true; }
        else if (s !== 'processing' && !pidiendoAClaude) { flags.pensando = false; }
        recalcular();
    });

    /* ---------- Claude ---------- */
    var pidiendoAClaude = false;
    var aiMessages = document.getElementById('ai-messages');

    function historialDesdePantalla(preguntaActual) {
        if (!aiMessages) return [];
        var lista = [];
        Array.prototype.forEach.call(aiMessages.querySelectorAll('.msg.user, .msg.bot'), function (nodo) {
            if (nodo.classList.contains('typing')) return;
            var texto = (nodo.textContent || '').replace(/^🤖\s*/, '').trim();
            if (!texto || nodo.querySelector('button')) return;
            lista.push({ role: nodo.classList.contains('user') ? 'user' : 'assistant', text: texto });
        });
        // La pregunta actual ya está pintada como último mensaje del usuario: el servidor la agrega aparte.
        var ultimo = lista[lista.length - 1];
        if (ultimo && ultimo.role === 'user' && ultimo.text === preguntaActual) lista.pop();
        return lista.slice(-8);
    }

    function mostrarEscribiendo() {
        if (!aiMessages) return function () {};
        var burbuja = document.createElement('div');
        burbuja.className = 'msg bot typing';
        burbuja.setAttribute('aria-label', 'La mascotita del Sotano está escribiendo');
        burbuja.innerHTML = '<i></i><i></i><i></i>';
        aiMessages.appendChild(burbuja);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        return function () { if (burbuja.parentNode) burbuja.parentNode.removeChild(burbuja); };
    }

    /**
     * Pregunta a Claude. Devuelve { texto } o { error }.
     * error: 'sin_conexion' | 'ia_no_configurada' | 'muy_rapido' | 'limite_dia' | 'limite_total' | 'ia_no_disponible'
     */
    function preguntar() {
        // V49.5: la IA funciona 100% local. No se llama a ningún servidor.
        return Promise.resolve({ error: 'ia_local' });
    }

    /* ---------- Respuestas libres sin Claude (chistes, datos, cuentas, charla) ---------- */
    var CHISTES = [
        '¿Qué hace un pez en el agua? ¡Nada! 🐟',
        '¿Por qué los pájaros vuelan al sur? Porque caminando tardarían muchísimo. 🐦',
        '¿Cómo se despiden los químicos? Ácido un placer. 🧪',
        '¿Qué le dice un jardinero a otro? Disfruta mientras puedas, que la vida es un rato… ¡de cultivo! 🌱',
        '¿Cuál es el colmo de un electricista? Que su esposa se llame Luz y no lo ilumine. 💡',
        '¿Qué le dice un creeper a un jugador? Ssssss… ¡qué buen día para abrazarte! 💥',
        '¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas. 📘',
        '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝',
        '¿Cómo se llama el campeón de buceo japonés? Tokofondo. 🤿',
        '¿Qué le dijo un zombi a otro en Minecraft? ¡Vamos a quedarnos en casa, que afuera está oscuro! 🧟'
    ];
    var DATOS = [
        'Los pulpos tienen tres corazones y su sangre es azul. 🐙',
        'La miel jamás se echa a perder: se han encontrado tarros comestibles de hace miles de años. 🍯',
        'En Minecraft, los creepers nacieron por un error al programar un cerdo. 💚',
        'Los koalas duermen hasta 20 horas al día. 🐨',
        'Un rayo es unas cinco veces más caliente que la superficie del Sol. ⚡',
        'Las nutrias se toman de la mano al dormir para no separarse. 🦦',
        'El corazón de una ballena azul es del tamaño de un carro pequeño. 🐋',
        'Los plátanos son ligeramente radiactivos por su potasio, ¡pero totalmente seguros! 🍌'
    ];
    var turnos = { chiste: 0, dato: 0 };
    function plano(t) {
        return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function siguiente(lista, clave) {
        var i = (turnos[clave] + Math.floor(Math.random() * lista.length)) % lista.length;
        turnos[clave] += 1;
        return lista[i];
    }
    /* Calculadora: entiende "3443 mas 2", "12 x 8", "100 entre 4", "20% de 150", "raiz cuadrada de 81"…
       Usa un analizador propio (sin eval/Function), así que solo puede hacer matemáticas. */
    function evaluar(s) {
        var i = 0;
        function ws() { while (s.charAt(i) === ' ') i++; }
        function num() {
            ws();
            var m = /^\d+(\.\d+)?/.exec(s.slice(i));
            if (!m) throw 0;
            i += m[0].length;
            return parseFloat(m[0]);
        }
        function prim() {
            ws();
            var c = s.charAt(i);
            if (c === '(') { i++; var v = suma(); ws(); if (s.charAt(i) !== ')') throw 0; i++; return v; }
            if (c === '-') { i++; return -prim(); }
            if (c === '+') { i++; return prim(); }
            return num();
        }
        function pot() {
            var base = prim();
            ws();
            if (s.charAt(i) === '*' && s.charAt(i + 1) === '*') { i += 2; return Math.pow(base, pot()); }
            return base;
        }
        function prod() {
            var v = pot();
            for (;;) {
                ws();
                var c = s.charAt(i);
                if (c === '*' && s.charAt(i + 1) !== '*') { i++; v *= pot(); }
                else if (c === '/') { i++; var d = pot(); if (d === 0) throw 'div0'; v /= d; }
                else return v;
            }
        }
        function suma() {
            var v = prod();
            for (;;) {
                ws();
                var c = s.charAt(i);
                if (c === '+') { i++; v += prod(); }
                else if (c === '-') { i++; v -= prod(); }
                else return v;
            }
        }
        var r = suma(); ws();
        if (i < s.length) throw 0;
        return r;
    }
    function fmtNum(n) {
        var r = Math.round(n * 1e6) / 1e6;
        return Math.abs(r) >= 10000 && Number.isInteger(r) ? r.toLocaleString('es-SV').replace(/,/g, ' ') : String(r).replace('.', ',');
    }
    var ALEGRES = ['¡Fácil! ', '¡Listo! ', 'A ver… ', '¡Cuentas claras! '];
    function calcular(pregunta) {
        var t = String(pregunta || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!t || t.length > 90 || !/\d/.test(t)) return null;
        var m = /(\d+(?:[.,]\d+)?)\s*(?:%|por ciento)\s*de\s*(\d+(?:[.,]\d+)?)/.exec(t);
        if (m) {
            var p = parseFloat(m[1].replace(',', '.')), base = parseFloat(m[2].replace(',', '.'));
            return 'El ' + m[1] + '% de ' + m[2] + ' es ' + fmtNum(p / 100 * base) + '. 🧮';
        }
        m = /raiz cuadrada de (\d+(?:[.,]\d+)?)/.exec(t);
        if (m) return 'La raíz cuadrada de ' + m[1] + ' es ' + fmtNum(Math.sqrt(parseFloat(m[1].replace(',', '.')))) + '. 🧮';
        var e = ' ' + t + ' ';
        e = e.replace(/\bcuanto (es|son|da|dan|seria|sera)\b/g, ' ')
             .replace(/\bcual es el resultado de\b/g, ' ')
             .replace(/\bpor favor\b/g, ' ')
             .replace(/\b(multiplicado por|multiplicado|multiplicar)\b/g, ' * ')
             .replace(/\b(dividido entre|dividido por|dividido|dividir)\b/g, ' / ')
             .replace(/\belevado a(?: la)?\b/g, ' ** ')
             .replace(/\bal cuadrado\b/g, ' ** 2 ')
             .replace(/\bal cubo\b/g, ' ** 3 ')
             .replace(/\bpor\b/g, ' * ').replace(/\bentre\b/g, ' / ')
             .replace(/\bmas\b/g, ' + ').replace(/\bmenos\b/g, ' - ')
             .replace(/(\d)\s*[x×]\s*(?=[\d(])/g, '$1 * ').replace(/÷/g, ' / ').replace(/\^/g, ' ** ')
             .replace(/(\d),(\d)/g, '$1.$2')
             .replace(/\b(calcula|calcular|calculame|resuelve|resolver|dime|dame|resultado|operacion|suma|cuenta|ayudame|con|el|la|de|me|es|son|igual|que|esto|porfa)\b/g, ' ')
             .replace(/=/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^\d+(-\d+)+$/.test(e)) return null; // fechas / teléfonos (2026-10-02)
        if (!e || !/^[\d\s+\-*/().]+$/.test(e) || !/\d\s*(\*\*|[+\-*/])\s*[\d(\-]/.test(e)) return null;
        try {
            var r = evaluar(e);
            if (typeof r !== 'number' || !isFinite(r) || Math.abs(r) > 1e15) return null;
            var bonito = e.replace(/\*\*/g, '^').replace(/\*/g, '×').replace(/\//g, '÷').replace(/\s+/g, ' ').replace(/\./g, ',');
            return ALEGRES[Math.floor(Math.random() * ALEGRES.length)] + bonito + ' = ' + fmtNum(r) + '. 🧮';
        } catch (x) {
            return x === 'div0' ? 'No se puede dividir entre cero, ni en Minecraft. 😅' : null;
        }
    }
    function respuestaLibre(pregunta) {
        var t = plano(pregunta);
        if (!t) return null;
        if (/\b(chiste|broma|hazme reir|chistoso)\b/.test(t)) return siguiente(CHISTES, 'chiste');
        if (/dato curioso|curiosidad|sabias que|dime algo (interesante|curioso)/.test(t)) return siguiente(DATOS, 'dato');
        var c = calcular(pregunta); if (c) return c;
        if (/\b(gracias|muchas gracias|thx|thanks)\b/.test(t)) return '¡De nada! Aquí estoy para lo que necesites. 😄';
        if (/\b(adios|chao|chau|nos vemos|hasta luego|bye)\b/.test(t)) return '¡Hasta luego! Vuelve cuando quieras al Sótano. 👋';
        if (/como estas|que tal estas|como te va|como andas/.test(t)) return '¡Muy bien, con mucha energía! Gracias por preguntar. ¿Y tú cómo estás? 😊';
        if (/quien eres|como te llamas|que eres|eres una ia|eres un robot/.test(t)) return 'Soy La mascotita del Sotano, vivo aquí mismo en la página. Puedo contarte sobre el canal, chistes, datos curiosos y más. 🤖';
        if (/ayuda.*(tarea|deber)|tarea|deberes/.test(t)) return 'Claro. Cuéntame de qué materia es y qué te piden, y lo vemos paso a paso. 📚';
        return null;
    }
    function mensajeSinClaude(codigo) {
        if (codigo === 'ia_local' || codigo === 'ia_no_configurada' || codigo === 'ia_no_disponible' || codigo === 'ia_tiempo_agotado' || codigo === 'ia_sin_respuesta') {
            return 'Eso todavía no lo sé. Pregúntame sobre el canal, pídeme un chiste, un dato curioso o una cuenta sencilla. 🙏';
        }
        return null;
    }
    if (estadoTexto) { estadoTexto.textContent = TEXTOS.idle; estadoTexto.dataset.iaOk = '1'; }

    window.OsitoIA = {
        calcular: calcular,
        respuestaLibre: respuestaLibre,
        mensajeSinClaude: mensajeSinClaude,
        preguntar: preguntar,
        mensajeDeError: function () { return null; } // V49.5: sin servidor, siempre se usan las respuestas locales
    };

    /* ---------- Caja de texto: crece sola y Enter envía ---------- */
    var campo = document.getElementById('ai-input');
    var formulario = document.getElementById('ai-form');
    if (campo && campo.tagName === 'TEXTAREA') {
        var ajustar = function () {
            campo.style.height = 'auto';
            campo.style.height = Math.min(110, Math.max(38, campo.scrollHeight)) + 'px';
        };
        campo.addEventListener('input', ajustar);
        campo.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                if (formulario && campo.value.trim()) {
                    if (typeof formulario.requestSubmit === 'function') formulario.requestSubmit();
                    else formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }
        });
        if (formulario) formulario.addEventListener('submit', function () { setTimeout(ajustar, 0); });
    }

    // Reacción natural: la cara elige su emoción según LO QUE DICE el mensaje (ver OsitoFace.reaccionarTexto).
    // Si es un mensaje del usuario, se pone curiosa.
    document.addEventListener('osito:ia-message', function (e) {
        if (quieta()) return;
        var rol = e && e.detail && e.detail.role;
        if (rol === 'bot') {
            if (window.OsitoFace) window.OsitoFace.reaccionarTexto(e.detail.text);
            caras.forEach(function (cara) {
                cara.classList.remove('of-boing');
                void cara.offsetWidth;
                cara.classList.add('of-boing');
            });
        } else if (rol === 'user') {
            paraTodas('curious', 950);
        }
    });

    // Al cerrar el panel o ocultar la pestaña, las caras se quedan quietas.
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) caras.forEach(function (cara) { mirar(cara, 0, 0); });
    });
}());


/* ===== V49 — La cara tiene vida: cejas, mejillas, sonrisa, guiños, sueño y reacciones ===== */
(function () {
    'use strict';
    var caras = Array.prototype.slice.call(document.querySelectorAll('.osito-face'));
    if (!caras.length) return;
    var cuerpo = document.body, html = document.documentElement;
    var EXPRESIONES = ['smile', 'wink', 'curious', 'wow', 'love', 'yawn', 'excited', 'confused', 'laugh', 'shy', 'cool', 'kiss', 'dance'];
    function esDeNoche() { return !!(window.OsitoNight && window.OsitoNight.esNoche && window.OsitoNight.esNoche()); }
    var ultimaActividad = Date.now(), dormida = false;

    function quieta() {
        var c = cuerpo.classList;
        return c.contains('no-animations') || c.contains('ultra-performance');
    }
    caras.forEach(function (cara) {
        var card = cara.querySelector('.of-card');
        if (!card || card.querySelector('.of-brow')) return;
        card.insertAdjacentHTML('beforeend', '<span class="of-brow l"></span><span class="of-brow r"></span><span class="of-cheek l"></span><span class="of-cheek r"></span><span class="of-smile"></span>');
        cara.insertAdjacentHTML('beforeend', '<i class="of-spark"></i>');
    });
    // V49.4: lágrimas para la tristeza (solo se ven con data-expr="sad").
    caras.forEach(function (cara) {
        var card = cara.querySelector('.of-card');
        if (card && !card.querySelector('.of-tear')) card.insertAdjacentHTML('beforeend', '<i class="of-tear l"></i><i class="of-tear r"></i>');
    });

    function poner(cara, expr, ms) {
        if (expr) cara.setAttribute('data-expr', expr); else cara.removeAttribute('data-expr');
        clearTimeout(cara.__t);
        if (expr && ms) cara.__t = setTimeout(function () { cara.removeAttribute('data-expr'); }, ms);
    }
    function paraTodas(expr, ms) {
        caras.forEach(function (c) { if (c.offsetParent) poner(c, expr, ms); });
    }

    // Parpadeo por clase (no pisa la expresión actual): simple o doble, como una persona.
    function parpadear(cara, doble) {
        cara.classList.add('of-blinking');
        setTimeout(function () {
            cara.classList.remove('of-blinking');
            if (doble) setTimeout(function () { parpadear(cara, false); }, 170);
        }, 130);
    }

    // Microgestos ligeros: parpadeos, pequeñas miradas y respiración.
    // No usan canvas ni filtros pesados, así que la cara puede seguir viva
    // incluso en móviles de gama baja.
    function microgesto() {
        if (document.hidden || quieta() || dormida) return;
        caras.forEach(function (cara) {
            if (!cara.offsetParent) return;
            if (cara.getAttribute('data-expr')) return; // no interrumpir una emoción en curso
            var r = Math.random();
            if (r < .36) {
                parpadear(cara, Math.random() < .28);
            } else if (r < .64) {
                cara.style.setProperty('--gx', ((Math.random() * 2 - 1) * .6).toFixed(2));
                cara.style.setProperty('--gy', ((Math.random() * 2 - 1) * .38).toFixed(2));
                cara.style.setProperty('--tilt-i', ((Math.random() * 8) - 4).toFixed(1) + 'deg');
            } else if (r < .82) {
                poner(cara, Math.random() < .5 ? 'smile' : 'wink', 900);
            } else {
                cara.classList.remove('of-breathe');
                void cara.offsetWidth;
                cara.classList.add('of-breathe');
            }
        });
    }
    (function programarMicrogesto() {
        setTimeout(function () { microgesto(); programarMicrogesto(); }, 1800 + Math.random() * 2800);
    }());
    function activa() {
        ultimaActividad = Date.now();
        if (dormida) { dormida = false; paraTodas('wow', 900); }
    }
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
        document.addEventListener(ev, activa, { passive: true, capture: true });
    });
    document.addEventListener('pointermove', function () { ultimaActividad = Date.now(); if (dormida) activa(); }, { passive: true });

    // Cada cierto tiempo hace un gesto distinto; si nadie la toca en ~30 s se duerme.
    (function ciclo() {
        setTimeout(function () {
            if (!document.hidden && !quieta() && !esDeNoche()) { // de noche manda face-extra.js (dormir)
                var libre = caras.every(function (c) { var e = c.dataset.estado; return !e || e === 'idle'; });
                if (!dormida && Date.now() - ultimaActividad > 30000) { dormida = true; paraTodas('sleepy', 0); }
                else if (libre && !dormida) {
                    var ex = EXPRESIONES[Math.floor(Math.random() * EXPRESIONES.length)];
                    if (ex === 'yawn') bostezar(); else paraTodas(ex, 1500);
                }
            }
            ciclo();
        }, 4500 + Math.random() * 3500);
    }());

    // Bostezo: abre la boca grande ~2 s y luego sonríe unos segundos.
    function bostezar() {
        paraTodas('yawn', 0);
        setTimeout(function () { paraTodas('smile', 2500); }, 2300);
    }

    // Al pasar el puntero: se pone feliz y, al quitarlo, conserva esa cara unos 3 segundos.
    caras.forEach(function (cara) {
        cara.addEventListener('pointerenter', function (e) {
            if (quieta() || e.pointerType === 'touch') return;
            activa();
            clearTimeout(cara.__t);
            cara.setAttribute('data-expr', 'hover');
        });
        cara.addEventListener('pointerleave', function (e) {
            if (e.pointerType === 'touch') return;
            clearTimeout(cara.__t);
            if (cara.getAttribute('data-expr') === 'hover') cara.__t = setTimeout(function () { cara.removeAttribute('data-expr'); }, 3200);
        });
    });

    // Reacciona al abrir el chat en vivo.
    var chat = document.getElementById('livechat-section');
    if (chat && 'MutationObserver' in window) {
        var estabaAbierto = chat.classList.contains('active');
        new MutationObserver(function () {
            var abierto = chat.classList.contains('active');
            if (abierto === estabaAbierto) return;
            estabaAbierto = abierto;
            if (quieta()) return;
            if (abierto) { paraTodas('chat', 2800); caras.forEach(function (c) { c.classList.remove('of-boing'); void c.offsetWidth; c.classList.add('of-boing'); }); }
            else paraTodas('wink', 1500);
        }).observe(chat, { attributes: true, attributeFilter: ['class'] });
    }

    // Reacciona cuando alguien reproduce un video (y cuando termina).
    var hayVideo = false;
    setInterval(function () {
        if (document.hidden || quieta()) return;
        var ahora = !!document.querySelector('.video-thumbnail[data-playing="true"] iframe');
        if (ahora && !hayVideo) paraTodas('watch', 0);
        if (!ahora && hayVideo) paraTodas('joy', 1500);
        if (ahora && hayVideo) {
            caras.forEach(function (c) { if (c.offsetParent && !c.getAttribute('data-expr')) poner(c, 'watch', 0); });
        }
        hayVideo = ahora;
    }, 1200);

    // Clic/toque en la cara: reacciona. Si le das clic muy rápido se marea, se enoja y luego pide perdón.
    var clics = 0, clicTimer = 0;
    caras.forEach(function (cara) {
        cara.addEventListener('click', function () {
            if (quieta()) return;
            clics += 1;
            clearTimeout(clicTimer);
            clicTimer = setTimeout(function () { clics = 0; }, 1500);
            cara.classList.remove('of-boing'); void cara.offsetWidth; cara.classList.add('of-boing');
            setTimeout(function () { cara.classList.remove('of-boing'); }, 600);
            if (clics >= 7) {
                clics = 0;
                paraTodas('angry', 1800);
                setTimeout(function () { paraTodas('sad', 1800); }, 1900);
            } else if (clics >= 5) paraTodas('dizzy', 1200);
            else if (clics === 4) poner(cara, 'confused', 1100);
            else if (clics === 3) poner(cara, 'excited', 1300);
            else if (clics === 2) poner(cara, 'wink', 1000);
            else { var v1 = ['love', 'joy', 'shy', 'laugh', 'cool', 'kiss', 'dance']; poner(cara, v1[Math.floor(Math.random() * v1.length)], 1700); }
        });
    });

    // Emoción según el TEXTO de la respuesta (alegre, disculpa, duda, sorpresa, cariño, error…).
    var ultimaReaccionTexto = 0;
    function expresionParaTexto(t) {
        t = String(t || '').toLowerCase();
        if (/no (encuentro|est[aá]) (el )?servidor|todav[ií]a no lo s[eé]|no est[aá] (conectado|disponible)|tard[oó] demasiado|llave|anthropic|sin conexi[oó]n|conexi[oó]n a internet|no pudo aceptar/.test(t)) return 'confused';
        if (/lo siento|disculp|perd[oó]n|lamento|desafortunad|no puedo (dar|compartir|ayudar)|por seguridad|necesito descansar|😢|😔|🙏/.test(t)) return 'sad';
        if (/no (estoy seguro|lo s[eé]|s[eé])\b|no entiendo|no tengo (ese )?dato|todav[ií]a no est[aá] (registrad|disponible)/.test(t)) return 'confused';
        if (/ja(ja)+|je(je)+|chiste|😂|🤣|colmo|zum-ba|tokofondo/.test(t)) return 'laugh';
        if (/🧮|¡f[aá]cil|¡listo/.test(t)) return 'excited';
        if (/\b(m[uú]sica|canci[oó]n|bail|fiesta|cumplea|navidad|halloween|🎵|🎶|🎉)/.test(t)) return 'dance';
        if (/\b(eres (muy |tan )?(lind|bonit|guap|genial|el mejor|la mejor)|qu[eé] (lind|bonit|guap)|te amo|te adoro)/.test(t)) return 'shy';
        if (/😘|\bbeso/.test(t)) return 'kiss';
        if (/😎|\b(genial|chevere|chévere|buen[ií]simo|excelente|rock)/.test(t)) return 'cool';
        if (/❤|💖|💕|gracias|de nada|te quiero|cari[ñn]|gusto|encantad/.test(t)) return 'love';
        if (/\bwow\b|incre[ií]ble|asombr|sorprend|🤯|😮|¡qu[eé] genial|record|sab[ií]as que|dato curioso|🐙|🐋|⚡/.test(t)) return 'wow';
        if (/¿[^?]*\?\s*(😊|😄|🙂)?\s*$/.test(t)) return 'curious';
        if (/\b(hola|qu[eé] onda|buenas|bienvenid)/.test(t)) return 'wink';
        return Math.random() < .3 ? 'smile' : 'joy';
    }
    function reaccionarTexto(texto) {
        if (quieta()) return;
        ultimaReaccionTexto = Date.now();
        paraTodas(expresionParaTexto(texto), 1900);
    }
    var mensajes = document.getElementById('ai-messages');
    if (mensajes && 'MutationObserver' in window) {
        // Respaldo para mensajes que no pasan por agregarMensajeIA (p. ej. el aviso de límite de invitado).
        new MutationObserver(function (lista) {
            if (quieta() || Date.now() - ultimaReaccionTexto < 600) return;
            lista.forEach(function (m) {
                Array.prototype.forEach.call(m.addedNodes, function (n) {
                    if (n.nodeType === 1 && n.classList.contains('bot') && !n.classList.contains('typing')) reaccionarTexto(n.textContent);
                });
            });
        }).observe(mensajes, { childList: true });
    }
    var campo = document.getElementById('ai-input');
    if (campo) {
        campo.addEventListener('input', function () {
            if (quieta()) return;
            caras.forEach(function (c) { if (c.offsetParent) { c.style.setProperty('--gx', (Math.random() * 0.6 - 0.3).toFixed(2)); c.style.setProperty('--gy', '0.9'); } });
        }, { passive: true });
    }
    // Al abrir el panel de la IA se sorprende y saluda.
    var burbuja = document.querySelector('.ia-toggle-bubble');
    if (burbuja) burbuja.addEventListener('click', function () { if (!quieta()) setTimeout(function () { paraTodas('wow', 900); }, 120); });

    // API pública para el primer bloque y para face-sound.js
    window.OsitoFace = { paraTodas: paraTodas, poner: poner, reaccionarTexto: reaccionarTexto, expresionParaTexto: expresionParaTexto, caras: caras };
}());
