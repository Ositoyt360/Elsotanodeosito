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

    // Decoración interna de la mascotita: cada modo especial adorna la propia cara,
    // no solamente el fondo de la página. Se actualiza automáticamente al cambiar de modo.
    function prepararDecoracionEspecial() {
        caras.forEach(function (cara) {
            var card = cara.querySelector('.of-card');
            if (!card) return;
            var deco = card.querySelector('.of-theme-decor');
            if (!deco) {
                deco = document.createElement('span');
                deco.className = 'of-theme-decor';
                deco.setAttribute('aria-hidden', 'true');
                card.appendChild(deco);
            }
        });
        actualizarDecoracionEspecial();
    }
    function actualizarDecoracionEspecial() {
        var body = document.body;
        if (!body) return;
        var tema = body.classList.contains('modo-halloween') ? 'halloween' :
            body.classList.contains('modo-navidad') ? 'navidad' :
            body.classList.contains('modo-san-valentin') ? 'san-valentin' :
            body.classList.contains('modo-cumpleanos') ? 'cumpleanos' : 'normal';
        caras.forEach(function (cara) {
            var deco = cara.querySelector('.of-theme-decor');
            if (deco) deco.setAttribute('data-theme', tema);
        });
    }
    prepararDecoracionEspecial();
    if (window.MutationObserver && document.body) {
        new MutationObserver(actualizarDecoracionEspecial).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    var TEXTOS = {
        idle: 'En línea · Lista para conversar',
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
        caras.forEach(function (cara) {
            cara.dataset.estado = estado;
            if (estado === 'speaking') {
                cara.classList.add('of-speaking-friendly');
                if (!cara.getAttribute('data-expr')) { if (window.OsitoFace && window.OsitoFace.poner) window.OsitoFace.poner(cara,'smile',0); else cara.setAttribute('data-expr','smile'); cara.dataset.speakingSmile='1'; }
            } else {
                cara.classList.remove('of-speaking-friendly');
            }
        });
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
                    cara.style.setProperty('--cy', (dx * 30).toFixed(1) + 'deg'); /* V61: gira el cubo entero */
                    cara.style.setProperty('--cx', (-dy * 22).toFixed(1) + 'deg');
                });
            });
        }, { passive: true });
        document.addEventListener('pointerleave', function () {
            caras.forEach(function (cara) { mirar(cara, 0, 0); cara.style.setProperty('--cx', '0deg'); cara.style.setProperty('--cy', '0deg'); });
        });
    }

    /* ---------- Hablar: se engancha a la voz del navegador ---------- */
    var synth = window.speechSynthesis;
    var pendientes = 0;
    var vigilante = null;

    /* Sincronía labial: la boca cambia de forma con cada "sílaba" (ancho, alto, redondez).
       En gama baja / ultrabaja se usa solo la animación CSS por GPU (0 timers JS y 0 reflujos). */
    var VISEMAS = [[.5, .16, 0], [.85, .6, .2], [1, 1, 0], [.62, .95, 1], [.92, .42, 0], [.45, .1, 0], [.75, .8, .6]];
    var lipTimer = 0, visemaPrevio = -1, emphTimer = 0, ultimoBoundaryTs = 0;
    function equipoLento() {
        var h = document.documentElement.classList;
        var b = document.body ? document.body.classList : h;
        return h.contains('low-end-device') || h.contains('mobile-lite') || h.contains('perf-lite') ||
               h.contains('fps-drop') || h.contains('redmi-fluid-mode') || h.contains('charging-fluid-mode') ||
               b.contains('ultra-performance') || b.contains('no-animations');
    }
    function pasoLabios() {
        lipTimer = 0;
        if (!flags.hablando || equipoLento()) return;
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
        lipTimer = setTimeout(pasoLabios, cerrar ? 175 : 135 + Math.random() * 110);
    }
    function iniciarLabios() {
        if (sinAnimaciones() || equipoLento()) return;
        caras.forEach(function (c) { c.classList.add('of-lipsync'); });
        if (!lipTimer) pasoLabios();
    }
    function detenerLabios() {
        clearTimeout(lipTimer); lipTimer = 0;
        clearTimeout(emphTimer); emphTimer = 0;
        caras.forEach(function (c) {
            if (c.dataset.speakingSmile === '1') { if (window.OsitoFace && window.OsitoFace.poner) window.OsitoFace.poner(c,null,0); else c.removeAttribute('data-expr'); delete c.dataset.speakingSmile; }
            c.classList.remove('of-lipsync', 'of-emph');
            c.style.removeProperty('--mw'); c.style.removeProperty('--mh'); c.style.removeProperty('--mr');
        });
    }
    // Énfasis: en equipos normales da un saltito ligero; en gama baja se omite para máxima fluidez.
    function enfatizar() {
        if (!flags.hablando || sinAnimaciones() || equipoLento()) return;
        var ahora = Date.now();
        if (ahora - ultimoBoundaryTs < 240) return;
        ultimoBoundaryTs = ahora;
        caras.forEach(function (c) {
            if (!c.offsetParent) return;
            c.classList.add('of-emph');
        });
        clearTimeout(emphTimer);
        emphTimer = setTimeout(function () { caras.forEach(function (c) { c.classList.remove('of-emph'); }); }, 150);
    }

    function marcarMensajeHablando(activo) {
        document.documentElement.classList.toggle('ia-speaking-mode', Boolean(activo));
        var orb = document.getElementById('ia-call-orb');
        if (orb) {
            orb.classList.toggle('is-speaking', Boolean(activo));
        }
        var contenedor = document.getElementById('ai-messages');
        if (!contenedor) return;
        contenedor.classList.toggle('ia-speaking-active', Boolean(activo));
        var bots = contenedor.querySelectorAll('.msg.bot:not(.typing)');
        for (var i = 0; i < bots.length; i++) {
            bots[i].classList.remove('ia-speaking-msg');
        }
        if (activo && bots.length) {
            bots[bots.length - 1].classList.add('ia-speaking-msg');
        }
    }

    function empezoAHablar() {
        flags.hablando = true;
        iniciarLabios();
        marcarMensajeHablando(true);
        recalcular();
        document.dispatchEvent(new CustomEvent('osito:tts-start'));
        if (!vigilante) {
            // Por si el navegador cancela la voz sin avisar: apaga la boca y avisa a la llamada.
            vigilante = setInterval(function () {
                if (synth && !synth.speaking && !synth.pending) { pendientes = 0; terminoDeHablar(true); }
            }, 450);
        }
    }
    function terminoDeHablar(forzar) {
        if (!forzar) pendientes = Math.max(0, pendientes - 1);
        if (pendientes > 0) return;
        var estabaHablando = flags.hablando;
        flags.hablando = false;
        detenerLabios();
        marcarMensajeHablando(false);
        if (vigilante) { clearInterval(vigilante); vigilante = null; }
        recalcular();
        if (estabaHablando) {
            document.dispatchEvent(new CustomEvent('osito:tts-end'));
        }
    }

    if (synth && typeof synth.speak === 'function') {
        var speakOriginal = synth.speak.bind(synth);
        synth.speak = function (utterance) {
            try {
                pendientes += 1;
                utterance.addEventListener('start', empezoAHablar);
                if (!equipoLento()) {
                    utterance.addEventListener('boundary', enfatizar);
                }
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
            var bodyEl = nodo.querySelector('.ia-msg-body, .ia-msg-user-text');
            var rawTexto = bodyEl ? bodyEl.textContent : nodo.textContent;
            var texto = (rawTexto || '').replace(/^🤖\s*/, '').trim();
            if (!texto || nodo.querySelector('button')) return;
            lista.push({ role: nodo.classList.contains('user') ? 'user' : 'assistant', text: texto });
        });
        var ultimo = lista[lista.length - 1];
        if (ultimo && ultimo.role === 'user' && ultimo.text === preguntaActual) lista.pop();
        return lista.slice(-14);
    }

    function mostrarEscribiendo() {
        if (!aiMessages) return function () {};
        var burbuja = document.createElement('div');
        burbuja.className = 'msg bot typing ia-thinking-bubble';
        burbuja.setAttribute('aria-label', 'La mascotita del Sotano está respondiendo');
        burbuja.innerHTML =
            '<span class="ia-thinking-head"><span class="ia-thinking-orb" aria-hidden="true">🤖</span><span class="ia-thinking-label">Pensando respuesta</span></span>' +
            '<span class="ia-thinking-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
        aiMessages.appendChild(burbuja);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
            window.OsitoFaceSound.reproducir('thinking');
        }
        return function () { if (burbuja.parentNode) burbuja.parentNode.removeChild(burbuja); };
    }

    var cacheClienteIA = Object.create(null);

    function obtenerEndpointsIA() {
        var urls = [];
        var meta = document.querySelector('meta[name="osito-ia-url"]');
        var custom = meta && meta.content ? String(meta.content).trim().replace(/\/+$/, '') : '';
        if (custom) urls.push(custom + '/api/ia');
        var proto = window.location && window.location.protocol;
        if (proto === 'http:' || proto === 'https:') {
            urls.push('/api/ia');
        }
        var remoto = 'https://ais-pre-3tuqw52dr436btgaqjk2om-121219840903.us-east5.run.app/api/ia';
        if (urls.indexOf(remoto) === -1) urls.push(remoto);
        return urls;
    }

    /**
     * Pregunta a la IA Gemini en el servidor (/api/ia) enviando historial de conversación y memoria de chats.
     * Devuelve { texto } o { error }.
     */
    async function preguntar(pregunta, opciones) {
        var opts = opciones || {};
        var imagen = typeof opts.imagen === 'string' && opts.imagen.startsWith('data:image/') ? opts.imagen : '';
        var textoPregunta = String(pregunta || '').trim() || (imagen ? '¿Qué ves en esta imagen? Descríbela y ayúdame con lo que aparece.' : '');
        if (!textoPregunta && !imagen) return { error: 'pregunta_vacia' };

        var nombre = opts.nombre || localStorage.getItem('osito_ai_nombre') || '';
        var genero = opts.genero || localStorage.getItem('osito_ai_genero') || '';
        var historial = Array.isArray(opts.historial) ? opts.historial : historialDesdePantalla(textoPregunta);
        var memoriaGlobal = String(opts.memoriaGlobal || '').trim();
        var tituloChat = String(opts.tituloChat || '').trim();

        var esCharlaCorta = textoPregunta.length <= 22 || /^(vale|ok|okay|si|sii|no|claro|bueno|dale|jaja|jeje|ya|bien|genial|interesante|cuentame|dime|como|por que|porque|y luego|que mas)\b/i.test(textoPregunta);
        var claveCache = (!imagen && !esCharlaCorta) ? (nombre + '|' + genero + '|' + textoPregunta.toLowerCase()) : '';
        if (!imagen && !esCharlaCorta && historial.length <= 1 && claveCache && cacheClienteIA[claveCache]) {
            return { texto: cacheClienteIA[claveCache] };
        }

        pidiendoAClaude = true;
        flags.pensando = true;
        recalcular();
        var quitarEscribiendo = mostrarEscribiendo();

        var endpoints = obtenerEndpointsIA();
        var ultimoError = 'ia_no_disponible';

        try {
            for (var i = 0; i < endpoints.length; i++) {
                var url = endpoints[i];
                var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, imagen ? 15000 : 8500) : 0;
                try {
                    var payload = {
                        pregunta: textoPregunta,
                        nombre: nombre,
                        genero: genero,
                        historial: historial,
                        memoriaGlobal: memoriaGlobal,
                        tituloChat: tituloChat
                    };
                    if (imagen) payload.imagen = imagen;
                    var res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: ctrl ? ctrl.signal : undefined
                    });
                    if (timer) clearTimeout(timer);
                    var data = await res.json().catch(function () { return {}; });
                    if (res.ok && data && data.texto) {
                        var limpio = String(data.texto).trim();
                        if (!imagen && !esCharlaCorta && historial.length <= 1 && claveCache) cacheClienteIA[claveCache] = limpio;
                        return { texto: limpio };
                    }
                    if (data && data.error) {
                        ultimoError = data.error;
                    }
                } catch (err) {
                    if (timer) clearTimeout(timer);
                    ultimoError = (err && err.name === 'AbortError') ? 'ia_tiempo_agotado' : 'sin_conexion';
                }
            }
            if (imagen) {
                return { texto: 'Vi tu imagen adjunta 📷, pero en este momento la conexión con el motor visual tardó en responder. Intenta enviarla de nuevo o dime qué aparece en ella y te ayudo enseguida. 😊' };
            }
            var respaldoLocal = respuestaLibre(textoPregunta, historial);
            if (respaldoLocal) return { texto: respaldoLocal };
            return { error: ultimoError };
        } finally {
            quitarEscribiendo();
            pidiendoAClaude = false;
            flags.pensando = false;
            recalcular();
        }
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
    var SEGUIMIENTO_CHARLA = [
        '¡Claro que sí! Dime, ¿de qué te gustaría que platiquemos ahora? Podemos hablar de videojuegos, de alguna curiosidad, resolver una duda o inventar una historia. 😊',
        '¡Va, me parece genial! Cuéntame qué tienes en mente ahorita: ¿quieres que hablemos de Minecraft, Roblox, tecnología, tareas o jugamos a las adivinanzas? 🎮',
        '¡Perfecto! Aquí sigo contigo al cien. Dime qué otro tema te da curiosidad o cuéntame cómo va tu día hoy. 😄',
        '¡De una! Tú mandas en la conversación: pregúntame lo que quieras de cualquier tema o dime de qué tienes ganas de charlar. ✨'
    ];
    var turnoSeguimiento = 0;

    function respuestaLibre(pregunta, historialOpcional) {
        var t = plano(pregunta);
        if (!t) return null;
        var hist = Array.isArray(historialOpcional) ? historialOpcional : historialDesdePantalla(pregunta);
        var ultimoBot = '';
        for (var h = hist.length - 1; h >= 0; h--) {
            if (hist[h] && hist[h].role === 'assistant') {
                ultimoBot = plano(hist[h].text);
                break;
            }
        }

        // Si el usuario responde "vale", "ok", "sí", "claro", "dale", "bueno", continuamos el hilo del mensaje anterior
        if (/^(vale|ok|okay|si|sii|claro|bueno|dale|va|de una|esta bien|me parece|perfecto|genial|entiendo|ya veo|ah ya|jaja|jeje)$/.test(t)) {
            if (/minecraft|survivalang/.test(ultimoBot)) {
                return '¡Genial! Por cierto, en Minecraft ¿tú prefieres construir bases gigantes en survival o jugar partidas intensas tipo BedWars? ⛏️';
            }
            if (/roblox/.test(ultimoBot)) {
                return '¡Buenísimo! ¿Y cuál es el modo o juego dentro de Roblox que más te divierte jugar con amigos? 🎮';
            }
            if (/chiste|nada|zombi|abeja|quimicos/.test(ultimoBot)) {
                return '¡Jajaja! Si quieres te cuento otro chiste distinto: ' + siguiente(CHISTES, 'chiste');
            }
            if (/dato|pulpos|miel|koalas|ballena|rayo/.test(ultimoBot)) {
                return '¡Aquí tienes otro dato curioso genial! ' + siguiente(DATOS, 'dato') + ' ¿Quieres otro o cambiamos de tema?';
            }
            var pick = SEGUIMIENTO_CHARLA[turnoSeguimiento % SEGUIMIENTO_CHARLA.length];
            turnoSeguimiento += 1;
            return pick;
        }

        if (/\b(crea|crear|genera|generar|haz|hacer|dibuja|dibujar)\s+(una\s+|la\s+|algunas\s+)?(imagen|imagenes|foto|fotos|dibujo|ilustracion)\b/.test(t)) {
            return 'No genero imágenes, pero puedo responderte cualquier pregunta, ayudarte con tus tareas, contarte sobre el canal OsitoGamer360YT (Osito Gamer 360 YouTube) o platicar contigo. 😊';
        }
        if (/(como se llama (tu|el) creador|quien (es (tu|el) creador|te creo|te hizo|te programo|creo (esta ia|el sitio|la pagina|el sotano))|cual es el nombre de (tu|el) creador|nombre de tu creador)/.test(t)) {
            return 'Mi creador se llama Osito.';
        }
        if (/(como se llama (el|tu|su) canal|cual es (el nombre de(l| tu| su) canal|(tu|su|el) canal)|nombre de(l| tu| su) canal)/.test(t) && !/(primer|anterior|original|antes|video)/.test(t)) {
            return 'El canal se llama OsitoGamer360YT (Osito Gamer 360 YouTube).';
        }
        if (/\b(chiste|broma|hazme reir|chistoso|otro chiste)\b/.test(t)) return siguiente(CHISTES, 'chiste');
        if (/dato curioso|curiosidad|sabias que|dime algo (interesante|curioso)|cuentame algo/.test(t)) return siguiente(DATOS, 'dato');
        var c = calcular(pregunta); if (c) return c;
        if (/\b(gracias|muchas gracias|thx|thanks)\b/.test(t)) return '¡De nada! Aquí estoy en El Sótano de Osito para lo que necesites. ¿En qué más te ayudo? 😄';
        if (/\b(adios|chao|chau|nos vemos|hasta luego|bye)\b/.test(t)) return '¡Hasta luego! Vuelve cuando quieras al Sótano de Osito, aquí te espero. 👋';
        if (/como estas|que tal estas|como te va|como andas|todo bien/.test(t)) return '¡Muy bien y con mucha energía para platicar contigo! Gracias por preguntar. ¿Y tú cómo estás hoy? 😊';
        if (/quien eres|como te llamas|que eres|eres una ia|eres un robot/.test(t)) return 'Soy La mascotita del Sótano, la inteligencia artificial oficial de El Sótano de Osito y del canal OsitoGamer360YT. Puedo conversar contigo de cualquier tema, recordar nuestros chats, responder dudas del canal, ayudarte con tareas y mucho más. 🤖✨';
        if (/quien es osito|hablame de osito|sobre osito/.test(t)) return 'Osito (creador del canal OsitoGamer360YT / Osito Gamer 360 YouTube) es un creador de contenido salvadoreño nacido el 28 de septiembre de 2008. Su canal actual empezó el 2 de junio de 2022 y sube videos de Minecraft, Roblox, Craftsman, BedWars y más. 🎮';
        if (/minecraft|survivalang/.test(t)) return '¡Minecraft es uno de los juegos favoritos de Osito para grabar! Además en el canal OsitoGamer360YT tiene la serie Survivalang y le encanta construir, jugar survival y BedWars con la comunidad. ⛏️';
        if (/roblox/.test(t)) return '¡Roblox es de los juegos que más disfruta grabar Osito junto con Minecraft! También les encanta a los seguidores del canal OsitoGamer360YT. 🎮';
        if (/craftsman|bedwars/.test(t)) return 'Craftsman y BedWars son súper especiales en el canal: Osito planea crear un servidor y revivir esa comunidad tan nostálgica con los mapas antiguos. ⚔️';
        if (/estoy aburrido|me aburro|que hago/.test(t)) return '¡Para quitar el aburrimiento podemos jugar a preguntas y respuestas, te puedo contar datos curiosos o chistes, o puedes ver un video de OsitoGamer360YT! ¿Qué prefieres hacer primero? 😄';
        if (/ayuda.*(tarea|deber)|tarea|deberes/.test(t)) return '¡Claro! Dime exactamente qué pregunta de tu tarea o qué cuenta matemática tienes y te la explico paso a paso. 📚';
        return null;
    }
    function mensajeSinClaude(codigo) {
        if (codigo === 'ia_local' || codigo === 'ia_no_configurada' || codigo === 'ia_no_disponible' || codigo === 'ia_tiempo_agotado' || codigo === 'ia_sin_respuesta') {
            return '¡Qué interesante! Pregúntame lo que quieras sobre el canal OsitoGamer360YT (Osito Gamer 360 YouTube), videojuegos como Minecraft y Roblox, cuentas matemáticas, datos curiosos o platica conmigo. 😊';
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
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                window.OsitoFaceSound.reproducir('msg_receive');
            }
            caras.forEach(function (cara) {
                cara.classList.remove('of-boing', 'of-spin-joy');
                void cara.offsetWidth;
                cara.classList.add(Math.random() < 0.35 ? 'of-spin-joy' : 'of-boing');
                setTimeout(function () { cara.classList.remove('of-spin-joy'); }, 780);
            });
        } else if (rol === 'user') {
            paraTodas('curious', 950);
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                window.OsitoFaceSound.reproducir('msg_send');
            }
            caras.forEach(function (cara) {
                cara.classList.remove('of-wiggle');
                void cara.offsetWidth;
                cara.classList.add('of-wiggle');
                setTimeout(function () { cara.classList.remove('of-wiggle'); }, 620);
            });
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
    var EXPRESIONES = ['smile', 'wink', 'curious', 'wow', 'love', 'excited', 'confused', 'laugh', 'shy', 'cool', 'kiss', 'dance'];
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

    /* V56 — Transiciones entre expresiones.
     * Nada cambia "de la nada": la expresión vieja SALE (parpadeo, data-fase="out") y la nueva
     * ENTRA con su propia animación 3D (data-fase="in"). Al volver a la cara normal hay un
     * "back" suave (data-fase="back", con data-leave = la expresión que se deja).
     * Todo el estilo vive en osito-cara3d.css. */
    var T_OUT = 200, T_IN = 460, T_BACK = 620;
    function fase(cara, f, ms) {
        clearTimeout(cara.__tf);
        if (f) {
            cara.setAttribute('data-fase', f);
            if (ms) cara.__tf = setTimeout(function () { cara.removeAttribute('data-fase'); cara.removeAttribute('data-leave'); }, ms);
        } else { cara.removeAttribute('data-fase'); cara.removeAttribute('data-leave'); }
    }
    function poner(cara, expr, ms) {
        var sig = expr || '';
        clearTimeout(cara.__t);
        var actual = cara.__tw ? cara.__pend : (cara.getAttribute('data-expr') || '');
        if (sig && ms) cara.__t = setTimeout(function () { poner(cara, null, 0); }, ms);
        if (sig === actual) return;
        var vieja = cara.getAttribute('data-expr') || '';
        clearTimeout(cara.__tw); cara.__tw = 0; cara.__pend = sig;
        var animar = !quieta() && !document.hidden && cara.offsetParent;
        if (!animar) {
            fase(cara, null);
            if (sig) cara.setAttribute('data-expr', sig); else cara.removeAttribute('data-expr');
            return;
        }
        function entrar() {
            cara.__tw = 0;
            if (sig) cara.setAttribute('data-expr', sig); else cara.removeAttribute('data-expr');
            if (vieja) cara.setAttribute('data-prev', vieja); else cara.removeAttribute('data-prev');
            if (sig) { cara.removeAttribute('data-leave'); fase(cara, 'in', T_IN); }
            else { fase(cara, 'back', T_BACK); if (vieja) cara.setAttribute('data-leave', vieja); }
        }
        // Expresión -> otra expresión: la vieja sale (parpadeo) y entra la nueva.
        // Expresión -> cara normal: se relaja enseguida con una salida suave.
        if (vieja && sig) {
            fase(cara, 'out', 0);
            cara.__tw = setTimeout(entrar, T_OUT);
        } else entrar();
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
            if (r < .30) {
                parpadear(cara, Math.random() < .35);
            } else if (r < .58) {
                cara.style.setProperty('--gx', ((Math.random() * 2 - 1) * .75).toFixed(2));
                cara.style.setProperty('--gy', ((Math.random() * 2 - 1) * .48).toFixed(2));
                cara.style.setProperty('--tilt-i', ((Math.random() * 12) - 6).toFixed(1) + 'deg');
            } else if (r < .82) {
                var gestos = ['smile', 'wink', 'happy', 'love', 'surprised', 'cool', 'dance', 'laugh', 'kiss', 'shy'];
                poner(cara, gestos[Math.floor(Math.random() * gestos.length)], 1500);
            } else {
                var nod = Math.random() < 0.5 ? 'of-face-nod' : 'of-face-peek';
                cara.classList.add(nod);
                setTimeout(function () { cara.classList.remove(nod); }, 720);
                parpadear(cara, Math.random() < .25);
            }
        });
    }
    (function programarMicrogesto() {
        setTimeout(function () { microgesto(); programarMicrogesto(); }, 950 + Math.random() * 1400);
    }());
    function activa() {
        ultimaActividad = Date.now();
        if (dormida) { dormida = false; paraTodas('wow', 900); }
    }
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
        document.addEventListener(ev, activa, { passive: true, capture: true });
    });
    document.addEventListener('pointermove', function () { ultimaActividad = Date.now(); if (dormida) activa(); }, { passive: true });

    // V51.1: bolsa de expresiones: salen todas una vez antes de repetir y nunca la misma dos veces seguidas.
    var bolsaEx = [], ultimaEx = '';
    function siguienteExpresion() {
        if (!bolsaEx.length) {
            bolsaEx = EXPRESIONES.slice();
            for (var i = bolsaEx.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)), t = bolsaEx[i]; bolsaEx[i] = bolsaEx[k]; bolsaEx[k] = t; }
            if (bolsaEx[bolsaEx.length - 1] === ultimaEx) { var t2 = bolsaEx[0]; bolsaEx[0] = bolsaEx[bolsaEx.length - 1]; bolsaEx[bolsaEx.length - 1] = t2; }
        }
        ultimaEx = bolsaEx.pop();
        return ultimaEx;
    }
    // Cada cierto tiempo hace un gesto distinto (sin repetir).
    (function ciclo() {
        setTimeout(function () {
            if (!document.hidden && !quieta() && !esDeNoche() && !document.querySelector('.osito-face[data-boredom]')) { // de noche manda face-extra.js (dormir); si lee/juega manda osito-aburrimiento.js
                var libre = caras.every(function (c) { var e = c.dataset.estado; return !e || e === 'idle'; });
                /* El sueño lo controla exclusivamente face-extra.js; no duplicar temporizadores aquí. */
                var conExpr = caras.some(function (c) { return c.offsetParent && c.getAttribute('data-expr'); });
                if (libre && !dormida && !conExpr) {
                    var ex = siguienteExpresion();
                    if (ex === 'yawn') bostezar(); else paraTodas(ex, 2100);
                }
            }
            ciclo();
        }, 2400 + Math.random() * 2000);
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
            poner(cara, 'hover', 0);
        });
        cara.addEventListener('pointerleave', function (e) {
            if (e.pointerType === 'touch') return;
            if (cara.getAttribute('data-expr') === 'hover') poner(cara, 'hover', 3200);
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

    // Clic/toque en la cara: reacciona con más animaciones y sonidos variados.
    var clics = 0, clicTimer = 0;
    var CLASES_ANIM_EXTRA = ['of-boing', 'of-spin-joy', 'of-wiggle', 'of-flip-3d', 'of-party-bounce'];
    var SONIDOS_CLIC_EXTRA = ['tap', 'jump', 'party', 'robot', 'boing', 'sparkle'];
    caras.forEach(function (cara) {
        cara.addEventListener('click', function () {
            if (quieta()) return;
            clics += 1;
            clearTimeout(clicTimer);
            clicTimer = setTimeout(function () { clics = 0; }, 1600);
            var claseExtra = CLASES_ANIM_EXTRA[clics % CLASES_ANIM_EXTRA.length];
            CLASES_ANIM_EXTRA.forEach(function (cls) { cara.classList.remove(cls); });
            void cara.offsetWidth;
            cara.classList.add(claseExtra);
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                var sPick = clics >= 4 ? 'party' : SONIDOS_CLIC_EXTRA[(clics - 1) % SONIDOS_CLIC_EXTRA.length];
                window.OsitoFaceSound.reproducir(sPick);
            }
            setTimeout(function () { cara.classList.remove(claseExtra); }, 720);
            if (clics >= 7) {
                clics = 0;
                paraTodas('angry', 1800);
                setTimeout(function () { paraTodas('sad', 1800); }, 1900);
            } else if (clics >= 5) paraTodas('dizzy', 1200);
            else if (clics === 4) poner(cara, 'excited', 1300);
            else if (clics === 3) poner(cara, 'dance', 1400);
            else if (clics === 2) poner(cara, 'wink', 1000);
            else { var v1 = ['love', 'joy', 'shy', 'laugh', 'cool', 'kiss', 'dance', 'excited']; poner(cara, v1[Math.floor(Math.random() * v1.length)], 1700); }
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
            caras.forEach(function (c) {
                if (c.offsetParent) {
                    c.style.setProperty('--gx', (Math.random() * 0.6 - 0.3).toFixed(2));
                    c.style.setProperty('--gy', '0.9');
                    if (!c.getAttribute('data-expr')) poner(c, 'curious', 520);
                }
            });
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                window.OsitoFaceSound.reproducir('sparkle');
            }
        }, { passive: true });
    }
    // Al abrir el panel de la IA se sorprende y saluda.
    var burbuja = document.querySelector('.ia-toggle-bubble');
    if (burbuja) burbuja.addEventListener('click', function () { if (!quieta()) setTimeout(function () { paraTodas('wow', 900); }, 120); });

    // API pública para el primer bloque y para face-sound.js
    window.OsitoFace = { paraTodas: paraTodas, poner: poner, reaccionarTexto: reaccionarTexto, expresionParaTexto: expresionParaTexto, caras: caras };
}());
