/**
 * V49 — Me gusta / No me gusta por video, botón de reproducir y ayudas de rendimiento.
 * Las reacciones se guardan en este dispositivo (localStorage). Nada de esto toca llaves ni servidor.
 */
(function () {
    'use strict';
    var KEY = 'osito_reacciones_v1';
    var COUNTS = Object.create(null);
    var COUNT_UNSUBS = Object.create(null);
    var pending = Object.create(null);
    var html = document.documentElement;

    function leer() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    function guardar(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
    function limpiarId(id) { return String(id || '').replace(/[^\w-]/g, ''); }
    function sinAnimaciones() {
        var c = document.body.classList;
        return c.contains('no-animations') || c.contains('ultra-performance') || html.classList.contains('low-end-device');
    }
    function equipoLimitado() {
        var n = navigator, con = n.connection || {};
        var ram = Number(n.deviceMemory || 0), hilos = Number(n.hardwareConcurrency || 0);
        return html.classList.contains('low-end-device') || html.classList.contains('mobile-lite')
            || con.saveData === true || /^(slow-2g|2g|3g)$/.test(con.effectiveType || '')
            || (ram > 0 && ram <= 4) || (hilos > 0 && hilos <= 4);
    }

    /* ---------- Me gusta / No me gusta (tu código, una copia por video) ---------- */
    var PULGAR_SOLIDO = 'M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2H464c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48H294.5c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3V320 272 247.1c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192H96c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V224c0-17.7 14.3-32 32-32z';
    var PULGAR_LINEA = 'M323.8 34.8c-38.2-10.9-78.1 11.2-89 49.4l-5.7 20c-3.7 13-10.4 25-19.5 35l-51.3 56.4c-8.9 9.8-8.2 25 1.6 33.9s25 8.2 33.9-1.6l51.3-56.4c14.1-15.5 24.4-34 30.1-54.1l5.7-20c3.6-12.7 16.9-20.1 29.7-16.5s20.1 16.9 16.5 29.7l-5.7 20c-5.7 19.9-14.7 38.7-26.6 55.5c-5.2 7.3-5.8 16.9-1.7 24.9s12.3 13 21.3 13L448 224c8.8 0 16 7.2 16 16c0 6.8-4.3 12.7-10.4 15c-7.4 2.8-13 9-14.9 16.7s.1 15.8 5.3 21.7c2.5 2.8 4 6.5 4 10.6c0 7.8-5.6 14.3-13 15.7c-8.2 1.6-15.1 7.3-18 15.1s-1.6 16.7 3.6 23.3c2.1 2.7 3.4 6.1 3.4 9.9c0 6.7-4.2 12.6-10.2 14.9c-11.5 4.5-17.7 16.9-14.4 28.8c.4 1.3 .6 2.8 .6 4.3c0 8.8-7.2 16-16 16H286.5c-12.6 0-25-3.7-35.5-10.7l-61.7-41.1c-11-7.4-25.9-4.4-33.3 6.7s-4.4 25.9 6.7 33.3l61.7 41.1c18.4 12.3 40 18.8 62.1 18.8H384c34.7 0 62.9-27.6 64-62c14.6-11.7 24-29.7 24-50c0-4.5-.5-8.8-1.3-13c15.4-11.7 25.3-30.2 25.3-51c0-6.5-1-12.8-2.8-18.7C504.8 273.7 512 257.7 512 240c0-35.3-28.6-64-64-64l-92.3 0c4.7-10.4 8.7-21.2 11.8-32.2l5.7-20c10.9-38.2-11.2-78.1-49.4-89zM32 192c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32H32z';

    function boton(tipo, marcado, id) {
        var like = tipo === 'like';
        return '<label class="like-btn ' + tipo + '" title="' + (like ? 'Me gusta' : 'No me gusta') + '">' +
            '<input class="vc-input" type="checkbox" data-tipo="' + tipo + '" aria-label="' + (like ? 'Me gusta' : 'No me gusta') + '"' + (marcado ? ' checked' : '') + '>' +
            '<span class="lb-icons">' +
            '<svg class="icon-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path d="' + PULGAR_SOLIDO + '"/></svg>' +
            '<svg class="icon-regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path d="' + PULGAR_LINEA + '"/></svg>' +
            '</span><span class="fireworks" aria-hidden="true"><span class="checked-like-fx"></span></span></label>';
    }

    function accionesHTML(id) {
        id = limpiarId(id);
        var actual = leer()[id];
        var c = COUNTS[id] || { likes: 0, dislikes: 0 };
        return '<div class="vc-actions" data-vid="' + id + '">' + boton('like', actual === 'like', id) + '<span class="vc-count like-count" data-count-like>0</span>' + boton('dislike', actual === 'dislike', id) + '<span class="vc-count dislike-count" data-count-dislike>0</span></div>';
    }

    function pintarConteos(id) {
        id = limpiarId(id);
        var c = COUNTS[id] || { likes: 0, dislikes: 0 };
        document.querySelectorAll('.vc-actions[data-vid="' + id + '"]').forEach(function (box) {
            var l = box.querySelector('[data-count-like]');
            var d = box.querySelector('[data-count-dislike]');
            if (l) l.textContent = String(c.likes || 0);
            if (d) d.textContent = String(c.dislikes || 0);
            box.classList.toggle('has-likes', Number(c.likes || 0) > 0);
        });
    }

    function escucharConteos(id) {
        id = limpiarId(id);
        if (!id || COUNT_UNSUBS[id] || !window.dbFirebase || !window.docFirebase || !window.onSnapshotFirebase) return;
        var ref = window.docFirebase(window.dbFirebase, 'videoLikeCounts', id);
        COUNT_UNSUBS[id] = window.onSnapshotFirebase(ref, function (snap) {
            var data = snap && typeof snap.exists === 'function' && snap.exists() ? snap.data() : {};
            COUNTS[id] = { likes: Number(data.likes || 0), dislikes: Number(data.dislikes || 0) };
            pintarConteos(id);
        }, function () {
            // Los conteos locales siguen visibles aunque Firestore no esté disponible.
        });
    }

    function prepararConteos() {
        document.querySelectorAll('.vc-actions[data-vid]').forEach(function (box) {
            var id = box.getAttribute('data-vid');
            escucharConteos(id);
            pintarConteos(id);
        });
    }

    function reaccionGlobal(id, tipo) {
        id = limpiarId(id);
        var user = window.ositoCurrentUser;
        if (!user || !user.uid || !window.dbFirebase || !window.docFirebase || !window.getDocFirebase || !window.setDocFirebase || !window.runTransactionFirebase) {
            return Promise.reject(new Error('login_required'));
        }
        if (pending[id]) return pending[id];
        var countRef = window.docFirebase(window.dbFirebase, 'videoLikeCounts', id);
        var userRef = window.docFirebase(window.dbFirebase, 'videoLikeUsers', id, 'users', user.uid);
        pending[id] = window.runTransactionFirebase(window.dbFirebase, async function (tx) {
            var oldSnap = await tx.get(userRef);
            var old = oldSnap.exists() ? oldSnap.data().reaction : null;
            var countSnap = await tx.get(countRef);
            var c = countSnap.exists() ? countSnap.data() : {};
            var likes = Math.max(0, Number(c.likes || 0));
            var dislikes = Math.max(0, Number(c.dislikes || 0));
            var next = old === tipo ? null : tipo;
            if (old === 'like') likes--;
            if (old === 'dislike') dislikes--;
            if (next === 'like') likes++;
            if (next === 'dislike') dislikes++;
            tx.set(countRef, { likes: likes, dislikes: dislikes, updatedAt: Date.now() }, { merge: true });
            if (next) tx.set(userRef, { reaction: next, updatedAt: Date.now() });
            else tx.delete(userRef);
            return { likes: likes, dislikes: dislikes, next: next };
        }).then(function (result) {
            COUNTS[id] = { likes: result.likes, dislikes: result.dislikes };
            pintarConteos(id);
            return result;
        }).finally(function () { delete pending[id]; });
        return pending[id];
    }

    function explotar(label) {
        if (!label || sinAnimaciones()) return;
        label.classList.remove('boom');
        void label.offsetWidth;
        label.classList.add('boom');
        setTimeout(function () { label.classList.remove('boom'); }, 1100);
    }

    document.addEventListener('change', function (e) {
        var inp = e.target;
        if (!inp || !inp.classList || !inp.classList.contains('vc-input')) return;
        var caja = inp.closest('.vc-actions');
        if (!caja) return;
        var id = caja.getAttribute('data-vid'), tipo = inp.getAttribute('data-tipo');
        var datos = leer();
        if (inp.checked) { datos[id] = tipo; explotar(inp.closest('.like-btn')); } else { delete datos[id]; }
        guardar(datos);
        if (window.ositoCurrentUser && window.ositoCurrentUser.uid) {
            reaccionGlobal(id, tipo).catch(function (err) {
                if (err && err.message === 'login_required') return;
                console.warn('[Likes] No se pudo sincronizar el like:', err);
            });
        } else {
            var aviso = caja.querySelector('.vc-hint');
            if (!aviso) {
                aviso = document.createElement('span'); aviso.className = 'vc-hint'; caja.appendChild(aviso);
            }
            aviso.textContent = 'Inicia sesión para compartir tu reacción';
            setTimeout(function () { if (aviso) aviso.textContent = ''; }, 2500);
        }
        // Sincroniza el mismo video si aparece en otra pestaña (Favoritos, Series…).
        Array.prototype.forEach.call(document.querySelectorAll('.vc-actions[data-vid="' + id + '"]'), function (otra) {
            Array.prototype.forEach.call(otra.querySelectorAll('.vc-input'), function (x) {
                x.checked = datos[id] === x.getAttribute('data-tipo');
            });
        });
    });

    /* ---------- Botón de reproducir ---------- */
    var PLAY_HTML = '<span class="vp-ring"></span><span class="vp-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5z"/></svg></span>';

    /* ---------- Rendimiento: fondos de video (se mantienen, solo más livianos) ---------- */
    var NOMBRES = { halloween: 1, navidad: 1, cumpleanos: 1 };
    function fuenteFondo(tema, original) {
        if (NOMBRES[tema] && equipoLimitado()) return 'fondos/' + tema + '-lite.mp4';
        return original;
    }
    function portadaFondo(tema) { return NOMBRES[tema] ? 'fondos/' + tema + '.jpg' : ''; }

    // La portada se ve al instante; el video empieza a bajar cuando el navegador ya pintó la página.
    function cargarDiferido(video, src) {
        var poner = function () { if (video.isConnected !== false) { video.src = src; try { video.load(); } catch (e) {} } };
        if ('requestIdleCallback' in window) requestIdleCallback(poner, { timeout: 1500 });
        else setTimeout(poner, 400);
    }

    // Mientras suena un video de YouTube, el video de fondo se pausa (no decodificar dos a la vez).
    function revisarReproductor() {
        var v = document.querySelector('#modo-sitio-video video');
        if (!v) return;
        var sonando = document.querySelector('.video-thumbnail[data-playing="true"] iframe');
        if (sonando && !v.paused) { try { v.pause(); } catch (e) {} v.dataset.pausaPorReproductor = '1'; }
        else if (!sonando && v.dataset.pausaPorReproductor === '1' && !document.hidden) {
            delete v.dataset.pausaPorReproductor;
            if (!sinAnimaciones()) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        }
    }
    setInterval(revisarReproductor, 2000);

    setTimeout(prepararConteos, 300);
    document.addEventListener('osito:auth-ready', prepararConteos);
    window.addEventListener('load', prepararConteos);

    window.OsitoV49 = {
        accionesHTML: accionesHTML,
        playHTML: PLAY_HTML,
        fuenteFondo: fuenteFondo,
        portadaFondo: portadaFondo,
        cargarDiferido: cargarDiferido,
        revisarReproductor: revisarReproductor,
        equipoLimitado: equipoLimitado,
        prepararConteos: prepararConteos
    };
}());
