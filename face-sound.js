/**
 * V49.4 — Sonidos de la cara de LAIA.
 * Cada expresión tiene su propio sonido, generado en vivo con WebAudio (no hay archivos de audio que descargar).
 *
 * Reglas para no molestar:
 *  - Nada suena hasta que la persona toque la página (los navegadores lo exigen).
 *  - V49.6: de noche la cara duerme y ronca (3 ronquidos y pausa), también con el panel cerrado.
 *  - V49.5: también suena con el panel cerrado (cara de la burbuja); lo que hace sola, con pausas.
 *  - No suena mientras la IA habla con su voz ni mientras el micrófono escucha.
 *  - Botón 🔔/🔕 en el encabezado del panel para apagarlo (se recuerda).
 *  - El parpadeo y la respiración son silenciosos a propósito.
 */
(function () {
    'use strict';

    var KEY = 'osito_face_sound';
    var ctx = null, master = null, busActual = null, ruidoBuf = null;
    var activado = true;
    var tocoPagina = false;
    var ultimoUsuarioCara = 0, ultimoSolo = 0;
    var ultimo = { nombre: '', t: 0 };
    var porNombre = Object.create(null);

    try { activado = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* sin almacenamiento */ }

    /* ---------- Audio base ---------- */
    function crearContexto() {
        if (ctx) return ctx;
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try {
            ctx = new C();
            master = ctx.createGain();
            master.gain.value = /Android|iPhone|iPad/i.test(navigator.userAgent || '') ? 0.46 : 0.55;
            var comp = ctx.createDynamicsCompressor();
            master.connect(comp);
            comp.connect(ctx.destination);
        } catch (e) { ctx = null; }
        return ctx;
    }

    function despertar() {
        tocoPagina = true;
        if (!crearContexto()) return;
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    }
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
        document.addEventListener(ev, despertar, { passive: true, capture: true });
    });

    function bufferRuido() {
        if (ruidoBuf) return ruidoBuf;
        var largo = ctx.sampleRate * 2;
        ruidoBuf = ctx.createBuffer(1, largo, ctx.sampleRate);
        var d = ruidoBuf.getChannelData(0);
        for (var i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuf;
    }

    /* Tono con deslizamiento de frecuencia, vibrato, trémolo y filtro opcionales.
       t0 = segundos desde ahora · dur = duración · vol = volumen pico */
    function tono(f0, f1, t0, dur, tipo, vol, o) {
        o = o || {};
        var T = ctx.currentTime + t0;
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = tipo || 'sine';
        osc.frequency.setValueAtTime(f0, T);
        if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, T + dur);
        var ataque = o.a || 0.012;
        g.gain.setValueAtTime(0.0001, T);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), T + ataque);
        g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
        var salida = g, extra = [];
        if (o.vib) { // vibrato
            var lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = o.vib; lg.gain.value = o.vibd || 8;
            lfo.connect(lg); lg.connect(osc.frequency);
            lfo.start(T); lfo.stop(T + dur + 0.05); extra.push(lfo);
        }
        osc.connect(g);
        if (o.am) { // trémolo (gruñido)
            var amG = ctx.createGain(); amG.gain.value = 0.5;
            var lfo2 = ctx.createOscillator(), lg2 = ctx.createGain();
            lfo2.frequency.value = o.am; lg2.gain.value = 0.5;
            lfo2.connect(lg2); lg2.connect(amG.gain);
            lfo2.start(T); lfo2.stop(T + dur + 0.05);
            g.connect(amG); salida = amG;
        }
        if (o.lp) {
            var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.7;
            salida.connect(f); salida = f;
        }
        salida.connect(busActual || master);
        osc.start(T); osc.stop(T + dur + 0.05);
    }

    /* Ráfaga de ruido filtrado (soplidos, pops). */
    function ruido(t0, dur, vol, tipoFiltro, f0, f1, q, ataque) {
        var T = ctx.currentTime + t0;
        var src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        src.buffer = bufferRuido();
        src.loop = true;
        f.type = tipoFiltro || 'bandpass';
        f.frequency.setValueAtTime(f0, T);
        if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, T + dur);
        f.Q.value = q || 1;
        g.gain.setValueAtTime(0.0001, T);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), T + (ataque || 0.008));
        g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
        src.connect(f); f.connect(g); g.connect(busActual || master);
        src.start(T, Math.random()); src.stop(T + dur + 0.05);
    }

    function campana(f, t0, vol, dur) { // campanita: fundamental + parcial inarmónico
        tono(f, f, t0, dur || 0.7, 'sine', vol);
        tono(f * 2.76, f * 2.76, t0, (dur || 0.7) * 0.5, 'sine', vol * 0.35);
    }

    /* ---------- Un sonido por expresión ---------- */
    var SONIDOS = {
        // sonrisa: tres notas que suben, suaves
        smile: function () {
            tono(659, 659, 0, 0.3, 'sine', 0.2); tono(784, 784, 0.08, 0.32, 'sine', 0.19); tono(988, 988, 0.16, 0.42, 'sine', 0.17);
            tono(1318, 1318, 0.16, 0.3, 'triangle', 0.05);
        },
        // guiño: "blip" rápido con chispa
        wink: function () {
            tono(700, 1500, 0, 0.09, 'sine', 0.22);
            tono(2200, 1200, 0.1, 0.07, 'triangle', 0.1);
            tono(1760, 2349, 0.14, 0.12, 'sine', 0.07);
        },
        // curiosa: "¿hm-hm?" con la segunda sílaba más alta
        curious: function () {
            tono(380, 640, 0, 0.2, 'sine', 0.2, { vib: 6, vibd: 10 });
            tono(520, 880, 0.26, 0.27, 'sine', 0.2, { vib: 6, vibd: 10 });
        },
        // sorpresa: barrido hacia arriba + destellos
        wow: function () {
            tono(250, 950, 0, 0.26, 'triangle', 0.2);
            tono(1200, 1800, 0.18, 0.38, 'sine', 0.1);
            [2093, 2637, 3136].forEach(function (f, i) { tono(f, f, 0.28 + i * 0.06, 0.2, 'sine', 0.06); });
        },
        // amor: latido (pum-pum) + campanita cálida
        love: function () {
            [0, 0.2].forEach(function (t) {
                tono(120, 55, t, 0.17, 'sine', 0.5);
                tono(240, 120, t, 0.05, 'triangle', 0.1);
            });
            campana(880, 0.46, 0.12, 0.8); campana(1318, 0.58, 0.09, 0.9);
        },
        // bostezo: aire que se abre y baja con un "aaah" grave
        yawn: function () {
            ruido(0, 1.9, 0.12, 'lowpass', 1500, 260, 0.5, 0.7);
            tono(340, 140, 0.15, 1.75, 'sawtooth', 0.07, { a: 0.6, lp: 650, vib: 3, vibd: 5 });
            ruido(1.9, 0.25, 0.05, 'bandpass', 900, 500, 1.2, 0.02); // exhala final
        },
        // emocionada: arpegio rápido hacia arriba y campanita
        excited: function () {
            [523, 659, 784, 1047, 1319].forEach(function (f, i) { tono(f, f, i * 0.055, 0.16, 'triangle', 0.16); });
            campana(1568, 0.3, 0.12, 0.6);
        },
        // confundida: "¿huuh?" tambaleante
        confused: function () {
            tono(430, 290, 0, 0.32, 'sine', 0.2, { vib: 9, vibd: 24 });
            tono(290, 400, 0.34, 0.3, 'sine', 0.17, { vib: 9, vibd: 24 });
        },
        // triste: trombón triste (cuatro notas que caen)
        sad: function () {
            tono(392, 370, 0, 0.42, 'sawtooth', 0.1, { lp: 900, vib: 5.5, vibd: 5 });
            tono(370, 349, 0.42, 0.42, 'sawtooth', 0.1, { lp: 850, vib: 5.5, vibd: 5 });
            tono(349, 330, 0.84, 0.42, 'sawtooth', 0.1, { lp: 800, vib: 5.5, vibd: 5 });
            tono(330, 196, 1.26, 0.9, 'sawtooth', 0.1, { lp: 700, vib: 6, vibd: 8 });
        },
        // enojada: gruñido grave con temblor
        angry: function () {
            tono(98, 66, 0, 0.6, 'sawtooth', 0.24, { lp: 440, am: 26 });
            tono(147, 99, 0, 0.55, 'square', 0.06, { lp: 380, am: 31 });
            ruido(0, 0.55, 0.08, 'lowpass', 600, 200, 0.6, 0.03);
        },
        // sueño: nana que baja, muy suave
        sleepy: function () {
            [[440, 0], [349, 0.5], [294, 1.0]].forEach(function (n) { tono(n[0], n[0] * 0.98, n[1], 1.1, 'sine', 0.12, { a: 0.08 }); });
            tono(220, 220, 0, 1.8, 'sine', 0.04, { a: 0.3 });
        },
        // alegría: dos campanitas ding-ding
        joy: function () { campana(1047, 0, 0.2, 0.7); campana(1568, 0.11, 0.17, 0.8); },
        // pasar el cursor: "bloop" suave
        hover: function () { tono(520, 800, 0, 0.1, 'sine', 0.11); tono(800, 1000, 0.07, 0.08, 'sine', 0.05); },
        // viendo un video: palomitas de maíz
        watch: function () {
            for (var i = 0; i < 6; i++) {
                var t = Math.random() * 0.55;
                ruido(t, 0.045, 0.2, 'bandpass', 1500 + Math.random() * 2500, 0, 3, 0.002);
                tono(250 + Math.random() * 250, 120, t, 0.05, 'triangle', 0.05);
            }
        },
        // chat abierto: burbuja de mensaje
        chat: function () { tono(480, 900, 0, 0.08, 'sine', 0.18); tono(700, 1150, 0.1, 0.09, 'sine', 0.15); },
        // mareada: sirena que se tambalea
        dizzy: function () {
            tono(300, 640, 0, 0.3, 'sine', 0.14, { vib: 12, vibd: 55 });
            tono(640, 280, 0.3, 0.34, 'sine', 0.14, { vib: 12, vibd: 55 });
            tono(280, 520, 0.64, 0.3, 'sine', 0.1, { vib: 12, vibd: 55 });
        },
        // pensando: "bu-bup" suave
        thinking: function () { tono(300, 380, 0, 0.12, 'sine', 0.1); tono(380, 300, 0.14, 0.14, 'sine', 0.08); },
        // escuchando: aviso de micrófono (dos notas rápidas hacia arriba)
        listening: function () { tono(660, 990, 0, 0.1, 'sine', 0.16); tono(990, 1320, 0.1, 0.13, 'sine', 0.13); },
        // ---- V49.6 ----
        // ronquido: inhala (aire que sube) y exhala rasposo
        snore: function () {
            ruido(0, 0.95, 0.09, 'bandpass', 260, 620, 1.4, 0.5);
            tono(62, 95, 0.05, 0.9, 'sawtooth', 0.05, { lp: 260, am: 21, a: 0.4 });
            ruido(1.05, 1.25, 0.15, 'lowpass', 520, 170, 0.9, 0.12);
            tono(105, 52, 1.1, 1.2, 'sawtooth', 0.12, { lp: 320, am: 17, a: 0.1 });
            tono(78, 48, 1.2, 1.0, 'square', 0.04, { lp: 240, am: 23 });
        },
        // risa: ja-ja-ja-ja
        laugh: function () {
            [0, 0.13, 0.26, 0.39].forEach(function (t, i) {
                tono(520 - i * 28, 330 - i * 20, t, 0.11, 'sawtooth', 0.12, { lp: 1100, vib: 14, vibd: 18 });
            });
            tono(900, 1200, 0.5, 0.2, 'sine', 0.06);
        },
        // tímida: uwu suave
        shy: function () {
            tono(740, 960, 0, 0.18, 'sine', 0.13, { vib: 7, vibd: 8 });
            tono(960, 700, 0.2, 0.3, 'sine', 0.12, { vib: 7, vibd: 8 });
            campana(1568, 0.42, 0.05, 0.6);
        },
        // genial: bajo con onda y campanita de destello
        cool: function () {
            tono(196, 330, 0, 0.3, 'sawtooth', 0.12, { lp: 520, vib: 5, vibd: 6 });
            tono(330, 330, 0.3, 0.25, 'sawtooth', 0.08, { lp: 480 });
            campana(2093, 0.38, 0.1, 0.9);
        },
        // beso: mmmuac
        kiss: function () {
            tono(420, 880, 0, 0.1, 'sine', 0.14);
            ruido(0.1, 0.05, 0.28, 'bandpass', 2600, 1200, 2, 0.002);
            tono(900, 300, 0.1, 0.07, 'triangle', 0.1);
            campana(1318, 0.24, 0.07, 0.6);
        },
        // toque: efecto corto para cada toque/clic en la cara
        tap: function () {
            tono(420, 760, 0, 0.07, 'sine', 0.12, { a: 0.006 });
            tono(980, 620, 0.035, 0.055, 'triangle', 0.045, { a: 0.004 });
        },
        // rebote: acompaña el "boing" visual
        boing: function () {
            tono(180, 95, 0, 0.18, 'sine', 0.18, { a: 0.01 });
            tono(360, 720, 0.045, 0.14, 'triangle', 0.10, { a: 0.008 });
        },
        // destello: chispa corta
        sparkle: function () {
            [1568, 2093, 2637].forEach(function (f, i) {
                tono(f, f * 1.04, i * 0.055, 0.12, 'sine', 0.055, { a: 0.008 });
            });
        },
        // salto: efecto de energía muy corto
        hop: function () {
            tono(280, 620, 0, 0.11, 'triangle', 0.10);
            tono(620, 980, 0.08, 0.13, 'sine', 0.075);
        },
        // suspiro: efecto suave
        sigh: function () {
            ruido(0, 0.48, 0.055, 'lowpass', 950, 300, 0.7, 0.18);
        },
        // baile: bombo + platillos + melodía
        dance: function () {
            [0, 0.25, 0.5, 0.75].forEach(function (t) { tono(130, 48, t, 0.16, 'sine', 0.45); });
            [0.125, 0.375, 0.625, 0.875].forEach(function (t) { ruido(t, 0.05, 0.1, 'highpass', 6000, 0, 1, 0.002); });
            [523, 659, 784, 659, 880, 784].forEach(function (f, i) { tono(f, f, 0.1 + i * 0.14, 0.13, 'triangle', 0.11); });
        },
    };
    SONIDOS.sleeping = SONIDOS.sleepy; // al quedarse dormida suena la nana

    /* ---------- Cuándo puede sonar ---------- */
    function panelAbierto() {
        var p = document.getElementById('ai-section');
        return !!(p && p.classList.contains('active'));
    }
    function algunaEscuchando() {
        return !!document.querySelector('.osito-face[data-estado="listening"]');
    }
    function vozHablando() {
        var s = window.speechSynthesis;
        return !!(s && (s.speaking || s.pending));
    }

    function reproducir(nombre) {
        if (!activado || !tocoPagina || document.hidden || !SONIDOS[nombre]) return false;
        if (!crearContexto() || ctx.state !== 'running') { if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } return false; }
        var ahora = Date.now();
        // Mismo sonido dos veces seguidas (hay dos caras: burbuja y encabezado) = uno solo.
        if (porNombre[nombre] && ahora - porNombre[nombre] < 450) return false;
        if (nombre !== 'listening' && nombre !== 'snore' && algunaEscuchando()) return false;
        if (nombre !== 'snore' && vozHablando()) return false;
        // V49.5: también suena con el panel cerrado (la cara de la burbuja). Lo que provoca la persona
        // (cursor, toque, like/dislike) suena siempre; lo que la cara hace sola, con una pausa entre sonidos.
        var provocado = ahora - ultimoUsuarioCara < 2600;
        var libre = (nombre === 'snore' || nombre === 'sleeping'); // la cara dormida suena sola, de noche
        if (!libre && !panelAbierto() && !provocado) {
            if (ahora - ultimoSolo < 7000) return false;
            ultimoSolo = ahora;
        }
        porNombre[nombre] = ahora;
        ultimo = { nombre: nombre, t: ahora };

        // El sonido nuevo corta con suavidad al anterior (nunca se amontonan).
        var t = ctx.currentTime;
        if (busActual) {
            try { busActual.gain.cancelScheduledValues(t); busActual.gain.setValueAtTime(busActual.gain.value, t); busActual.gain.linearRampToValueAtTime(0.0001, t + 0.06); } catch (e) {}
        }
        busActual = ctx.createGain();
        busActual.gain.value = 1;
        busActual.connect(master);
        try { SONIDOS[nombre](); } catch (e) { return false; }
        return true;
    }

    /* ---------- Escuchar los cambios de la cara ---------- */
    var caras = Array.prototype.slice.call(document.querySelectorAll('.osito-face'));
    var SILENCIOSAS = { blink: 1, '': 1 };

    function alCambiar(cara, atributo, antes) {
        var ahora = cara.getAttribute(atributo) || '';
        if (ahora === (antes || '')) return;
        if (!cara.offsetParent && !cara.getClientRects().length) return; // cara oculta: no suena
        if (atributo === 'data-expr') {
            if (SILENCIOSAS[ahora]) return;
            reproducir(ahora);
        } else if (atributo === 'data-estado') {
            if (ahora === 'thinking' || ahora === 'listening') reproducir(ahora);
        }
    }
    if ('MutationObserver' in window) {
        caras.forEach(function (cara) {
            new MutationObserver(function (lista) {
                lista.forEach(function (m) { alCambiar(cara, m.attributeName, m.oldValue); });
            }).observe(cara, { attributes: true, attributeFilter: ['data-expr', 'data-estado'], attributeOldValue: true });
        });
    }

    // V50.5: mientras la cara duerme (incluida la siesta) ronca periódicamente.
    var ronquidos = 0, ronqPausaHasta = 0;
    setInterval(function () {
        if (!activado || !tocoPagina || document.hidden) return;
        var duerme = caras.some(function (c) { return c.getAttribute('data-expr') === 'sleeping' && (c.offsetParent || c.getClientRects().length); });
        if (!duerme) { ronquidos = 0; return; }
        var ahora = Date.now();
        if (ahora < ronqPausaHasta) return;
        if (reproducir('snore')) {
            ronquidos++;
            if (ronquidos >= 3) { ronquidos = 0; ronqPausaHasta = ahora + 12000; }
        }
    }, 5200);

    // Lo que la persona hace sobre la cara marca "esto lo provocó ella".
    function marcarUsuario() { ultimoUsuarioCara = Date.now(); }
    caras.forEach(function (cara) {
        cara.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') marcarUsuario(); });
        cara.addEventListener('pointerdown', marcarUsuario, { passive: true });
        cara.addEventListener('click', marcarUsuario);
    });
    var burbuja = document.querySelector('.ia-toggle-bubble');
    if (burbuja) burbuja.addEventListener('click', marcarUsuario);
    var chatBurbuja = document.getElementById('livechat-bubble');
    if (chatBurbuja) chatBurbuja.addEventListener('click', marcarUsuario);

    /* ---------- Botón 🔔 / 🔕 ---------- */
    function pintarBoton() {
        var b = document.getElementById('ia-face-sound-btn');
        if (!b) return;
        b.textContent = activado ? '🔔' : '🔕';
        b.setAttribute('aria-pressed', activado ? 'true' : 'false');
        b.title = activado ? 'Sonidos de la cara: activados' : 'Sonidos de la cara: apagados';
        b.setAttribute('aria-label', b.title);
    }
    var botonSonido = document.getElementById('ia-face-sound-btn');
    if (botonSonido) {
        botonSonido.addEventListener('click', function (e) {
            e.stopPropagation();
            despertar();
            activado = !activado;
            try { localStorage.setItem(KEY, activado ? 'on' : 'off'); } catch (err) {}
            pintarBoton();
            if (activado) { marcarUsuario(); setTimeout(function () { reproducir('smile'); }, 30); }
        });
    }
    pintarBoton();

    /* ---------- 100 efectos extra ligeros, generados con WebAudio ---------- */
    function reproducirExtra(indice) {
        indice = Math.max(0, Math.min(99, indice | 0));
        if (!activado || !tocoPagina || document.hidden || vozHablando() || algunaEscuchando()) return false;
        if (!crearContexto() || ctx.state !== 'running') return false;
        var ahora = Date.now();
        if (ahora - ultimoSolo < 650) return false;
        ultimoSolo = ahora;
        var t = ctx.currentTime;
        busActual = ctx.createGain();
        busActual.gain.value = 0.72;
        busActual.connect(master);
        try {
            var familia = indice % 10, paso = Math.floor(indice / 10), base = 220 + paso * 31;
            if (familia === 0) { tono(base, base*1.35, 0, .10, 'sine', .055); tono(base*1.6, base*2, .08, .12, 'triangle', .045); }
            else if (familia === 1) { tono(base*1.5, base*.75, 0, .18, 'triangle', .06); ruido(.06,.045,.045,'highpass',3500,7000,1,.004); }
            else if (familia === 2) { campana(base*1.8,0,.05,.32); campana(base*2.2,.11,.035,.24); }
            else if (familia === 3) { ruido(0,.12,.045,'bandpass',900+paso*60,1800+paso*90,2,.008); }
            else if (familia === 4) { tono(base,base*.92,0,.24,'sine',.05,{vib:5+paso,vibd:5}); }
            else if (familia === 5) { [0,.09,.18].forEach(function(q,j){tono(base*(1+j*.18),base*(1+j*.18),q,.09,'square',.028);}); }
            else if (familia === 6) { ruido(0,.07,.05,'highpass',2500+paso*120,8000,1,.002); tono(base*2,base, .04,.13,'sine',.045); }
            else if (familia === 7) { tono(base*.7,base*1.9,0,.20,'sawtooth',.026,{lp:1700}); }
            else if (familia === 8) { tono(base*1.2,base*1.2,.0,.12,'triangle',.05); tono(base*1.8,base*1.8,.12,.16,'triangle',.04); }
            else { tono(base*2.4,base*.9,0,.28,'sine',.042,{vib:7,vibd:9}); }
        } catch(e) { return false; }
        return true;
    }

    window.OsitoFaceSound = {
        marcarUsuario: marcarUsuario,
        reproducir: function (n) { marcarUsuario(); despertar(); return reproducir(n); },
        nombres: function () { return Object.keys(SONIDOS); },
        activar: function (v) { activado = !!v; try { localStorage.setItem(KEY, activado ? 'on' : 'off'); } catch (e) {} pintarBoton(); },
        ultimo: function () { return ultimo; },
        reproducirExtra: reproducirExtra,
        efectosExtra: function () { return 100; }
    };
}());
