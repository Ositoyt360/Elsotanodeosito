/*
 * gemini-live.js — Voz EN VIVO con Gemini Live (modo llamada)
 *
 * El navegador abre un WebSocket con TU servidor (/api/ia/live) y el servidor habla con Gemini.
 * La clave de Gemini NUNCA llega al navegador.
 *   - Micrófono -> PCM16 16 kHz -> servidor -> Gemini
 *   - Gemini -> PCM16 24 kHz -> se reproduce aquí (con interrupción: si hablas, Cubit se calla)
 * Si la voz en vivo no está disponible (sin clave, sin internet, servidor dormido, sin micrófono),
 * el modo llamada sigue funcionando como antes (reconocimiento del navegador + /api/ia).
 */
(function (global) {
    'use strict';

    var ws = null, estado = 'idle';           // idle | conectando | activo
    var micStream = null, micCtx = null, micNode = null, micSrc = null;
    var outCtx = null, outGain = null, outFuentes = [], outFin = 0;
    var silenciado = false, hablando = false;
    var textoUsuario = '', textoIA = '', observadorMute = null, timerConexion = null;
    var startListeningOriginal = null;

    function log() { try { console.log.apply(console, ['[GeminiLive]'].concat([].slice.call(arguments))); } catch (e) {} }

    function urlsWS() {
        var urls = [];
        var meta = document.querySelector('meta[name="osito-ia-url"]');
        var custom = meta && meta.content ? String(meta.content).trim().replace(/\/+$/, '') : '';
        var loc = global.location || {};
        function aWs(base) { return base.replace(/^http/i, 'ws') + '/api/ia/live'; }
        var host = String(loc.hostname || '');
        var esLocal = !host || host === 'localhost' || host === '127.0.0.1' || loc.protocol === 'file:';
        if (!esLocal && loc.protocol !== 'file:' && !custom) urls.push(aWs(loc.origin));
        if (custom) urls.push(aWs(custom));
        if (esLocal) urls.push('ws://localhost:3000/api/ia/live');
        if (!esLocal && loc.protocol !== 'file:' && custom && custom !== loc.origin) urls.push(aWs(loc.origin));
        return urls.filter(function (u, i) { return urls.indexOf(u) === i; });
    }

    // ---------- Reproducción ----------
    function asegurarSalida() {
        if (!outCtx) {
            var AC = global.AudioContext || global.webkitAudioContext;
            outCtx = new AC();
            outGain = outCtx.createGain();
            outGain.connect(outCtx.destination);
        }
        if (outCtx.state === 'suspended') outCtx.resume().catch(function () {});
    }

    function reproducirPCM(b64, rate) {
        asegurarSalida();
        var bin = atob(b64), n = bin.length >> 1;
        if (!n) return;
        var buf = outCtx.createBuffer(1, n, rate || 24000);
        var ch = buf.getChannelData(0);
        for (var i = 0; i < n; i++) {
            var v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
            if (v >= 0x8000) v -= 0x10000;
            ch[i] = v / 32768;
        }
        var src = outCtx.createBufferSource();
        src.buffer = buf;
        src.connect(outGain);
        var t = Math.max(outCtx.currentTime + 0.03, outFin);
        src.start(t);
        outFin = t + buf.duration;
        outFuentes.push(src);
        src.onended = function () {
            var k = outFuentes.indexOf(src); if (k >= 0) outFuentes.splice(k, 1);
            if (!outFuentes.length && hablando && outCtx && outCtx.currentTime >= outFin - 0.05) finHabla();
        };
        if (!hablando) inicioHabla();
    }

    function cortarSalida() {
        outFuentes.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) {} });
        outFuentes = [];
        outFin = 0;
        if (hablando) finHabla();
    }

    function motor() { return global.CallModeEngine; }
    function inicioHabla() {
        hablando = true;
        var m = motor(); if (m && m.setCallAvatarState) m.setCallAvatarState('SPEAKING');
        try { document.dispatchEvent(new CustomEvent('osito:live-speaking', { detail: { speaking: true } })); } catch (e) {}
    }
    function finHabla() {
        hablando = false;
        var m = motor(); if (m && m.setCallAvatarState) m.setCallAvatarState(silenciado ? 'IDLE' : 'LISTENING');
        try { document.dispatchEvent(new CustomEvent('osito:live-speaking', { detail: { speaking: false } })); } catch (e) {}
    }

    // ---------- Micrófono ----------
    var WORKLET = 'class P extends AudioWorkletProcessor{constructor(){super();this.b=[];this.r=sampleRate/16000;this.pos=0;}' +
        'process(i){var c=i[0]&&i[0][0];if(!c)return true;for(var k=0;k<c.length;k++){this.pos+=1;if(this.pos>=this.r){this.pos-=this.r;this.b.push(c[k]);}}' +
        'if(this.b.length>=1600){var a=new Int16Array(this.b.length);for(var j=0;j<a.length;j++){var s=Math.max(-1,Math.min(1,this.b[j]));a[j]=s<0?s*32768:s*32767;}this.port.postMessage(a.buffer,[a.buffer]);this.b=[];}return true;}}' +
        'registerProcessor("pcm16k",P);';

    function b64DeBuffer(ab) {
        var bytes = new Uint8Array(ab), s = '';
        for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
    }

    function enviarAudio(ab) {
        if (silenciado || !ws || ws.readyState !== 1) return;
        ws.send(JSON.stringify({ type: 'audio', data: b64DeBuffer(ab) }));
    }

    async function abrirMicrofono() {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
        });
        var AC = global.AudioContext || global.webkitAudioContext;
        micCtx = new AC();
        if (micCtx.state === 'suspended') await micCtx.resume().catch(function () {});
        micSrc = micCtx.createMediaStreamSource(micStream);
        if (micCtx.audioWorklet && global.Blob && global.URL) {
            var url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
            await micCtx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);
            micNode = new AudioWorkletNode(micCtx, 'pcm16k');
            micNode.port.onmessage = function (e) { enviarAudio(e.data); };
            micSrc.connect(micNode);
            var mudo = micCtx.createGain(); mudo.gain.value = 0;
            micNode.connect(mudo); mudo.connect(micCtx.destination);
        } else {
            // Respaldo para navegadores sin AudioWorklet
            var proc = micCtx.createScriptProcessor(4096, 1, 1), ratio = micCtx.sampleRate / 16000;
            proc.onaudioprocess = function (e) {
                var inp = e.inputBuffer.getChannelData(0), n = Math.floor(inp.length / ratio), a = new Int16Array(n);
                for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, inp[Math.floor(i * ratio)])); a[i] = s < 0 ? s * 32768 : s * 32767; }
                enviarAudio(a.buffer);
            };
            micSrc.connect(proc); proc.connect(micCtx.destination); micNode = proc;
        }
    }

    function cerrarMicrofono() {
        try { if (micNode) { if (micNode.port) micNode.port.onmessage = null; micNode.disconnect(); } } catch (e) {}
        try { if (micSrc) micSrc.disconnect(); } catch (e) {}
        try { if (micStream) micStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        try { if (micCtx) micCtx.close(); } catch (e) {}
        micNode = micSrc = micStream = micCtx = null;
    }

    // ---------- Mensajes del servidor ----------
    function alMensaje(m) {
        var eng = motor();
        if (m.type === 'audio') {
            reproducirPCM(m.data, m.rate);
        } else if (m.type === 'interrupted') {
            cortarSalida();
        } else if (m.type === 'in_text') {
            if (textoIA) { textoIA = ''; }          // empezó un turno nuevo del usuario
            textoUsuario += m.text;
            if (eng && eng.mostrarTranscripcionUsuario) eng.mostrarTranscripcionUsuario(textoUsuario.trim());
            if (!hablando && eng && eng.setCallAvatarState) eng.setCallAvatarState('LISTENING');
        } else if (m.type === 'out_text') {
            if (textoUsuario) { textoUsuario = ''; }
            textoIA += m.text;
            if (eng && eng.mostrarRespuestaTexto) eng.mostrarRespuestaTexto(textoIA.trim());
        } else if (m.type === 'accion') {
            // V99.12: Cubit cambia su cara / hace un sonido durante la llamada (con límite para no saturar)
            try {
                var tA = Date.now();
                if (tA - (alMensaje._ultAccion || 0) > 1800 && global.OsitoMente && global.OsitoMente.accion) {
                    alMensaje._ultAccion = tA;
                    if (m.expresion) global.OsitoMente.accion('expr', String(m.expresion).slice(0, 20));
                    if (m.sonido) global.OsitoMente.accion('sonido', String(m.sonido).slice(0, 20));
                }
            } catch (e) {}
        } else if (m.type === 'turn_complete') {
            textoUsuario = ''; textoIA = '';
        } else if (m.type === 'error') {
            log('error', m.mensaje);
            if (typeof global.showToast === 'function' && estado === 'activo') global.showToast('⚠️ ' + (m.mensaje || 'Error de voz en vivo'));
        } else if (m.type === 'closed') {
            if (estado === 'activo') { detener(); if (typeof global.showToast === 'function') global.showToast('La llamada de voz en vivo terminó.'); }
        }
    }

    // ---------- Integración con el modo llamada existente ----------
    function tomarControl() {
        global.ositoLiveActivo = true;
        var va = global.voiceAssistant;
        if (va) {
            try { if (va.stopListening) va.stopListening(); } catch (e) {}
            if (!startListeningOriginal && typeof va.startListening === 'function') {
                startListeningOriginal = va.startListening;
                va.startListening = function () { return false; };   // el reconocimiento del navegador no compite con la voz en vivo
            }
        }
        try { if (global.speechSynthesis) global.speechSynthesis.cancel(); } catch (e) {}
        var btn = document.getElementById('ia-call-mic-btn');
        if (btn && global.MutationObserver) {
            silenciado = btn.classList.contains('call-mic-muted');
            observadorMute = new MutationObserver(function () { silenciado = btn.classList.contains('call-mic-muted'); });
            observadorMute.observe(btn, { attributes: true, attributeFilter: ['class'] });
        }
        var eng = motor(); if (eng && eng.setCallAvatarState) eng.setCallAvatarState('LISTENING');
        if (eng && eng.mostrarRespuestaTexto) eng.mostrarRespuestaTexto('Estoy escuchándote. Habla cuando quieras. 🎙️');
    }

    function soltarControl() {
        global.ositoLiveActivo = false;
        var va = global.voiceAssistant;
        if (va && startListeningOriginal) { va.startListening = startListeningOriginal; }
        startListeningOriginal = null;
        if (observadorMute) { observadorMute.disconnect(); observadorMute = null; }
    }

    // ---------- API ----------
    function datosSesion() {
        var nombre = '';
        try { nombre = localStorage.getItem('osito_ai_nombre') || ''; } catch (e) {}
        var vozId = ''; try { vozId = localStorage.getItem('osito_voz_id') || ''; } catch (e) {}
        return { nombre: String(nombre).trim().split(' ')[0], memoria: '', vozId: vozId };
    }

    function conectar(url) {
        return new Promise(function (resolve, reject) {
            var sock;
            try { sock = new WebSocket(url); } catch (e) { return reject(e); }
            var listo = false;
            var limite = setTimeout(function () { if (!listo) { try { sock.close(); } catch (e) {} reject(new Error('tiempo')); } }, 25000);
            sock.onopen = function () { var d = datosSesion(); sock.send(JSON.stringify({ type: 'start', nombre: d.nombre, memoria: d.memoria, vozId: d.vozId })); };
            sock.onmessage = function (ev) {
                var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
                if (!listo) {
                    if (m.type === 'ready') { listo = true; clearTimeout(limite); ws = sock; resolve(sock); }
                    else if (m.type === 'error') { clearTimeout(limite); reject(new Error(m.mensaje || 'error')); }
                    return;
                }
                alMensaje(m);
            };
            sock.onerror = function () { if (!listo) { clearTimeout(limite); reject(new Error('ws')); } };
            sock.onclose = function () { if (!listo) { clearTimeout(limite); reject(new Error('cerrado')); } else if (estado === 'activo') { detener(); } };
        });
    }

    async function iniciar() {
        if (estado !== 'idle') return false;
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !(global.WebSocket)) return false;
        estado = 'conectando';
        try {
            asegurarSalida();
            var urls = urlsWS(), conectado = false;
            for (var i = 0; i < urls.length && !conectado; i++) {
                try { await conectar(urls[i]); conectado = true; } catch (e) { log('sin conexión en', urls[i], e && e.message); }
            }
            if (!conectado) throw new Error('sin_servidor');
            if (estado !== 'conectando') { try { ws.close(); } catch (e) {} return false; }   // la llamada se colgó mientras conectaba
            await abrirMicrofono();
            estado = 'activo';
            tomarControl();
            log('voz en vivo activa');
            return true;
        } catch (e) {
            log('no disponible:', e && e.message);
            limpiar();
            return false;
        }
    }

    function limpiar() {
        cerrarMicrofono();
        cortarSalida();
        if (ws) { try { ws.onclose = null; ws.send(JSON.stringify({ type: 'end' })); ws.close(); } catch (e) {} ws = null; }
        if (outCtx) { try { outCtx.close(); } catch (e) {} outCtx = null; outGain = null; }
        textoUsuario = textoIA = '';
        hablando = false;
        estado = 'idle';
    }

    function detener() {
        var estabaActivo = estado === 'activo';
        limpiar();
        soltarControl();
        return estabaActivo;
    }

    // Se engancha al modo llamada: al iniciar intenta voz en vivo; al colgar la corta.
    function enganchar() {
        var m = global.CallModeEngine;
        if (!m || m.__geminiLive) return !!(m && m.__geminiLive);
        m.__geminiLive = true;
        var ini = m.iniciarLlamada, fin = m.finalizarLlamada;
        m.iniciarLlamada = function () {
            var r = ini.apply(this, arguments);
            iniciar().then(function (ok) {
                if (!ok && typeof global.showToast === 'function') global.showToast('Voz en vivo no disponible: uso el modo llamada normal.');
            });
            return r;
        };
        m.finalizarLlamada = function () {
            detener();
            return fin.apply(this, arguments);
        };
        return true;
    }

    if (!enganchar()) {
        var intentos = 0, t = setInterval(function () { if (enganchar() || ++intentos > 100) clearInterval(t); }, 100);
    }

    global.OsitoGeminiLive = { iniciar: iniciar, detener: detener, activo: function () { return estado === 'activo'; } };
})(window);
