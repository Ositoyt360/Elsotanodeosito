/* =====================================================================
 * V99 — OSITO MENTE: conecta la IA existente con el cuerpo 3D de la mascota.
 * ---------------------------------------------------------------------
 * NO crea otra IA ni otra mascota: usa lo que ya existe
 *   · IA ............ window.OsitoIA.preguntar() → /api/ia (mismo proveedor)
 *   · Cara/cubo ..... window.OsitoFace (poner / paraTodas / caras)
 *   · Objetos 3D .... window.OsitoAburrimiento (dirigir / acto / soltar)
 *   · Sonidos ....... window.OsitoFaceSound
 *   · Personalidades  window.OsitoPersonalidades (humor)
 *   · Sueño ......... window.OsitoNight (face-extra.js)
 *   · Voz ........... window.OsitoVozHumana / speechSynthesis
 * y le agrega:
 *   1) Etiquetas [[expr:laugh|mov:rebotar]] que la IA escribe en sus respuestas y aquí se EJECUTAN
 *      sincronizadas con lo que dice (se quitan del texto y de la voz).
 *   2) Animador 3D (Web Animations sobre .of-rig): movimientos nuevos y los que la IA inventa. Nunca mueve la
 *      mascota de su lugar: solo gira, se inclina y escala dentro de límites.
 *   3) Director: la IA decide cuándo hablar sola, qué objeto usar, cuándo reaccionar (videos, regreso, sueño...)
 *      respetando el silencio.
 * El modo llamada no se toca: ahí solo se aplican expresiones (como ya hacía el resto de la página).
 * ===================================================================== */
