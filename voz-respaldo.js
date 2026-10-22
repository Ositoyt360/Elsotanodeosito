/* =====================================================================
 * V99.9 — Voz de respaldo (para celulares / APK sin lector de voz del sistema)
 * Si el navegador o el WebView NO trae speechSynthesis (mensaje "Tu dispositivo no permite
 * leer en voz alta"), se crea uno compatible que reproduce la voz con un <audio> en linea
 * (voz generada por el servidor de la IA; si falla, Google Translate TTS. Necesita internet). Asi la voz de la IA y "Escuchar texto" funcionan igual.
 * Tambien expone window.OsitoTTSRespaldo.decir(texto, rate) para usarlo cuando la voz del
 * sistema existe pero no suena.
 * ===================================================================== */
(function () {
    'use strict';
    if (window.__ositoVozRespaldo) return;
    window.__ositoVozRespaldo = true;

    var URL_GOOGLE = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=';
    // Voz elegida en Ajustes (la guarda voces-ia.js). Ej.: es-sv-f, es-ar-m, en-us-f, fr-fr-m, pt-br-f
    function vozId() { try { return localStorage.getItem('osito_voz_id') || 'es-mx-f'; } catch (e) { return 'es-mx-f'; } }
    function idiomaVoz() { return vozId().slice(0, 2); }
    // Voz principal: la genera el servidor de la IA (Render) y el celular solo reproduce el audio.
    var BASE = '';
    try { var m = document.querySelector('meta[name="osito-ia-url"]'); if (m && m.content) BASE = m.content.replace(/\/+$/, ''); } catch (e) {}
    function urlServidor(t) { return BASE + '/api/ia/tts?v=' + encodeURIComponent(vozId()) + '&t=' + encodeURIComponent(t); }
    function urlGoogle(t) { return URL_GOOGLE + idiomaVoz() + '&q=' + encodeURIComponent(t); }
    var audio = null, desbloqueado = false, token = 0, cancelarActual = null;
    var ultimoMotivo = '';
    var servidorCaido = 0;          // marca de tiempo del ultimo fallo del servidor (para no esperarlo cada frase)
    var NATIVO = (typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined') ? window.speechSynthesis : null;

    // La voz del sistema (la del navegador/celular) es la MAS fiable: funciona sin internet ni servidor.
    // La voz del servidor solo se prefiere si la persona eligio una "Voz de Cubit" en Ajustes.
    function eligioVozCubit() { try { return !!localStorage.getItem('osito_voz_id'); } catch (e) { return false; } }
    function preferirServidor() {
        if (!NATIVO) return true;                 // sin lector del sistema: solo queda el servidor
        if (!eligioVozCubit()) return false;      // nunca eligio voz: se usa la del sistema
        return Date.now() - servidorCaido > 120000; // si el servidor fallo hace poco, no insistir
    }

    // Despierta el servidor gratuito de Render (se duerme y tarda ~50 s en el primer pedido).
    function despertarServidor() {
        try { if (BASE) fetch(BASE + '/api/ia/estado', { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); } catch (e) {}
    }
    if (eligioVozCubit() || !NATIVO) despertarServidor();

    function crearAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        try { audio.referrerPolicy = 'no-referrer'; } catch (e) {}
        return audio;
    }
    // Un toque real desbloquea la reproduccion de audio en moviles.
    function desbloquear() {
        if (desbloqueado) return;
        try {
            var a = crearAudio();
            a.src = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
            var p = a.play();
            if (p && p.then) p.then(function () { desbloqueado = true; a.pause(); }).catch(function () {});
            else desbloqueado = true;
        } catch (e) {}
    }
    ['touchstart', 'pointerdown', 'click'].forEach(function (ev) {
        document.addEventListener(ev, desbloquear, { capture: true, passive: true });
    });

    function trozos(texto) {
        var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        var out = [];
        var partes = limpio.match(/[^.!?;:\n]+[.!?;:]*/g) || [limpio];
        partes.forEach(function (p) {
            p = p.trim();
            while (p.length > 180) {
                var cut = p.lastIndexOf(' ', 180);
                if (cut < 60) cut = 180;
                out.push(p.slice(0, cut).trim());
                p = p.slice(cut).trim();
            }
            if (p) out.push(p);
        });
        return out;
    }

    // Reproduce UNA url. Resuelve al terminar el audio. Rechaza si no carga, si no empieza a tiempo
    // o si el navegador exige un toque del usuario (NotAllowedError).
    function tocar(url, rate, msParaEmpezar, alIniciar) {
        var a = crearAudio();
        return new Promise(function (resolve, reject) {
            var listo = false, empezo = false, tm = null;
            function cerrar(ok, val) {
                if (listo) return; listo = true; clearTimeout(tm);
                a.onended = a.onerror = a.onplaying = null;
                if (cancelarActual === cancelar) cancelarActual = null;
                if (ok) resolve(val); else reject(val);
            }
            function cancelar() { cerrar(true, 'cancelado'); }
            cancelarActual = cancelar;
            a.onplaying = function () { if (!empezo) { empezo = true; clearTimeout(tm); if (alIniciar) alIniciar(); } };
            a.onended = function () { cerrar(true, 'fin'); };
            a.onerror = function () { cerrar(false, new Error('audio')); };
            tm = setTimeout(function () {
                if (empezo) return;
                try { a.pause(); } catch (e) {}
                cerrar(false, new Error('timeout'));
            }, msParaEmpezar);
            try { a.src = url; a.defaultPlaybackRate = a.playbackRate = Math.max(0.6, Math.min(1.6, Number(rate) || 1)); } catch (e) {}
            var p = a.play();
            if (p && p.catch) p.catch(function (e) {
                // Si el origen no carga, play() rechaza con NotSupportedError y onerror tambien salta: se maneja una sola vez.
                if (e && e.name === 'NotAllowedError') cerrar(false, e);
                else if (e && e.name === 'NotSupportedError') cerrar(false, new Error('audio'));
            });
        });
    }

    function averiguarMotivo(t) {
        try {
            return fetch(urlServidor(t), { cache: 'no-store' }).then(function (r) {
                if (r.ok) { ultimoMotivo = 'el servidor sí generó la voz, pero el teléfono no pudo reproducirla (sube el volumen multimedia y toca la pantalla)'; return; }
                return r.text().then(function (txt) {
                    var d = ''; try { var j = JSON.parse(txt); d = j.detalle || j.error || ''; } catch (e) {}
                    ultimoMotivo = 'servidor ' + r.status + (d ? ': ' + d : (r.status === 404 ? ' (Render no tiene la versión nueva del servidor)' : ''));
                });
            }).catch(function () { ultimoMotivo = 'no se pudo contactar al servidor (revisa internet; Render gratis tarda ~1 min en despertar)'; });
        } catch (e) { return Promise.resolve(); }
    }

    // Una frase: voz del servidor -> (si falla) voz en linea de Google.
    function tocarFrase(t, rate, alIniciar, primera) {
        // Si el servidor fallo hace poco no se pierde tiempo esperandolo
        var saltarServidor = Date.now() - servidorCaido < 120000;
        var intentoServidor = saltarServidor
            ? Promise.reject(new Error('servidor-caido'))
            : tocar(urlServidor(t), rate, primera ? 40000 : 15000, alIniciar);
        return intentoServidor.catch(function (e) {
            if (e && e.name === 'NotAllowedError') throw e;
            if (!saltarServidor) servidorCaido = Date.now();
            return tocar(urlGoogle(t), rate, 10000, alIniciar).catch(function (e2) {
                // Todo fallo: se pregunta al servidor por que (para mostrarlo en el aviso)
                return averiguarMotivo(t).then(function () { throw e2; });
            });
        });
    }

    // Reproduce un texto. Devuelve una promesa que se resuelve al terminar (o rechaza si no se pudo).
    function decir(texto, rate, alEmpezar) {
        var mi = ++token, lista = trozos(texto), i = 0;
        return new Promise(function (resolve, reject) {
            function siguiente() {
                if (mi !== token) { resolve('cancelado'); return; }
                if (i >= lista.length) { resolve('fin'); return; }
                var t = lista[i++];
                var primera = (i === 1);
                tocarFrase(t, rate, function () {
                    if (alEmpezar && primera) { var f = alEmpezar; alEmpezar = null; f(); }
                }, primera).then(function (r) {
                    if (r === 'cancelado' || mi !== token) { resolve('cancelado'); return; }
                    siguiente();
                }).catch(function (e) {
                    if (mi !== token) resolve('cancelado'); else reject(e);
                });
            }
            siguiente();
        });
    }
    function parar() {
        token++;
        try { if (cancelarActual) cancelarActual(); } catch (e) {}
        try { if (audio) { audio.onended = null; audio.onerror = null; audio.onplaying = null; audio.pause(); } } catch (e) {}
    }
    window.OsitoTTSRespaldo = { decir: decir, parar: parar, desbloquear: desbloquear, preferirServidor: preferirServidor, despertar: despertarServidor, motivo: function () { return ultimoMotivo; } };

    // ---- Solo si el navegador/APK NO trae lector de voz propio se instala uno compatible (voces del servidor). ----
    // Si ya existe uno, NO se reemplaza: la voz del sistema es la mas fiable y es la que se usa por defecto.

    function Utterance(texto) {
        this.text = String(texto == null ? '' : texto);
        this.lang = ''; this.voice = null; this.volume = 1; this.rate = 1; this.pitch = 1;
        this._h = {};
        this.onstart = this.onend = this.onerror = this.onboundary = this.onpause = this.onresume = null;
    }
    Utterance.prototype.addEventListener = function (t, f) { (this._h[t] = this._h[t] || []).push(f); };
    Utterance.prototype.removeEventListener = function (t, f) { this._h[t] = (this._h[t] || []).filter(function (x) { return x !== f; }); };
    Utterance.prototype._emit = function (t, extra) {
        var ev = { type: t, target: this, utterance: this, charIndex: 0 };
        if (extra) for (var k in extra) ev[k] = extra[k];
        try { if (typeof this['on' + t] === 'function') this['on' + t](ev); } catch (e) {}
        (this._h[t] || []).slice().forEach(function (f) { try { f.call(this, ev); } catch (e) {} }, this);
    };
    if (typeof window.SpeechSynthesisUtterance === 'undefined') window.SpeechSynthesisUtterance = Utterance;

    // Si el navegador trae su propio SpeechSynthesisUtterance (no tiene _emit), se le avisa con eventos normales.
    function emitir(u, tipo, extra) {
        if (u && typeof u._emit === 'function') { u._emit(tipo, extra); return; }
        try {
            var ev = new Event(tipo);
            if (extra) for (var k in extra) { try { ev[k] = extra[k]; } catch (e) {} }
            try { ev.utterance = u; ev.charIndex = 0; } catch (e) {}
            u.dispatchEvent(ev);
        } catch (e) {}
    }

    var cola = [], actual = null;
    var synth = {
        __respaldo: true,
        onvoiceschanged: null,
        get speaking() { return !!actual; },
        get pending() { return cola.length > 0; },
        get paused() { return false; },
        getVoices: function () { return []; },
        addEventListener: function () {}, removeEventListener: function () {},
        pause: function () { try { if (audio) audio.pause(); } catch (e) {} },
        resume: function () { try { if (audio && actual) audio.play(); } catch (e) {} },
        speak: function (u) { cola.push(u); if (!actual) siguienteU(); },
        cancel: function () {
            var viejas = cola.splice(0), act = actual;
            actual = null; parar();
            if (act) emitir(act, 'error', { error: 'canceled' });
            viejas.forEach(function (u) { emitir(u, 'error', { error: 'canceled' }); });
        }
    };
    function siguienteU() {
        var u = cola.shift();
        if (!u) { actual = null; return; }
        actual = u;
        var texto = u.text.trim();
        if (!texto) { actual = null; emitir(u, 'end'); siguienteU(); return; }
        decir(texto, u.rate, function () { if (actual === u) emitir(u, 'start'); }).then(function (r) {
            if (r === 'cancelado' || actual !== u) return;
            actual = null; emitir(u, 'end'); siguienteU();
        }).catch(function (e) {
            if (actual !== u) return;
            actual = null; emitir(u, 'error', { error: (e && e.name === 'NotAllowedError') ? 'not-allowed' : 'network' }); siguienteU();
        });
    }
    if (!NATIVO) {
        try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true }); }
        catch (e) { window.speechSynthesis = synth; }
    }
})();
