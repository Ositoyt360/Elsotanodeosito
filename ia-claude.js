/**
 * IA de El Sótano de Osito — cara animada + conexión con Claude (V48)
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
        idle: 'En línea · con Claude',
        listening: 'Escuchando…',
        thinking: 'Pensando…',
        speaking: 'Hablando…'
    };

    function sinAnimaciones() {
        var c = document.body.classList;
        return c.contains('no-animations') || c.contains('ultra-performance');
    }

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

    function empezoAHablar() {
        flags.hablando = true;
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
        if (vigilante) { clearInterval(vigilante); vigilante = null; }
        recalcular();
    }

    if (synth && typeof synth.speak === 'function') {
        var speakOriginal = synth.speak.bind(synth);
        synth.speak = function (utterance) {
            try {
                pendientes += 1;
                utterance.addEventListener('start', empezoAHablar);
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
        burbuja.setAttribute('aria-label', 'La IA está escribiendo');
        burbuja.innerHTML = '<i></i><i></i><i></i>';
        aiMessages.appendChild(burbuja);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        return function () { if (burbuja.parentNode) burbuja.parentNode.removeChild(burbuja); };
    }

    /**
     * Pregunta a Claude. Devuelve { texto } o { error }.
     * error: 'sin_conexion' | 'ia_no_configurada' | 'muy_rapido' | 'limite_dia' | 'limite_total' | 'ia_no_disponible'
     */
    function preguntar(pregunta, contexto) {
        contexto = contexto || {};
        if (navigator.onLine === false) return Promise.resolve({ error: 'sin_conexion' });

        pidiendoAClaude = true;
        flags.pensando = true;
        recalcular();
        var quitarEscribiendo = mostrarEscribiendo();

        var controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var corte = controlador ? setTimeout(function () { controlador.abort(); }, 30000) : null;

        return fetch(urlIA(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            signal: controlador ? controlador.signal : undefined,
            body: JSON.stringify({
                pregunta: pregunta,
                nombre: contexto.nombre || '',
                genero: contexto.genero || '',
                historial: historialDesdePantalla(pregunta)
            })
        }).then(function (resp) {
            return resp.json().catch(function () { return {}; }).then(function (data) {
                if (resp.ok && data && data.texto) return { texto: String(data.texto) };
                return { error: (data && data.error) || 'ia_no_disponible' };
            });
        }).catch(function (error) {
            if (error && error.name === 'AbortError') return { error: 'ia_tiempo_agotado' };
            return { error: 'ia_servidor_no_disponible' };
        }).then(function (resultado) {
            if (corte) clearTimeout(corte);
            quitarEscribiendo();
            pidiendoAClaude = false;
            flags.pensando = false;
            recalcular();
            return resultado;
        });
    }

    /* URL del servidor: mismo dominio por defecto; en hosting estático se configura con
       <meta name="osito-ia-url" content="https://tu-servidor"> o window.OSITO_IA_URL. */
    function urlIA() {
        var meta = document.querySelector('meta[name="osito-ia-url"]');
        var base = (window.OSITO_IA_URL || (meta && meta.content) || '').replace(/\/+$/, '');
        return base + '/api/ia';
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
    function cuenta(t) {
        var e = t.replace(/(cuanto es|cuanto da|calcula|resuelve|resultado de|=)/g, ' ').replace(/[x×]/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/,/g, '.').trim();
        if (!/^[\d\s+\-*/().%]+$/.test(e) || !/\d\s*(\*\*|[+\-*/%])\s*[\d(]/.test(e) || e.length > 60) return null;
        try {
            var r = Function('"use strict";return (' + e + ')')();
            if (typeof r !== 'number' || !isFinite(r)) return null;
            return 'El resultado es ' + (Math.round(r * 1e6) / 1e6) + '. 🧮';
        } catch (x) { return null; }
    }
    function respuestaLibre(pregunta) {
        var t = plano(pregunta);
        if (!t) return null;
        if (/\b(chiste|broma|hazme reir|chistoso)\b/.test(t)) return siguiente(CHISTES, 'chiste');
        if (/dato curioso|curiosidad|sabias que|dime algo (interesante|curioso)/.test(t)) return siguiente(DATOS, 'dato');
        var c = cuenta(t); if (c) return c;
        if (/\b(gracias|muchas gracias|thx|thanks)\b/.test(t)) return '¡De nada! Aquí estoy para lo que necesites. 😄';
        if (/\b(adios|chao|chau|nos vemos|hasta luego|bye)\b/.test(t)) return '¡Hasta luego! Vuelve cuando quieras al Sótano. 👋';
        if (/como estas|que tal estas|como te va|como andas/.test(t)) return '¡Muy bien, con mucha energía! Gracias por preguntar. ¿Y tú cómo estás? 😊';
        if (/quien eres|como te llamas|que eres|eres una ia|eres un robot/.test(t)) return 'Soy la inteligencia artificial de El Sótano de Osito, funciono con Claude. Puedo contarte sobre el canal, chistes, datos curiosos y más. 🤖';
        if (/ayuda.*(tarea|deber)|tarea|deberes/.test(t)) return 'Claro. Cuéntame de qué materia es y qué te piden, y lo vemos paso a paso. 📚';
        return null;
    }
    function mensajeSinClaude(codigo) {
        if (codigo === 'ia_no_configurada' || codigo === 'ia_no_disponible' || codigo === 'ia_tiempo_agotado' || codigo === 'ia_sin_respuesta') {
            return 'Ahora mismo mi cerebro avanzado no está conectado, así que no puedo responder eso. Pregúntame sobre el canal, pídeme un chiste o un dato curioso, o inténtalo de nuevo en un momento. 🙏';
        }
        return null;
    }
    // Aviso para quien administra el sitio (solo en la consola del navegador).
    fetch(urlIA().replace(/\/api\/ia$/, '/api/ia/estado'), { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!estadoTexto) return;
        if (d && d.activa === true) {
            estadoTexto.textContent = 'Claude configurado · listo';
            estadoTexto.dataset.iaOk = '1';
        } else if (d) {
            estadoTexto.textContent = 'Servidor IA sin llave';
            estadoTexto.dataset.iaOk = '0';
            console.warn('[IA] El servidor responde, pero ANTHROPIC_API_KEY no está configurada.');
        } else {
            estadoTexto.textContent = 'Servidor IA no disponible';
            estadoTexto.dataset.iaOk = '0';
        }
    }).catch(function () {
        if (estadoTexto) { estadoTexto.textContent = 'Servidor IA no encontrado'; estadoTexto.dataset.iaOk = '0'; }
        console.warn('[IA] No hay servidor de IA en esta URL. Si el sitio es estático, configura <meta name="osito-ia-url"> con la URL del servidor Node.');
    });

    window.OsitoIA = {
        respuestaLibre: respuestaLibre,
        mensajeSinClaude: mensajeSinClaude,
        preguntar: preguntar,
        mensajeDeError: function (codigo) {
            if (codigo === 'muy_rapido') return 'Voy un poquito más lento para no atragantarme 😅 Espera unos segundos y vuelve a preguntarme.';
            if (codigo === 'limite_dia' || codigo === 'limite_total') return 'Hoy ya respondí muchísimas preguntas y necesito descansar. Vuelve a intentarlo más tarde.';
            if (codigo === 'ia_clave_invalida' || codigo === 'ia_sin_acceso') return 'Mi servidor sí está encendido, pero la llave de Claude no es válida o ya no tiene acceso. Hay que renovar la llave en el servidor.';
            if (codigo === 'ia_modelo_no_disponible') return 'Claude está conectado, pero el modelo configurado ya no está disponible. Revisa ANTHROPIC_MODEL en el servidor.';
            if (codigo === 'ia_solicitud_invalida') return 'Claude recibió una solicitud que no pudo aceptar. Ya marqué el error para revisarlo en el servidor.';
            if (codigo === 'ia_proveedor_limite') return 'Claude está limitando temporalmente las solicitudes. Espera unos segundos y vuelve a intentar.';
            if (codigo === 'ia_proveedor_no_disponible') return 'El servidor está conectado con Claude, pero Anthropic no está disponible en este momento. Inténtalo de nuevo.';
            if (codigo === 'ia_tiempo_agotado') return 'Claude tardó demasiado en responder. Inténtalo de nuevo en unos segundos.';
        if (codigo === 'ia_servidor_no_disponible') return 'No encuentro el servidor de IA. Si la página está en GitHub Pages, configura la URL de tu servidor Node en osito-ia-url.';
            if (codigo === 'sin_conexion') return 'Parece que no tienes conexión a internet. Revisa tu señal y vuelve a preguntarme.';
            return null; // el sitio usa su mensaje local de siempre
        }
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

    // Reacción natural cuando llega una respuesta: despierta, sonríe y da
    // un pequeño rebote. Si es un mensaje del usuario, se pone curiosa.
    document.addEventListener('osito:ia-message', function (e) {
        if (quieta()) return;
        var rol = e && e.detail && e.detail.role;
        if (rol === 'bot') {
            paraTodas(Math.random() < .35 ? 'excited' : 'joy', 1500);
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
    var EXPRESIONES = ['smile', 'wink', 'curious', 'wow', 'love', 'yawn', 'excited', 'confused', 'sad', 'angry'];
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

    function poner(cara, expr, ms) {
        if (expr) cara.setAttribute('data-expr', expr); else cara.removeAttribute('data-expr');
        clearTimeout(cara.__t);
        if (expr && ms) cara.__t = setTimeout(function () { cara.removeAttribute('data-expr'); }, ms);
    }
    function paraTodas(expr, ms) {
        caras.forEach(function (c) { if (c.offsetParent) poner(c, expr, ms); });
    }

    // Microgestos ligeros: parpadeos, pequeñas miradas y respiración.
    // No usan canvas ni filtros pesados, así que la cara puede seguir viva
    // incluso en móviles de gama baja.
    function microgesto() {
        if (document.hidden || quieta() || dormida) return;
        caras.forEach(function (cara) {
            if (!cara.offsetParent) return;
            var r = Math.random();
            if (r < .34) {
                poner(cara, 'blink', 300);
            } else if (r < .62) {
                cara.style.setProperty('--gx', ((Math.random() * 2 - 1) * .55).toFixed(2));
                cara.style.setProperty('--gy', ((Math.random() * 2 - 1) * .35).toFixed(2));
                cara.style.setProperty('--tilt', ((Math.random() * 8) - 4).toFixed(1) + 'deg');
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
        setTimeout(function () { microgesto(); programarMicrogesto(); }, 2600 + Math.random() * 3600);
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
            if (!document.hidden && !quieta()) {
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

    // Clic/toque en la cara: salta y se pone feliz.
    caras.forEach(function (cara) {
        cara.addEventListener('click', function () {
            if (quieta()) return;
            cara.classList.remove('of-boing'); void cara.offsetWidth; cara.classList.add('of-boing');
            poner(cara, Math.random() < 0.5 ? 'love' : 'joy', 1400);
            setTimeout(function () { cara.classList.remove('of-boing'); }, 600);
        });
    });

    // Cuando la IA responde, se alegra; al escribir, mira hacia abajo (al campo de texto).
    var mensajes = document.getElementById('ai-messages');
    if (mensajes && 'MutationObserver' in window) {
        new MutationObserver(function (lista) {
            if (quieta()) return;
            lista.forEach(function (m) {
                Array.prototype.forEach.call(m.addedNodes, function (n) {
                    if (n.nodeType === 1 && n.classList.contains('bot') && !n.classList.contains('typing')) paraTodas('joy', 1300);
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
}());