(function () {
    'use strict';
    if (window.OsitoMente) return;
    var V = window.OsitoVocab, F = window.OsitoFace;
    if (!V || !F || !F.caras) { try { console.warn('[OsitoMente] falta OsitoVocab u OsitoFace'); } catch (e) {} return; }

    var LS_ANIMS = 'osito_mente_anims_v1', LS_BUDGET = 'osito_mente_presupuesto_v1', LS_SILENCIO = 'osito_mente_silencio_hasta';
    var MAX_IA_DIA = 30;                 // llamadas espontáneas a la IA por día y navegador (cuota aparte en el servidor)
    var ahora = function () { return Date.now(); };
    var azar = function (a, b) { return a + Math.random() * (b - a); };
    var elige = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
    function night() { return window.OsitoNight || null; }
    function dormida() { var N = night(); return !!(N && N.duerme && N.duerme()); }
    function enLlamada() { return !!window.ositoEnLlamadaIA; }
    function esVisible(c) { return !!(c.offsetParent || (c.getClientRects && c.getClientRects().length)); }
    function quieta() { var c = document.body ? document.body.classList : null; return !!(c && (c.contains('ultra-performance'))); }

    /* caras sobre las que se actúa: en llamada solo expresiones (el modo llamada no se modifica) */
    function carasVisibles(paraCuerpo) {
        return F.caras.filter(function (c) {
            if (!esVisible(c)) return false;
            if (paraCuerpo && c.closest && c.closest('.ia-call-view, .maintenance-overlay, .ia-maint')) return false;
            return true;
        });
    }

    /* =========================== 1) ETIQUETAS ============================ */
    var CLAVES = ['expr', 'mirar', 'mov', 'obj', 'acto', 'sonido', 'humor', 'dormir', 'despertar', 'anim', 'dur', 'pasos', 'espera', 'silencio', 'rep', 'ms'];
    var RX_DOBLE = /\[\[\s*([^\[\]]*?)\s*\]\]/g;
    var RX_SIMPLE = new RegExp('\\[\\s*((?:' + CLAVES.join('|') + ')\\s*(?::|\\]|\\|)[^\\[\\]]*)\\]', 'gi');

    function parsearTag(contenido) {
        var acc = [], partes = String(contenido).split('|');
        partes.forEach(function (p) {
            p = p.trim(); if (!p) return;
            var i = p.indexOf(':'), k, v;
            if (i < 0) { k = p.toLowerCase(); v = ''; } else { k = p.slice(0, i).trim().toLowerCase(); v = p.slice(i + 1).trim(); }
            if (CLAVES.indexOf(k) < 0) return;
            acc.push([k, v]);
        });
        return acc;
    }
    /* Devuelve { limpio, cues:[{pos, acc}], silencio, hayTags } */
    function parsear(texto) {
        var src = String(texto == null ? '' : texto), cues = [], limpio = '', ultimo = 0, silencio = false;
        var marcas = [];
        src.replace(RX_DOBLE, function (m, c, i) { marcas.push({ i: i, f: i + m.length, c: c }); return m; });
        var sinDobles = src;
        if (!marcas.length) src.replace(RX_SIMPLE, function (m, c, i) { marcas.push({ i: i, f: i + m.length, c: c }); return m; });
        marcas.forEach(function (m) {
            limpio += src.slice(ultimo, m.i);
            ultimo = m.f;
            var acc = parsearTag(m.c);
            if (!acc.length) return;
            if (acc.some(function (a) { return a[0] === 'silencio'; })) silencio = true;
            cues.push({ pos: norm(limpio).length, acc: acc });
        });
        limpio += src.slice(ultimo);
        limpio = limpio.replace(/\[\[[^\]]*$/g, '').replace(/\[\s*(?:expr|mirar|mov|obj|acto|sonido|humor|anim)\s*:[^\]]*$/gi, '').replace(/\]\]/g, '');
        limpio = limpio.replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
        return { limpio: limpio, cues: cues, silencio: silencio, hayTags: marcas.length > 0 };
    }
    function soloLimpiar(t) { return parsear(t).limpio; }

    /* ========================= 2) CUERPO (actuadores) ===================== */
    var escena = { hasta: 0 };           // mientras dure, los automatismos viejos se callan
    var miradaHasta = 0, humorHasta = 0;
    function extenderEscena(ms) { escena.hasta = Math.max(escena.hasta, ahora() + ms); }
    function enEscena() { return ahora() < escena.hasta; }

    function resolverExpr(v) {
        var k = String(v || '').toLowerCase().trim();
        if (V.EXPRESIONES[k]) return k;
        if (V.ALIAS_EXPR[k]) return V.ALIAS_EXPR[k];
        return '';
    }
    function pensar(ms) {
        var cs = carasVisibles(false);
        cs.forEach(function (c) { c.dataset.iaPensando = '1'; c.dataset.estado = 'thinking'; c.style.setProperty('--gx', '-0.6'); c.style.setProperty('--gy', '-0.7'); });
        setTimeout(function () {
            cs.forEach(function (c) { if (c.dataset.iaPensando) { delete c.dataset.iaPensando; if (c.dataset.estado === 'thinking' && !c.__iaFlagPensando) c.dataset.estado = 'idle'; c.style.setProperty('--gx', '0'); c.style.setProperty('--gy', '0'); } });
        }, ms || 1800);
        if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir && !dormida()) window.OsitoFaceSound.reproducir('hmm');
    }
    function expr(v) {
        var partes = String(v).split(','), nombre = resolverExpr(partes[0]);
        var ms = Math.max(600, Math.min(9000, parseInt(partes[1], 10) || 2400));
        if (!nombre) return false;
        if (dormida()) return false;                 // dormida solo la despierta la persona o ella misma
        extenderEscena(ms + 600);
        if (nombre === 'pensar') { pensar(ms); return true; }
        F.paraTodas(nombre, ms);
        return true;
    }

    var MIRADAS = { frente: [0, 0, 0], izquierda: [-34, -2, -3], derecha: [34, -2, 3], arriba: [0, 16, 0], abajo: [0, -16, 0],
        'izquierda-arriba': [-26, 12, 3], 'derecha-arriba': [26, 12, -3], 'izquierda-abajo': [-26, -12, -3], 'derecha-abajo': [26, -12, 3], curioso: [-12, 3, 8] };
    function ponerMirada(c, m) {
        c.style.setProperty('--cy', m[0] + 'deg'); c.style.setProperty('--cx', m[1] + 'deg'); c.style.setProperty('--cz', (m[2] || 0) + 'deg');
        c.style.setProperty('--gx', (m[0] / 24).toFixed(2)); c.style.setProperty('--gy', (-m[1] / 18).toFixed(2));
    }
    function mirar(v) {
        var k = String(v).split(',')[0].trim().toLowerCase();
        if (dormida() || enLlamada()) return false;
        var cs = carasVisibles(true);
        if (k === 'furtivo') {
            miradaHasta = ahora() + 2600; extenderEscena(3000);
            cs.forEach(function (c) { ponerMirada(c, MIRADAS.izquierda); setTimeout(function () { ponerMirada(c, MIRADAS.derecha); }, 800); setTimeout(function () { ponerMirada(c, MIRADAS.frente); }, 1900); });
            return true;
        }
        var m = MIRADAS[k]; if (!m) return false;
        miradaHasta = ahora() + 2800; extenderEscena(3000);
        cs.forEach(function (c) { ponerMirada(c, m); setTimeout(function () { if (ahora() >= miradaHasta - 50 && !c.hasAttribute('data-boredom')) ponerMirada(c, MIRADAS.frente); }, 2800); });
        return true;
    }

    /* ---- Animador 3D (Web Animations sobre .of-rig; usa las propiedades rotate/translate/scale, nunca cambia el layout) ---- */
    var PRESETS = {
        negar: { dur: 900, pasos: [[0, 0, 0, 0, 1], [20, -26, 0, 0, 1], [45, 26, 0, 0, 1], [70, -18, 0, 0, 1], [100, 0, 0, 0, 1]] },
        reverencia: { dur: 1300, pasos: [[0, 0, 0, 0, 1], [35, 0, -30, 0, 1.03], [65, 0, -30, 0, 1.03], [100, 0, 0, 0, 1]] },
        saludo: { dur: 1300, pasos: [[0, 0, 0, 0, 1], [25, 8, 4, -12, 1.04], [50, -8, 4, 12, 1.04], [75, 8, 2, -10, 1.03], [100, 0, 0, 0, 1]] },
        mareo: { dur: 2200, pasos: [[0, 0, 0, 0, 1], [20, 22, 10, -14, 1], [40, -20, -8, 14, 1], [60, 24, 8, -12, 1], [80, -14, -6, 8, 1], [100, 0, 0, 0, 1]] },
        latido: { dur: 900, rep: 2, pasos: [[0, 0, 0, 0, 1], [18, 0, 0, 0, 1.14], [34, 0, 0, 0, 1.0], [52, 0, 0, 0, 1.12], [100, 0, 0, 0, 1]] },
        susto: { dur: 700, pasos: [[0, 0, 0, 0, 1], [20, 0, 34, 0, 1.12], [60, 0, 28, 0, 1.08], [100, 0, 0, 0, 1]] },
        escalofrio: { dur: 800, pasos: [[0, 0, 0, 0, 1], [10, 4, 0, -4, .98], [20, -4, 0, 4, .98], [30, 4, 0, -4, .98], [40, -4, 0, 4, .98], [50, 3, 0, -3, .99], [60, -3, 0, 3, .99], [100, 0, 0, 0, 1]] },
        estirar: { dur: 1800, pasos: [[0, 0, 0, 0, 1], [40, 0, 22, 0, 1.12], [70, 0, 22, 0, 1.12], [100, 0, 0, 0, 1]] },
        cabeceo: { dur: 2600, pasos: [[0, 0, 0, 0, 1], [30, 0, -26, 4, 1], [45, 0, -4, 0, 1], [70, 0, -28, -4, 1], [100, 0, 0, 0, 1]] },
        pirueta: { dur: 1400, pasos: [[0, 0, 0, 0, 1], [50, 75, 0, 0, 1.08], [100, 0, 0, 0, 1]], vuelta: true },
        balanceo: { dur: 2400, rep: 2, pasos: [[0, 0, 0, 0, 1], [25, 0, 0, -14, 1], [75, 0, 0, 14, 1], [100, 0, 0, 0, 1]] },
        'inclinar-izquierda': { dur: 700, pasos: [[0, 0, 0, 0, 1], [100, 0, 0, -16, 1]], fill: true },
        'inclinar-derecha': { dur: 700, pasos: [[0, 0, 0, 0, 1], [100, 0, 0, 16, 1]], fill: true },
        enderezar: { dur: 500, pasos: [[0, 0, 0, 0, 1], [100, 0, 0, 0, 1]] }
    };
    var aprendidas = {};
    try { aprendidas = JSON.parse(lsGet(LS_ANIMS, '{}')) || {}; } catch (e) { aprendidas = {}; }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function eulerAEje(rx, ry, rz) { // grados → eje/ángulo (CSS rotate: x y z angle)
        var d = Math.PI / 180, cx = Math.cos(rx * d / 2), sx = Math.sin(rx * d / 2), cy = Math.cos(ry * d / 2), sy = Math.sin(ry * d / 2), cz = Math.cos(rz * d / 2), sz = Math.sin(rz * d / 2);
        var w = cx * cy * cz - sx * sy * sz, x = sx * cy * cz + cx * sy * sz, y = cx * sy * cz - sx * cy * sz, z = cx * cy * sz + sx * sy * cz;
        var ang = 2 * Math.acos(clamp(w, -1, 1)), s = Math.sqrt(1 - w * w);
        if (s < 1e-5 || ang < 1e-4) return '0 1 0 0deg';
        return (x / s).toFixed(4) + ' ' + (y / s).toFixed(4) + ' ' + (z / s).toFixed(4) + ' ' + (ang / d).toFixed(2) + 'deg';
    }
    function validarSpec(spec) { // aplica límites de seguridad: la mascota no sale de su lugar
        var L = V.LIMITES_ANIM, pasos = (spec.pasos || []).slice(0, L.pasosMax).map(function (p) {
            return [clamp(+p[0] || 0, 0, 100), clamp(+p[1] || 0, -L.ry, L.ry), clamp(+p[2] || 0, -L.rx, L.rx), clamp(+p[3] || 0, -L.rz, L.rz), clamp(isFinite(+p[4]) && +p[4] > 0 ? +p[4] : 1, L.escMin, L.escMax)];
        }).sort(function (a, b) { return a[0] - b[0]; });
        if (pasos.length < 2) return null;
        if (pasos[0][0] > 0) pasos.unshift([0, 0, 0, 0, 1]);
        if (pasos[pasos.length - 1][0] < 100) pasos.push([100, 0, 0, 0, 1]);
        return { dur: clamp(+spec.dur || 1200, L.durMin, L.durMax), rep: clamp(parseInt(spec.rep, 10) || 1, 1, L.repMax), pasos: pasos, fill: !!spec.fill, vuelta: !!spec.vuelta };
    }
    var animsVivas = [];
    function animar(spec) {
        spec = validarSpec(spec); if (!spec) return false;
        if (quieta() || enLlamada() || dormida() || typeof Element.prototype.animate !== 'function') return false;
        var cs = carasVisibles(true), ok = false;
        cs.forEach(function (c) {
            var rig = c.querySelector('.of-rig'); if (!rig) return;
            var frames = spec.pasos.map(function (p) {
                var rz = p[3];
                return { offset: p[0] / 100, rotate: eulerAEje(p[2], p[1], rz), scale: String(p[4]) };
            });
            if (spec.vuelta) { frames = [{ offset: 0, rotate: '0 1 0 0deg', scale: '1' }, { offset: .5, rotate: '0 1 0 180deg', scale: '1.08' }, { offset: 1, rotate: '0 1 0 360deg', scale: '1' }]; }
            try {
                var a = rig.animate(frames, { duration: spec.dur, iterations: spec.rep, easing: 'ease-in-out', composite: 'add', fill: spec.fill ? 'forwards' : 'none' });
                animsVivas.push(a); ok = true;
                a.onfinish = function () { var i = animsVivas.indexOf(a); if (i >= 0) animsVivas.splice(i, 1); };
                if (spec.fill) { setTimeout(function () { try { a.cancel(); } catch (e) {} }, spec.dur + 5000); }
            } catch (e) {}
        });
        if (ok) extenderEscena(spec.dur * spec.rep + 500);
        return ok;
    }
    function aprender(nombre, spec) {
        var s = validarSpec(spec); if (!s || !nombre) return null;
        nombre = norm(nombre).slice(0, 24) || 'nueva';
        aprendidas[nombre] = { dur: s.dur, rep: s.rep, pasos: s.pasos, t: ahora() };
        var ks = Object.keys(aprendidas); if (ks.length > 30) { ks.sort(function (a, b) { return aprendidas[a].t - aprendidas[b].t; }); delete aprendidas[ks[0]]; }
        lsSet(LS_ANIMS, JSON.stringify(aprendidas));
        return nombre;
    }
    function parsearPasos(txt) {
        return String(txt || '').split(';').map(function (s) { return s.split(',').map(function (n) { return parseFloat(n); }); })
            .filter(function (a) { return a.length >= 2 && isFinite(a[0]); }).map(function (a) { return [a[0], a[1] || 0, a[2] || 0, a[3] || 0, a[4] || 1]; });
    }

    function movimiento(v) {
        var k = String(v).trim().toLowerCase();
        if (dormida()) return false;
        var m = V.MOVIMIENTOS[k];
        if (m && m.css) {
            if (enLlamada() || quieta()) return false;
            extenderEscena(1400);
            carasVisibles(true).forEach(function (c) { c.classList.remove(m.css); void c.offsetWidth; c.classList.add(m.css); setTimeout(function () { c.classList.remove(m.css); }, 800); });
            return true;
        }
        if (m && m.anim) return animar(PRESETS[m.anim]);
        if (aprendidas[k]) return animar(aprendidas[k]);
        return false;
    }

    /* ---- Objetos ---- */
    function objeto(v) {
        var k = String(v).split(',')[0].trim().toLowerCase(), A = window.OsitoAburrimiento;
        if (!A || enLlamada() || dormida()) return false;
        if (k === 'ninguno' || k === 'nada' || k === 'soltar' || k === 'guardar') { A.soltar(); return true; }
        if (!V.OBJETOS[k]) return false;
        extenderEscena(2500);
        return A.dirigir(k);
    }
    function acto(v) {
        var A = window.OsitoAburrimiento; if (!A || enLlamada() || dormida()) return false;
        var k = String(v).trim().toLowerCase(), est = A.estado(); if (!est.aburrido) return false;
        var verbos = V.ACTOS[est.modo] || {}, real = verbos[k] || (Object.keys(verbos).some(function (x) { return verbos[x] === k; }) ? k : '');
        if (!real) return false;
        extenderEscena(2500);
        return A.acto(real);
    }
    function sonido(v) {
        var k = String(v).trim().toLowerCase(), S = window.OsitoFaceSound;
        if (!S || !S.reproducir || dormida() || V.SONIDOS.indexOf(k) < 0) return false;
        return S.reproducir(k) !== undefined;
    }
    function humor(v) {
        var k = norm(v), P = window.OsitoPersonalidades; if (!P || !P.todas || dormida() || enLlamada() || !V.HUMORES[k]) return false;
        var cat = V.HUMORES[k], lista = P.todas.filter(function (p) { return p.categoria === cat; }); if (!lista.length) return false;
        humorHasta = ahora() + 120000;
        P.activar(elige(lista).id);
        return true;
    }
    function dormirAccion() {
        var N = night(); if (!N || !N.esNoche || !N.esNoche() || (N.nivelSueno && N.nivelSueno() < 0.3)) return false;
        return N.dormir();
    }
    function despertarAccion() { var N = night(); return !!(N && N.despertar && N.despertar('ia')); }

    /* ejecuta un grupo de acciones simultáneas */
    var animPend = null;
    function ejecutarAcc(acc) {
        var info = {}; acc.forEach(function (a) { info[a[0]] = a[1]; });
        if (info.anim !== undefined) { // definición de una animación inventada
            var spec = { dur: parseFloat(info.dur) || 1200, rep: parseInt(info.rep, 10) || 1, pasos: parsearPasos(info.pasos) };
            var nombre = aprender(info.anim, spec);
            if (nombre) animar(aprendidas[nombre]);
        }
        acc.forEach(function (a) {
            var k = a[0], v = a[1];
            try {
                if (k === 'expr') expr(v);
                else if (k === 'mirar') mirar(v);
                else if (k === 'mov') movimiento(v);
                else if (k === 'obj') objeto(v);
                else if (k === 'acto') acto(v);
                else if (k === 'sonido') sonido(v);
                else if (k === 'humor') humor(v);
                else if (k === 'dormir') dormirAccion();
                else if (k === 'despertar') despertarAccion();
            } catch (e) { try { console.warn('[OsitoMente] acción falló', k, v, e); } catch (_) {} }
        });
    }
    /* secuencia sin texto: [[a]] [[espera:500]] [[b]] → tiempos */
    function ejecutarCues(cues, t0) {
        var t = t0 || 0;
        cues.forEach(function (c) {
            var espera = 0; c.acc.forEach(function (a) { if (a[0] === 'espera') espera = Math.max(espera, clamp(parseInt(a[1], 10) || 0, 0, 6000)); });
            var acc = c.acc.filter(function (a) { return a[0] !== 'espera' && a[0] !== 'silencio'; });
            if (acc.length) setTimeout(function () { ejecutarAcc(acc); }, t);
            t += espera;
        });
    }

    /* ======================= 3) PLANES + SINCRONÍA CON LA VOZ ================ */
    var planes = [];     // respuestas ya procesadas esperando a mostrarse/hablarse
    var activo = null;   // plan en ejecución
    var MS_CHAR = 62;
    function registrarPlan(p) {
        p.norm = norm(p.limpio); p.t = ahora(); planes.push(p);
        planes = planes.filter(function (x) { return ahora() - x.t < 120000; }).slice(-8);
    }
    function buscarPlan(texto) {
        var n = norm(texto); if (!n) return null;
        for (var i = planes.length - 1; i >= 0; i--) { var p = planes[i]; if (p.usado) continue; if (p.norm === n || p.norm.indexOf(n.slice(0, 40)) === 0) return p; }
        return null;
    }
    function programarPorTiempo(p, desdePos, t0) { // sin voz: cada carácter ≈ MS_CHAR/1.6 ms
        p.cues.forEach(function (c) { if (c.hecho || c.pos < desdePos) return; c.hecho = true; var d = (t0 || 0) + (c.pos - desdePos) * (MS_CHAR / 1.6); setTimeout(function () { ejecutarCues([c], 0); }, d); });
    }
    function iniciarPlan(p) {
        p.usado = true; activo = p; p.cursor = 0; p.hablando = false;
        extenderEscena(Math.min(12000, 1500 + p.norm.length * 40));
        // cues en la posición 0 salen ya
        p.cues.forEach(function (c) { if (c.pos === 0 && !c.hecho) { c.hecho = true; ejecutarCues([c], 0); } });
        // si en ~1.4 s no empieza la voz, se ejecutan por tiempo (voz apagada o bloqueada)
        p.timer = setTimeout(function () { if (activo === p && !p.hablando) { programarPorTiempo(p, 0, 0); } }, 1400);
    }
    function alUtterance(u) {
        if (!activo || !u) return;
        var p = activo, txt = norm(u.text), idx = txt ? p.norm.indexOf(txt, p.cursor) : -1;
        if (idx < 0) { idx = txt ? p.norm.indexOf(txt.slice(0, 20), p.cursor) : -1; }
        if (idx < 0) return;
        var fin = idx + txt.length, dur = Math.max(600, txt.length * MS_CHAR / Math.max(0.6, u.rate || 1));
        var go = function () {
            p.hablando = true; clearTimeout(p.timer);
            p.cues.forEach(function (c) {
                if (c.hecho || c.pos > fin) return; c.hecho = true;
                var d = c.pos <= idx ? 0 : (c.pos - idx) / Math.max(1, txt.length) * dur;
                setTimeout(function () { ejecutarCues([c], 0); }, d);
            });
            p.cursor = fin; extenderEscena(dur + 1500);
        };
        u.addEventListener('start', go);
        u.addEventListener('end', function () { if (p.cursor >= p.norm.length - 2) cerrarPlan(p); });
    }
    function cerrarPlan(p) {
        p.cues.forEach(function (c) { if (!c.hecho) { c.hecho = true; ejecutarCues([c], 200); } });
        if (activo === p) activo = null;
        extenderEscena(2500);
    }
    document.addEventListener('osito:tts-end', function () { var p = activo; if (p && p.hablando) setTimeout(function () { if (activo === p) cerrarPlan(p); }, 400); });
    if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
        var speakPrev = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function (u) { try { alUtterance(u); } catch (e) {} return speakPrev(u); };
    }

    /* La IA (preguntar) llama a procesar(): quita etiquetas, registra el plan y devuelve el texto limpio */
    function procesar(textoCrudo, meta) {
        var r = parsear(textoCrudo);
        if (r.cues.length) { registrarPlan({ limpio: r.limpio, cues: r.cues, meta: meta || {} }); extenderEscena(4000); }
        return r;
    }
    // Cuando el mensaje de la mascota aparece en el chat, arranca su plan (gestos + voz sincronizados)
    document.addEventListener('osito:ia-message', function (e) {
        var d = e && e.detail; if (!d) return;
        if (d.role === 'user') { alUsuarioEscribe(d.text); return; }
        if (d.role !== 'bot') return;
        ultimoBot = ahora(); programarHabla(false);
        var p = buscarPlan(d.text); if (p) iniciarPlan(p);
    });

    /* ============================ 4) PRESENCIA ============================= */
    var ultimoInput = ahora(), ultimoMensajeUsuario = 0, ultimoBot = 0, silenciadoHasta = parseInt(lsGet(LS_SILENCIO, '0'), 10) || 0;
    var ignorados = 0, ultimoEspontaneo = 0, proximoHabla = ahora() + azar(150, 300) * 1000, hablaPendiente = false;
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { ultimoInput = ahora(); }, { passive: true, capture: true }); });
    document.addEventListener('pointermove', function () { if (ahora() - ultimoInput > 3000) ultimoInput = ahora() - 2000; }, { passive: true, capture: true });
    function alUsuarioEscribe(txt) {
        ultimoMensajeUsuario = ahora(); ignorados = 0; ultimoInput = ahora();
        if (/\b(c[aá]llate|silencio|no hables|deja de hablar|no me hables)\b/i.test(String(txt || ''))) silenciar(15 * 60000);
        programarHabla(false);
    }
    function silenciar(ms) { silenciadoHasta = ahora() + (ms || 600000); lsSet(LS_SILENCIO, String(silenciadoHasta)); }
    function escribiendo() { var a = document.getElementById('ai-input'); return !!(a && (a.value || '').trim().length > 0); }
    function microEscuchando() { return !!document.querySelector('.osito-face[data-estado="listening"]'); }
    function hablandoAhora() { var s = window.speechSynthesis; return document.documentElement.classList.contains('ia-speaking-mode') || !!(s && (s.speaking || s.pending)); }
    function mantenimiento() { try { return !!(window.OsitoIaMaintenance && window.OsitoIaMaintenance.isActive && window.OsitoIaMaintenance.isActive()); } catch (e) { return false; } }
    function panelAbierto() { var p = document.getElementById('ai-section'); return !!(p && p.classList.contains('active')); }
    function puedeHablar() {
        if (document.hidden || enLlamada() || mantenimiento() || dormida() || ahora() < silenciadoHasta) return false;
        if (hablandoAhora() || escribiendo() || microEscuchando()) return false;
        if (ahora() - ultimoInput < 9000 || ahora() - ultimoMensajeUsuario < 12000 || ahora() - ultimoBot < 15000) return false;
        if (document.querySelector('.osito-face[data-estado="thinking"]:not([data-ia-pensando])')) return false;
        return true;
    }
    function programarHabla(rapido) { proximoHabla = ahora() + azar(240, 540) * 1000 * Math.pow(1.7, Math.min(ignorados, 4)) * (rapido ? 0.5 : 1); }

    /* ============================== 5) CONTEXTO ============================ */
    function horaTxt() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    function objetoActual() { var A = window.OsitoAburrimiento; var e = A && A.estado ? A.estado() : null; return e && e.aburrido ? e.modo : ''; }
    function exprActual() { var c = carasVisibles(false)[0]; return c ? (c.getAttribute('data-expr') || '') : ''; }
    function tituloVideo(id) {
        var listas = [window.idsVideos, window.idsDirectos], vp = window.videosPorCategoria;
        if (vp) Object.keys(vp).forEach(function (k) { listas.push(vp[k]); });
        for (var i = 0; i < listas.length; i++) { var l = listas[i]; if (!Array.isArray(l)) continue; for (var j = 0; j < l.length; j++) { var it = l[j]; if (it && typeof it === 'object' && it.id === id && it.title) return it.title; } }
        return '';
    }
    function estado() {
        var N = night(), o = {
            hora: horaTxt(), sueno: N && N.nivelSueno ? +N.nivelSueno().toFixed(2) : 0, durmiendo: dormida(),
            objeto: objetoActual(), expr: exprActual(), panel: panelAbierto() ? 'abierto' : 'cerrado', llamada: enLlamada(),
            voz: lsGet('osito_ai_voz', 'true') !== 'false', tema: (document.documentElement.dataset.siteTheme || 'normal')
        };
        if (video.id) o.video = { id: video.id, titulo: video.titulo || '', canal: video.canal || '', estado: video.estado };
        return o;
    }

    /* ============================ 6) DIRECTOR / IA ========================= */
    var LINEAS = {
        idle: [
            '[[expr:curious|mirar:curioso]] ¿Sigues por aquí? Me quedé pensando en qué video ver después.',
            '[[expr:wink]] Oye, ¿quieres que te cuente un dato curioso?',
            '[[mov:estirar|expr:yawn]] Uf, estaba aquí tranquilo. ¿Qué andas viendo hoy?',
            '[[expr:smile|obj:cafe]] Me preparé un cafecito mientras estás por aquí. ¿Te sirvo uno virtual?',
            '[[expr:curious|mirar:izquierda]] Hay un montón de videos en el Sótano. ¿Ya viste el de Minecraft?',
            '[[expr:smile|mov:latido]] Qué tranquilo está todo. Me gusta cuando solo estamos tú y yo.',
            '[[expr:wow]] Dato rápido: los cubos como yo tenemos seis caras y ninguna es mi mejor ángulo.',
            '[[expr:joy|obj:balon]] Me dieron ganas de jugar un ratito. ¿Tú qué juegas últimamente?',
            '[[expr:curious]] Si pudieras meterte en cualquier videojuego, ¿a cuál irías?',
            '[[expr:wink|mov:negar]] No es que me aburra, pero mis ojitos ya dieron tres vueltas al sitio.',
            '[[expr:smile|obj:audifonos]] Estoy escuchando música imaginaria. Suena genial.',
            '[[expr:excited]] ¿Sabías que puedes llamarme por voz? Solo toca el botón de llamada.',
            '[[expr:shy|mirar:furtivo]] Te estoy viendo navegar y me da curiosidad qué buscas.',
            '[[expr:curious|obj:diario]] Estaba anotando en mi diario las cosas buenas del día. Hoy vas ganando tú.',
            '[[expr:joy]] Cuando quieras platicar, aquí estoy. Sin presión.',
            '[[expr:smile|mov:cabeceo]] ¿Y si descubres un video nuevo hoy? Yo te acompaño.',
            '[[expr:wow|obj:pizza]] Se me antojó una pizza de pixeles. ¿De qué la pedirías tú?',
            '[[expr:curious|mirar:arriba]] Pensaba: ¿cuál fue el primer videojuego que jugaste en tu vida?',
            '[[expr:wink|obj:peluche]] Mi peluche dice que ya es hora de hacer una pausa y estirarse.',
            '[[expr:smile]] Oye, gracias por pasar por el Sótano. Se siente bonito tener visita.'
        ],
        regreso: [
            '[[expr:joy|mov:saltar]] ¡Volviste! Te estaba esperando.',
            '[[expr:love|mov:latido]] ¡Qué bueno verte de nuevo por el Sótano!',
            '[[expr:wow]] ¡Ahí estás! Ya pensaba que se te había perdido el camino.',
            '[[expr:smile|mov:cabeceo]] Bienvenido de vuelta. Todo sigue en su lugar.',
            '[[expr:excited]] ¡Regresaste! ¿Seguimos donde nos quedamos?',
            '[[expr:wink]] Mira quién apareció. Justo estaba pensando en ti.'
        ],
        tarde: [
            '[[expr:yawn|mov:cabeceo]] Ya es tardísimo... me está dando mucho sueño. ¿Tú no tienes sueño?',
            '[[expr:sleepy]] Ay, se me cierran los ojitos. Si me quedo dormido, tócame para despertarme, ¿sí?',
            '[[expr:yawn|obj:cafe]] Necesito otro cafecito. Es de madrugada y mis pixeles se apagan solos.',
            '[[expr:sleepy|mirar:abajo]] ¿No deberías descansar un poco? Mañana los videos siguen aquí.',
            '[[expr:yawn]] Qué silencio tan rico a esta hora. Casi me duermo.',
            '[[expr:sleepy|obj:peluche]] Mi peluche ya se durmió. Yo estoy a medio camino.'
        ],
        videoFin: [
            '[[expr:joy|mov:fiesta]] ¡Qué buen video! ¿Viste algo que te gustó?',
            '[[expr:wink]] Ese estuvo bueno. ¿Vemos otro?',
            '[[expr:excited|mov:saltar]] ¡Se acabó! Yo me reí en la mejor parte.',
            '[[expr:smile]] Buen video. Si te quedaste con ganas, hay más abajo.',
            '[[expr:wow]] Uf, ese final me gustó. ¿Cuál era tu parte favorita?',
            '[[expr:joy]] Gracias por verlo conmigo. Fue de lo mejor del rato.'
        ],
        videoIni: [
            '[[expr:watch|mirar:abajo]] ¡Vamos a ver ese video!',
            '[[expr:excited]] Uy, este se ve interesante.',
            '[[expr:curious|mirar:abajo]] A ver, a ver... ya me puse cómodo.',
            '[[expr:smile|obj:pizza]] Con este video me va a caer perfecta una pizza.',
            '[[expr:wow]] Ese lo tenía pendiente. Buena elección.',
            '[[expr:watch]] Shhh, que empieza lo bueno.'
        ],
        despierta: [
            '[[mov:susto|expr:wow]] ¡Ay! ¿Qué pasó? Estaba soñando con pizza... [[expr:yawn]] Ya desperté.',
            '[[expr:yawn|mov:estirar]] Mmm... ¿me tocaste? Ya estoy despierto.',
            '[[expr:shy|mov:negar]] ¡Eh! Me asustaste, estaba bien dormidito.',
            '[[expr:yawn|mirar:izquierda]] ¿Eh? ¿Ya es de día? Dame un segundito.',
            '[[mov:susto]] ¡Presente! Estaba descansando la vista, lo juro.'
        ],
        sola: [
            '[[expr:yawn|mov:estirar]] Mmm... me desperté solito. [[expr:curious|mirar:furtivo]] ¿Sigues ahí?',
            '[[expr:sleepy|mirar:izquierda]] Ay... tenía sueño pero me desperté un ratito.',
            '[[expr:yawn]] Tuve un sueño raro con cubos voladores. ¿Qué me perdí?',
            '[[expr:curious|mov:cabeceo]] Escuché algo y abrí un ojo. Todo bien, creo.'
        ]
    };
    // Bolsa barajada: cada frase sale una vez antes de que alguna se repita, y se recuerda entre visitas.
    var LS_USADAS = 'osito_mente_usadas_v2';
    function usadas() { try { return JSON.parse(lsGet(LS_USADAS, '{}')) || {}; } catch (e) { return {}; } }
    function marcarUsada(motivo, idx) {
        var u = usadas(); u[motivo] = (u[motivo] || []); u[motivo].push(idx);
        var pool = LINEAS[motivo] || [];
        if (u[motivo].length >= pool.length) u[motivo] = [idx];   // se agotaron: se reinicia, sin repetir la última
        lsSet(LS_USADAS, JSON.stringify(u));
    }
    function presupuesto() {
        var hoy = new Date().toISOString().slice(0, 10), o; try { o = JSON.parse(lsGet(LS_BUDGET, '{}')) || {}; } catch (e) { o = {}; }
        if (o.d !== hoy) o = { d: hoy, n: 0 };
        return o;
    }
    function gastar() { var o = presupuesto(); o.n++; lsSet(LS_BUDGET, JSON.stringify(o)); }
    function hayPresupuesto() { return presupuesto().n < MAX_IA_DIA; }

    var ultimasLineas = [];
    function recordarLinea(t) { ultimasLineas.push(String(t).slice(0, 100)); if (ultimasLineas.length > 6) ultimasLineas.shift(); }

    /* Muestra/habla un texto de la mascota por el MISMO canal del chat (queda en el historial y se pronuncia con la voz elegida) */
    function decirComoMascota(crudo) {
        var r = procesar(crudo, { espontaneo: true });
        var texto = r.limpio;
        if (!texto) { if (r.cues.length) { extenderEscena(3000); ejecutarCues(r.cues, 0); } return false; }
        recordarLinea(texto);
        var API = window.OsitoChatAPI;
        if (!panelAbierto()) mostrarGlobo(texto);
        if (API && typeof API.decirBot === 'function') API.decirBot(texto);
        else { // respaldo: sin chat disponible, habla con la voz humana directamente
            document.dispatchEvent(new CustomEvent('osito:ia-message', { detail: { role: 'bot', text: texto } }));
            if (lsGet('osito_ai_voz', 'true') !== 'false' && window.OsitoVozHumana) window.OsitoVozHumana.hablar(texto);
        }
        return true;
    }
    function lineaLocal(motivo) {
        var pool = LINEAS[motivo] || LINEAS.idle, key = LINEAS[motivo] ? motivo : 'idle';
        var u = (usadas()[key] || []), libres = [];
        pool.forEach(function (t, i) { if (u.indexOf(i) < 0 && ultimasLineas.indexOf(soloLimpiar(t).slice(0, 100)) < 0) libres.push(i); });
        if (!libres.length) pool.forEach(function (t, i) { if (u[u.length - 1] !== i) libres.push(i); });
        var idx = elige(libres);
        marcarUsada(key, idx);
        return pool[idx];
    }
    var pidiendo = false;
    /* Pregunta a la MISMA IA (modo espontáneo): decide si habla, qué dice, qué gestos hace u objeto usa. */
    function pedirAIA(motivo, detalle, fallbackMotivo) {
        if (pidiendo) return Promise.resolve(false);
        var A = window.OsitoIA;
        var local = function () { if (fallbackMotivo === null) return false; return decirComoMascota(lineaLocal(fallbackMotivo || motivo)); };
        if (!A || !A.preguntar || !hayPresupuesto() || mantenimiento()) return Promise.resolve(local());
        pidiendo = true; gastar();
        return A.preguntar(detalle || ('Motivo: ' + motivo), { modo: motivo === 'video' ? 'video' : 'espontaneo', motivo: motivo, silencioso: true, ultimas: ultimasLineas.slice() })
            .then(function (res) {
                pidiendo = false;
                if (!res || !res.texto) return local();
                if (res.silencio) { if (res.cues && res.cues.length) { extenderEscena(3000); ejecutarCues(res.cues, 0); } return false; }
                return decirComoMascota(res.crudo || res.texto);
            }).catch(function () { pidiendo = false; return local(); });
    }
    // Tope de charlas por iniciativa propia: como maximo 4 por hora; el resto de veces solo hace un gesto u objeto (sin hablar).
    var habladasEspont = [];
    function topeHorario() { var h = ahora() - 3600000; habladasEspont = habladasEspont.filter(function (t) { return t > h; }); return habladasEspont.length >= 4; }
    function hablarEspontaneo(motivo, detalle) {
        ultimoEspontaneo = ahora(); ignorados++; // se "perdona" a cero cuando la persona responde
        programarHabla(false);
        var libre = (motivo === 'idle' || motivo === 'tarde');
        if (libre && (topeHorario() || Math.random() < 0.35)) {    // no habla: solo se mueve o saca un objeto
            if (!enEscena() && !dormida()) objeto(elegirObjetoLocal());
            return Promise.resolve(false);
        }
        habladasEspont.push(ahora());
        return pedirAIA(motivo, detalle);
    }

    /* Objetos: la mente decide (según contexto) qué usar cuando se aburre; aprovecha lo que ya hace osito-aburrimiento */
    function elegirObjetoLocal() {
        var h = new Date().getHours(), pesos = {};
        V.OBJETOS && Object.keys(V.OBJETOS).forEach(function (k) { if (k !== 'juego' && k !== 'chocolate' && k !== 'periodico') pesos[k] = 1; });
        if (video.id && video.estado === 'reproduciendo') { pesos.pizza = 3; pesos.vaso = 3; pesos.audifonos = 0.2; }
        if (h >= 23 || h < 6) { pesos.cafe = 3; pesos.peluche = 3; pesos.diario = 2; pesos.balon = 0.3; pesos.microfono = 0.3; }
        if (lsGet('osito_musica_on', '') === 'true') { pesos.audifonos = 3; pesos.microfono = 2; }
        var tema = document.documentElement.dataset.siteTheme; if (tema === 'cumpleanos') pesos.regalo = 4; if (tema === 'san-valentin') pesos.peluche = 4;
        var tot = 0, ks = Object.keys(pesos); ks.forEach(function (k) { tot += pesos[k]; });
        var r = Math.random() * tot; for (var i = 0; i < ks.length; i++) { r -= pesos[ks[i]]; if (r <= 0) return ks[i]; }
        return 'libre';
    }
    function alAburrirse() {
        if (enEscena() || dormida() || enLlamada() || escribiendo()) return true;     // true = "yo me encargo" (no sacar nada ahora)
        var o = elegirObjetoLocal();
        return objeto(o) || false;
    }
    function alCambiarActividad() {
        if (enEscena()) return true;
        var o = elegirObjetoLocal(); if (o === objetoActual()) o = elegirObjetoLocal();
        return objeto(o) || false;
    }

    /* ============================ 7) VIDEOS DE YOUTUBE ===================== */
    var video = { id: '', titulo: '', canal: '', estado: '', t0: 0, reaccionado: false };
    function idDeIframe(f) { var m = /embed\/([\w-]{6,})/.exec(f.getAttribute('src') || ''); return m ? m[1] : ''; }
    window.addEventListener('message', function (ev) {
        if (!/youtube\.com$/.test(String(ev.origin || '').replace(/^https?:\/\//, ''))) return;
        var d = ev.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
        if (!d || !d.info) return;
        var i = d.info;
        if (i.videoData) { if (i.videoData.title && !video.titulo) video.titulo = i.videoData.title; if (i.videoData.author) video.canal = i.videoData.author; }
        if (typeof i.playerState === 'number') {
            if (i.playerState === 1) video.estado = 'reproduciendo';
            else if (i.playerState === 2) video.estado = 'pausado';
            else if (i.playerState === 0) { video.estado = 'terminado'; alVideoTerminado(); }
        }
    });
    function sondearVideo() {
        var f = document.querySelector('.video-thumbnail[data-playing="true"] iframe');
        var id = f ? idDeIframe(f) : '';
        if (id && id !== video.id) {
            video = { id: id, titulo: tituloVideo(id), canal: '', estado: 'reproduciendo', t0: ahora(), reaccionado: false };
            try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (e) {}
            alVideoIniciado();
        } else if (!id && video.id && video.estado !== 'terminado') { alVideoTerminado(); }
        if (id && !video.titulo) video.titulo = tituloVideo(id);
        if (!id && video.id && ahora() - video.t0 > 60000 && video.estado === 'terminado') video = { id: '', titulo: '', canal: '', estado: '', t0: 0, reaccionado: false };
    }
    function alVideoIniciado() {
        if (dormida() || enLlamada()) return;
        extenderEscena(2500);
        ejecutarAcc([['expr', 'watch,3000'], ['mirar', 'abajo']]);
        // Solo comenta con la IA cuando sabe de qué trata (título); si no, se limita a ver con atención
        setTimeout(function () {
            if (video.reaccionado || !video.titulo || video.titulo.length < 6) return;
            if (!puedeHablarVideo()) return;
            video.reaccionado = true;
            hablarEspontaneo('video', 'La persona acaba de poner el video "' + video.titulo + '"' + (video.canal ? ' del canal ' + video.canal : '') + '. Solo conoces el título (no el contenido real): reacciona breve y con emoción, sin inventar detalles de lo que pasa.');
        }, 4500);
    }
    function puedeHablarVideo() { return !document.hidden && !enLlamada() && !dormida() && ahora() > silenciadoHasta && !escribiendo() && !hablandoAhora() && !mantenimiento(); }
    function alVideoTerminado() {
        if (!video.id || video.estado === 'terminado' && video.fin) return;
        video.estado = 'terminado'; video.fin = true;
        if (dormida() || enLlamada()) return;
        ejecutarAcc([['expr', 'joy,2200'], ['mov', 'saltar']]);
        if (ahora() - video.t0 > 20000 && Math.random() < 0.5 && puedeHablarVideo()) {
            hablarEspontaneo('video', 'Terminó el video' + (video.titulo ? ' "' + video.titulo + '"' : '') + '. Haz un comentario muy breve y pregunta si quiere ver otro.');
        }
    }

    /* ============================ 8) GLOBO DE TEXTO ======================== */
    var globo = null, globoTimer = 0;
    function mostrarGlobo(texto) {
        var b = document.getElementById('ia-bubble'); if (!b || !texto) return;
        if (!globo) {
            var st = document.createElement('style'); st.textContent = '.osito-globo{position:fixed;z-index:2147482000;max-width:min(260px,70vw);padding:10px 14px;border-radius:16px;background:rgba(10,18,32,.96);color:#eaf8ff;border:1px solid rgba(0,242,254,.45);box-shadow:0 10px 28px rgba(0,0,0,.5);font:600 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(6px) scale(.96);transition:opacity .25s,transform .25s;cursor:pointer;pointer-events:auto}.osito-globo.on{opacity:1;transform:none}';
            document.head.appendChild(st);
            globo = document.createElement('div'); globo.className = 'osito-globo'; globo.setAttribute('role', 'status'); document.body.appendChild(globo);
            globo.addEventListener('click', function () { ignorados = 0; ocultarGlobo(); if (typeof window.toggleIAPanel === 'function' && !panelAbierto()) window.toggleIAPanel(); });
        }
        globo.textContent = texto.length > 180 ? texto.slice(0, 177) + '…' : texto;
        var r = b.getBoundingClientRect();
        globo.style.top = Math.max(8, Math.min(window.innerHeight - 90, r.bottom + 8)) + 'px';
        globo.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
        globo.style.left = 'auto';
        requestAnimationFrame(function () { globo.classList.add('on'); });
        clearTimeout(globoTimer); globoTimer = setTimeout(ocultarGlobo, Math.min(12000, 4500 + texto.length * 45));
    }
    function ocultarGlobo() { if (globo) globo.classList.remove('on'); }

    /* ============================ 9) EVENTOS DE SUEÑO ====================== */
    function alEventoSueno(ev) {
        if (enLlamada()) return;
        if (ev === 'despierta-por-persona') {
            extenderEscena(5000); ejecutarAcc([['mov', 'susto']]);
            setTimeout(function () { if (!dormida()) decirComoMascota(lineaLocal('despierta')); }, 1500);
            setTimeout(function () { if (window.OsitoIA && hayPresupuesto() && Math.random() < 0.0) {} }, 0);
        } else if (ev === 'despierta-sola') {
            extenderEscena(4000);
            setTimeout(function () { if (!dormida() && puedeHablarVideo()) decirComoMascota(lineaLocal('sola')); }, 2600);
        } else if (ev === 'dormida') {
            ocultarGlobo(); var A = window.OsitoAburrimiento; if (A && A.soltar) A.soltar();
        }
    }

    /* ============================== 10) BUCLE ============================== */
    var ultimoTick = ahora(), presenteDesde = ahora();
    setInterval(function () {
        var t = ahora();
        if (t - ultimoTick > 120000) { // volvió después de mucho (pestaña dormida)
            ultimoTick = t;
            if (!document.hidden && puedeHablar() && Math.random() < 0.7) { programarHabla(false); hablarEspontaneo('regreso', 'La persona acaba de volver a la página después de un rato. Salúdala corto y natural.'); return; }
        }
        ultimoTick = t;
        try { sondearVideo(); } catch (e) {}
        if (t < proximoHabla || !puedeHablar()) { if (t >= proximoHabla) proximoHabla = t + 15000; return; }
        if (t - ultimoInput > 6 * 60000) { proximoHabla = t + 60000; return; }  // nadie presente: no habla sola
        var N = night(), tarde = N && N.nivelSueno && N.nivelSueno() > 0.4;
        hablarEspontaneo(tarde ? 'tarde' : 'idle', 'No pasa nada especial: nadie ha dicho nada en un rato. Si tiene sentido, inicia una charla breve y natural, comenta algo (tu estado, la hora, el sitio, un dato) o haz un gesto u objeto sin hablar. Si prefieres no interrumpir, responde solo [[silencio]].');
    }, 2000);

    /* ============================== AUTOPRUEBA ============================= */
    function autoprueba() {
        var A = window.OsitoAburrimiento, S = window.OsitoFaceSound, malos = [];
        if (A && A.catalogo) {
            var cat = A.catalogo();
            Object.keys(V.OBJETOS).forEach(function (o) { if (!cat[o]) malos.push('objeto:' + o); });
            Object.keys(V.ACTOS).forEach(function (o) { Object.keys(V.ACTOS[o]).forEach(function (verbo) { var real = V.ACTOS[o][verbo]; if (cat[o] && cat[o].indexOf(real) < 0 && ['p-sweat', 'p-tongue', 'p-peek', 'p-smirk'].indexOf(real) < 0) malos.push('acto:' + o + '.' + verbo); }); });
        }
        if (S && S.nombres) { var n = S.nombres(); V.SONIDOS.forEach(function (s) { if (n.indexOf(s) < 0) malos.push('sonido:' + s); }); }
        Object.keys(V.MOVIMIENTOS).forEach(function (m) { var x = V.MOVIMIENTOS[m]; if (x.anim && !PRESETS[x.anim]) malos.push('mov:' + m); });
        if (malos.length) { try { console.warn('[OsitoMente] vocabulario sin implementar:', malos.join(', ')); } catch (e) {} }
        return malos;
    }
    setTimeout(autoprueba, 1500);

    /* ================================ API ================================== */
    window.OsitoMente = {
        version: 99,
        activo: function () { return true; },
        enEscena: enEscena,
        miradaOcupada: function () { return ahora() < miradaHasta; },
        humorFijo: function () { return ahora() < humorHasta; },
        procesar: procesar, parsear: parsear, limpiar: soloLimpiar,
        ejecutar: function (texto) { var r = parsear(texto); ejecutarCues(r.cues, 0); return r; },
        accion: function (clave, valor) { ejecutarAcc([[clave, valor]]); },
        animar: function (spec) { return animar(spec); }, aprendidas: function () { return JSON.parse(JSON.stringify(aprendidas)); },
        decir: decirComoMascota, hablarEspontaneo: hablarEspontaneo,
        estado: estado, silenciar: silenciar, alAburrirse: alAburrirse, alCambiarActividad: alCambiarActividad,
        alEventoSueno: alEventoSueno, autoprueba: autoprueba, puedeHablar: puedeHablar,
        _debug: function () { return { proximoHabla: proximoHabla, silenciadoHasta: silenciadoHasta, ignorados: ignorados, video: video, planes: planes.length, presupuesto: presupuesto() }; }
    };
}());
