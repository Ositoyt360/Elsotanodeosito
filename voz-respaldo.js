/* =====================================================================
 * V99.9 — Voz de respaldo (para celulares / APK sin lector de voz del sistema)
 * Si el navegador o el WebView NO trae speechSynthesis (mensaje "Tu dispositivo no permite
 * leer en voz alta"), se crea uno compatible que reproduce la voz con un <audio> en linea
 * (Google Translate TTS, necesita internet). Asi la voz de la IA y "Escuchar texto" funcionan igual.
 * Tambien expone window.OsitoTTSRespaldo.decir(texto, rate) para usarlo cuando la voz del
 * sistema existe pero no suena.
 * ===================================================================== */
(function () {
    'use strict';
    if (window.__ositoVozRespaldo) return;
    window.__ositoVozRespaldo = true;

    var URL_TTS = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=';
    var audio = null, desbloqueado = false, token = 0;

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
            a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
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

    // Reproduce un texto. Devuelve una promesa que se resuelve al terminar (o rechaza si no se pudo).
    function decir(texto, rate, alEmpezar) {
        var mi = ++token, lista = trozos(texto), i = 0, a = crearAudio();
        return new Promise(function (resolve, reject) {
            function siguiente() {
                if (mi !== token) { resolve('cancelado'); return; }
                if (i >= lista.length) { resolve('fin'); return; }
                var t = lista[i++];
                a.onended = siguiente;
                a.onerror = function () { if (mi === token) reject(new Error('audio')); else resolve('cancelado'); };
                a.src = URL_TTS + encodeURIComponent(t);
                try { a.playbackRate = Math.max(0.6, Math.min(1.6, Number(rate) || 1)); } catch (e) {}
                var p = a.play();
                if (p && p.then) p.then(function () { if (alEmpezar && i === 1) { var f = alEmpezar; alEmpezar = null; f(); } })
                    .catch(function (e) { if (mi === token) reject(e); else resolve('cancelado'); });
                else if (alEmpezar && i === 1) { var f2 = alEmpezar; alEmpezar = null; f2(); }
            }
            siguiente();
        });
    }
    function parar() {
        token++;
        try { if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); } } catch (e) {}
    }
    window.OsitoTTSRespaldo = { decir: decir, parar: parar, desbloquear: desbloquear };

    // ---- Si el sistema NO trae speechSynthesis, se crea uno compatible ----
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis) return;

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
            if (act) act._emit('error', { error: 'canceled' });
            viejas.forEach(function (u) { u._emit('error', { error: 'canceled' }); });
        }
    };
    function siguienteU() {
        var u = cola.shift();
        if (!u) { actual = null; return; }
        actual = u;
        var texto = u.text.trim();
        if (!texto) { actual = null; u._emit('end'); siguienteU(); return; }
        decir(texto, u.rate, function () { if (actual === u) u._emit('start'); }).then(function (r) {
            if (r === 'cancelado' || actual !== u) return;
            actual = null; u._emit('end'); siguienteU();
        }).catch(function (e) {
            if (actual !== u) return;
            actual = null; u._emit('error', { error: (e && e.name === 'NotAllowedError') ? 'not-allowed' : 'network' }); siguienteU();
        });
    }
    try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true }); }
    catch (e) { window.speechSynthesis = synth; }
})();
